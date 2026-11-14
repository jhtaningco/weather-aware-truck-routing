"""Layered 3-route generator with geometry-based deduplication."""

import logging
from collections.abc import Sequence

from django.core.cache import cache

from ..geometry import (
    Coordinate,
    haversine_distance_miles,
    perpendicular_offset,
)
from .base import RawRoute, RoutingProvider

logger = logging.getLogger(__name__)

SIMILARITY_DISTANCE_THRESHOLD_MILES = 0.621371  # ~1.0 km
SIMILARITY_OVERLAP_THRESHOLD = 0.90  # 90% point overlap
SAMPLE_POINTS_FOR_DEDUPE = 50


def _sample_points_evenly(geometry: Sequence[Coordinate], num_points: int) -> list[Coordinate]:
    """Sample approximately num_points evenly spaced by index from a geometry."""
    if len(geometry) <= num_points:
        return list(geometry)
    step = (len(geometry) - 1) / (num_points - 1)
    return [geometry[int(round(i * step))] for i in range(num_points)]


def _is_point_close_to_route(
    pt: Coordinate, route_pts: Sequence[Coordinate], threshold_mi: float
) -> bool:
    """Check if pt is within threshold_mi of any point in route_pts."""
    for r_pt in route_pts:
        # Quick bounding box check before haversine
        if abs(pt[0] - r_pt[0]) > 0.02 or abs(pt[1] - r_pt[1]) > 0.02:
            continue
        if haversine_distance_miles(pt, r_pt) <= threshold_mi:
            return True
    return False


def are_routes_duplicates(
    route_a: RawRoute,
    route_b: RawRoute,
    distance_threshold_mi: float = SIMILARITY_DISTANCE_THRESHOLD_MILES,
    overlap_threshold: float = SIMILARITY_OVERLAP_THRESHOLD,
) -> bool:
    """Check if two routes are geometric duplicates (>90% points within ~1km)."""
    # If distances differ by more than 15%, they are likely different routes
    d_a = route_a.distance_miles
    d_b = route_b.distance_miles
    if max(d_a, d_b) > 0 and abs(d_a - d_b) / max(d_a, d_b) > 0.20:
        return False

    sample_b = _sample_points_evenly(route_b.geometry, SAMPLE_POINTS_FOR_DEDUPE)
    if not sample_b:
        return True

    matches = 0
    for pt in sample_b:
        if _is_point_close_to_route(pt, route_a.geometry, distance_threshold_mi):
            matches += 1

    overlap_ratio = matches / len(sample_b)
    return overlap_ratio >= overlap_threshold


class LayeredRouteService:
    """Orchestrates multi-layer route retrieval to reliably produce 3 distinct routes."""

    def __init__(self, provider: RoutingProvider):
        self.provider = provider

    def get_three_distinct_routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        load_lb: float = 0.0,
    ) -> tuple[list[RawRoute], str | None]:
        """Generate up to 3 distinct routes using the 4-layer strategy with 24h caching.

        Returns:
            (routes, note_if_fewer_than_3)
        """
        cache_key = (
            f"routes:{round(origin[0], 3)}:{round(origin[1], 3)}:"
            f"{round(destination[0], 3)}:{round(destination[1], 3)}"
        )
        cached_routes = cache.get(cache_key)
        if cached_routes is not None:
            return cached_routes

        accepted: list[RawRoute] = []

        def _finish(res_routes: list[RawRoute], note_str: str | None) -> tuple[list[RawRoute], str | None]:
            result = (self._finalize(res_routes), note_str)
            cache.set(cache_key, result, timeout=86400)
            return result

        def _try_add(candidate: RawRoute) -> bool:
            if not candidate.geometry or candidate.distance_miles <= 0:
                return False
            for existing in accepted:
                if are_routes_duplicates(existing, candidate):
                    return False
            accepted.append(candidate)
            return True

        # ---- Layer 1: Native alternatives from provider ----
        try:
            native_routes = self.provider.get_routes(
                origin, destination, load_lb=load_lb, alternatives=2
            )
            for r in native_routes:
                _try_add(r)
                if len(accepted) >= 3:
                    return _finish(accepted, None)
        except Exception as exc:
            logger.warning("Layer 1 (native alternatives) failed: %s", exc)

        # ---- Layer 2: Requests with different preferences ----
        for pref in ("fastest", "shortest", "recommended"):
            if len(accepted) >= 3:
                break
            try:
                pref_routes = self.provider.get_routes(
                    origin, destination, load_lb=load_lb, preference=pref
                )
                for r in pref_routes:
                    _try_add(r)
                    if len(accepted) >= 3:
                        return _finish(accepted, None)
            except Exception as exc:
                logger.warning("Layer 2 (pref=%s) failed: %s", pref, exc)

        # ---- Layer 3: Perpendicular detour waypoints at midpoint ----
        if len(accepted) < 3:
            try:
                left_wp, right_wp = perpendicular_offset(
                    origin, destination, fraction=0.5, distance_miles=25.0
                )
                for wp in (left_wp, right_wp):
                    if len(accepted) >= 3:
                        break
                    detour_routes = self.provider.get_routes(
                        origin, destination, load_lb=load_lb, via=wp
                    )
                    for r in detour_routes:
                        _try_add(r)
                        if len(accepted) >= 3:
                            return _finish(accepted, None)
            except Exception as exc:
                logger.warning("Layer 3 (detour waypoints) failed: %s", exc)

        note = None
        if len(accepted) < 3:
            note = f"Found {len(accepted)} distinct route(s) for this corridor."

        return _finish(accepted, note)

    def _finalize(self, routes: list[RawRoute]) -> list[RawRoute]:
        """Relabel routes neatly as Route A, Route B, Route C with consistent IDs."""
        finalized: list[RawRoute] = []
        for i, r in enumerate(routes[:3]):
            finalized.append(
                RawRoute(
                    route_id=f"route-{i + 1}",
                    label=f"Route {chr(ord('A') + i)}",
                    distance_miles=r.distance_miles,
                    duration_seconds=r.duration_seconds,
                    geometry=r.geometry,
                    steps=r.steps,
                )
            )
        return finalized
