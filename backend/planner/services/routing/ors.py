"""OpenRouteService routing provider implementing HGV routing."""

import logging
import time
from typing import Any

import requests
from django.conf import settings

from ..eta import StepDuration
from ..geometry import METERS_PER_MILE, Coordinate
from .base import RawRoute, RoutingProvider

logger = logging.getLogger(__name__)

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions"
DEFAULT_PROFILE = "driving-hgv"
MAX_RETRIES = 3
BACKOFF_FACTOR = 1.0


class OpenRouteServiceRoutingProvider(RoutingProvider):
    """RoutingProvider implementation backed by OpenRouteService Directions API."""

    def __init__(self, api_key: str | None = None, profile: str = DEFAULT_PROFILE):
        self.api_key = api_key or getattr(settings, "ORS_API_KEY", "")
        self.profile = profile

    def get_routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        load_lb: float = 0.0,
        preference: str = "recommended",
        via: Coordinate | None = None,
        alternatives: int = 0,
    ) -> list[RawRoute]:
        """Query ORS for driving-hgv routes between origin and destination."""
        if not self.api_key:
            raise ValueError(
                "ORS_API_KEY is not configured. Please set ORS_API_KEY in your environment."
            )

        url = f"{ORS_DIRECTIONS_URL}/{self.profile}/geojson"
        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
        }

        # ORS expects coordinates as [[lon, lat], ...]
        coords: list[list[float]] = [[origin[1], origin[0]]]
        if via is not None:
            coords.append([via[1], via[0]])
        coords.append([destination[1], destination[0]])

        body: dict[str, Any] = {
            "coordinates": coords,
            "preference": preference
            if preference in {"fastest", "shortest", "recommended"}
            else "recommended",
            "units": "m",
        }

        if alternatives > 0:
            body["alternative_routes"] = {
                "target_count": min(alternatives + 1, 3),
                "weight_factor": 1.4,
                "share_factor": 0.6,
            }

        # Pass vehicle weight in metric tons if load is given
        if load_lb > 0:
            # 1 lb = 0.000453592 metric tons
            tons = max(1.0, round(load_lb * 0.00045359237, 2))
            body["options"] = {
                "vehicle_type": "hgv",
                "profile_params": {
                    "weight": tons,
                },
            }

        response_json = self._request_with_retry(url, headers, body)
        return self._parse_features(response_json)

    def _request_with_retry(
        self, url: str, headers: dict[str, str], body: dict[str, Any]
    ) -> dict[str, Any]:
        """Post request with exponential backoff on 429 or 5xx status codes."""
        last_exc: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                resp = requests.post(url, json=body, headers=headers, timeout=15)
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 429:
                    sleep_time = BACKOFF_FACTOR * (2**attempt)
                    logger.warning(
                        "ORS rate limited (429). Retrying in %.1fs (attempt %d/%d)...",
                        sleep_time,
                        attempt + 1,
                        MAX_RETRIES,
                    )
                    time.sleep(sleep_time)
                    continue
                if resp.status_code in {500, 502, 503, 504}:
                    sleep_time = BACKOFF_FACTOR * (2**attempt)
                    logger.warning(
                        "ORS server error (%d). Retrying in %.1fs...", resp.status_code, sleep_time
                    )
                    time.sleep(sleep_time)
                    continue

                # Client error (400, 404, etc.)
                err_msg = resp.text
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("error", {}).get("message", err_msg)
                except Exception:
                    pass
                raise ValueError(f"OpenRouteService error ({resp.status_code}): {err_msg}")

            except (requests.Timeout, requests.ConnectionError) as exc:
                last_exc = exc
                sleep_time = BACKOFF_FACTOR * (2**attempt)
                logger.warning("ORS connection error (%s). Retrying in %.1fs...", exc, sleep_time)
                time.sleep(sleep_time)

        raise RuntimeError(f"OpenRouteService call failed after {MAX_RETRIES} attempts: {last_exc}")

    def _parse_features(self, data: dict[str, Any]) -> list[RawRoute]:
        """Convert ORS GeoJSON response to domain RawRoute instances."""
        features = data.get("features", [])
        if not features:
            return []

        routes: list[RawRoute] = []
        for idx, feat in enumerate(features):
            props = feat.get("properties", {})
            summary = props.get("summary", {})
            dist_m = float(summary.get("distance", 0.0))
            dur_s = float(summary.get("duration", 0.0))

            # GeoJSON coordinates are [lon, lat] or [lon, lat, ele] -> convert to (lat, lon)
            raw_coords = feat.get("geometry", {}).get("coordinates", [])
            geom: list[Coordinate] = [(float(pt[1]), float(pt[0])) for pt in raw_coords]

            # Steps
            steps: list[StepDuration] = []
            for segment in props.get("segments", []):
                for step in segment.get("steps", []):
                    step_m = float(step.get("distance", 0.0))
                    step_s = float(step.get("duration", 0.0))
                    steps.append(
                        StepDuration(
                            distance_miles=step_m / METERS_PER_MILE,
                            duration_seconds=step_s,
                        )
                    )

            label = f"Route {chr(ord('A') + idx)}"
            routes.append(
                RawRoute(
                    route_id=f"route-{idx + 1}",
                    label=label,
                    distance_miles=round(dist_m / METERS_PER_MILE, 2),
                    duration_seconds=round(dur_s, 1),
                    geometry=tuple(geom),
                    steps=tuple(steps),
                )
            )

        return routes
