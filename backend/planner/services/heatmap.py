"""Corridor grid generation and 48-hour weather risk heatmap computation."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from .geometry import (
    Coordinate,
    haversine_distance_miles,
    perpendicular_offset,
)
from .risk import assess_checkpoint
from .weather.open_meteo import OpenMeteoWeatherProvider

MAX_GRID_POINTS = 100
GRID_SAMPLING_INTERVAL_MILES = 30.0
OFFSET_DISTANCE_MILES = 15.0


def generate_corridor_grid(
    route_geometries: Sequence[Sequence[Coordinate]],
    max_points: int = MAX_GRID_POINTS,
    interval_miles: float = GRID_SAMPLING_INTERVAL_MILES,
    offset_miles: float = OFFSET_DISTANCE_MILES,
) -> list[Coordinate]:
    """Generate a deduplicated corridor grid along all route options with perpendicular offsets.

    Args:
        route_geometries: List of polylines, where each polyline is a sequence of (lat, lon).
        max_points: Hard cap on total returned grid points (default: 250).
        interval_miles: Distance between sampled center points along each route.
        offset_miles: Perpendicular corridor offset distance (left and right).

    Returns:
        List of deduplicated (lat, lon) coordinates capped at max_points.
    """
    seen: set[tuple[float, float]] = set()
    grid_points: list[Coordinate] = []

    def _add_point(pt: Coordinate) -> None:
        key = (round(pt[0], 2), round(pt[1], 2))
        if key not in seen:
            seen.add(key)
            grid_points.append(pt)

    for polyline in route_geometries:
        if len(polyline) < 2:
            for pt in polyline:
                _add_point(pt)
            continue

        _add_point(polyline[0])

        accumulated_dist = 0.0

        for i in range(len(polyline) - 1):
            p1 = polyline[i]
            p2 = polyline[i + 1]
            seg_dist = haversine_distance_miles(p1, p2)

            if accumulated_dist + seg_dist >= interval_miles:
                # Fraction along segment
                needed = interval_miles - accumulated_dist
                fraction = max(0.0, min(1.0, needed / max(seg_dist, 1e-6)))
                # Calculate perpendicular offsets at this fraction
                try:
                    left_pt, right_pt = perpendicular_offset(
                        p1, p2, fraction=fraction, distance_miles=offset_miles
                    )
                    mid_pt = (
                        p1[0] + (p2[0] - p1[0]) * fraction,
                        p1[1] + (p2[1] - p1[1]) * fraction,
                    )
                    _add_point(mid_pt)
                    _add_point(left_pt)
                    _add_point(right_pt)
                except Exception:
                    _add_point(p1)

                accumulated_dist = 0.0
            else:
                accumulated_dist += seg_dist

        _add_point(polyline[-1])

    # If exceeding max_points, downsample evenly
    if len(grid_points) > max_points:
        step = len(grid_points) / max_points
        subsampled = [grid_points[int(i * step)] for i in range(max_points)]
        return subsampled

    return grid_points


def compute_corridor_heatmap(
    *,
    plan_id: str,
    depart_at: datetime,
    load_lb: float,
    route_geometries: Sequence[Sequence[Coordinate]],
    weather_provider: OpenMeteoWeatherProvider | None = None,
    max_points: int = MAX_GRID_POINTS,
) -> dict[str, Any]:
    """Compute 49 hourly risk classifications for each point on the corridor grid.

    Returns:
        {
            "plan_id": str,
            "start_time": ISO-8601 string,
            "hours": 49,
            "points": [[lat, lon], ...],
            "risk": [[r_0, r_1, ..., r_48], ...]
        }
    """
    if weather_provider is None:
        weather_provider = OpenMeteoWeatherProvider()

    # Ensure depart_at has UTC timezone
    if depart_at.tzinfo is None:
        depart_utc = depart_at.replace(tzinfo=UTC)
    else:
        depart_utc = depart_at.astimezone(UTC)

    # 1. Build grid
    grid_points = generate_corridor_grid(route_geometries, max_points=max_points)
    if not grid_points:
        return {
            "plan_id": plan_id,
            "start_time": depart_utc.isoformat(),
            "hours": 49,
            "points": [],
            "risk": [],
        }

    # 2. Fetch batched hourly series for all grid points
    series_by_coord = weather_provider.get_hourly_series_batch(grid_points)

    # 3. Classify 49 hours for each grid point
    risk_matrix: list[list[int]] = []

    for pt in grid_points:
        rounded_pt = (round(pt[0], 2), round(pt[1], 2))
        series = series_by_coord.get(rounded_pt, {})
        point_risks: list[int] = []

        for h in range(49):
            target_time = depart_utc + timedelta(hours=h)
            weather = weather_provider.interpolate_at_time(series, target_time)
            risk_res = assess_checkpoint(
                wind_mph=weather.wind_mph,
                rain_in_hr=weather.rain_in_hr,
                snow_in_hr=weather.snow_in_hr,
                load_lb=load_lb,
            )
            point_risks.append(int(risk_res.level))

        risk_matrix.append(point_risks)

    return {
        "plan_id": plan_id,
        "start_time": depart_utc.isoformat(),
        "hours": 49,
        "points": [[round(p[0], 4), round(p[1], 4)] for p in grid_points],
        "risk": risk_matrix,
    }
