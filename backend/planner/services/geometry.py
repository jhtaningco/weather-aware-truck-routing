"""Geodesy and geometric algorithms: haversine, polyline metrics, and simplification."""

import math
from collections.abc import Sequence

METERS_PER_MILE = 1609.344
EARTH_RADIUS_METERS = 6371008.8  # IUGG mean radius of the Earth
EARTH_RADIUS_MILES = EARTH_RADIUS_METERS / METERS_PER_MILE

Coordinate = tuple[float, float]  # (latitude, longitude)


def haversine_distance_m(p1: Coordinate, p2: Coordinate) -> float:
    """Calculate the great-circle distance between two (lat, lon) points in meters."""
    lat1, lon1 = p1
    lat2, lon2 = p2

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clamp for floating-point inaccuracies
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_METERS * c


def haversine_distance_miles(p1: Coordinate, p2: Coordinate) -> float:
    """Calculate the great-circle distance between two (lat, lon) points in miles."""
    return haversine_distance_m(p1, p2) / METERS_PER_MILE


def polyline_length_miles(coords: Sequence[Coordinate]) -> float:
    """Calculate the total length of a polyline in miles."""
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance_miles(coords[i], coords[i + 1])
    return total


def initial_bearing(p1: Coordinate, p2: Coordinate) -> float:
    """Calculate initial compass bearing in radians from p1 to p2."""
    lat1 = math.radians(p1[0])
    lat2 = math.radians(p2[0])
    delta_lon = math.radians(p2[1] - p1[1])

    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    return math.atan2(y, x)


def destination_point(start: Coordinate, bearing_rad: float, distance_miles: float) -> Coordinate:
    """Project a point from start along a bearing for a given distance in miles."""
    delta = distance_miles / EARTH_RADIUS_MILES
    lat1 = math.radians(start[0])
    lon1 = math.radians(start[1])

    lat2 = math.asin(
        math.sin(lat1) * math.cos(delta) + math.cos(lat1) * math.sin(delta) * math.cos(bearing_rad)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing_rad) * math.sin(delta) * math.cos(lat1),
        math.cos(delta) - math.sin(lat1) * math.sin(lat2),
    )
    # Normalize longitude to [-180, 180]
    lon2 = (lon2 + 3 * math.pi) % (2 * math.pi) - math.pi

    return math.degrees(lat2), math.degrees(lon2)


def interpolate_coordinate(p1: Coordinate, p2: Coordinate, fraction: float) -> Coordinate:
    """Linear interpolation between two lat/lon coordinates."""
    f = max(0.0, min(1.0, fraction))
    return (
        p1[0] + (p2[0] - p1[0]) * f,
        p1[1] + (p2[1] - p1[1]) * f,
    )


def perpendicular_offset(
    p1: Coordinate, p2: Coordinate, fraction: float = 0.5, distance_miles: float = 25.0
) -> tuple[Coordinate, Coordinate]:
    """Calculate left and right perpendicular offset coordinates at a fraction along p1->p2.

    Returns:
        (left_offset, right_offset)
    """
    midpoint = interpolate_coordinate(p1, p2, fraction)
    bearing = initial_bearing(p1, p2)

    left_bearing = (bearing - math.pi / 2.0) % (2 * math.pi)
    right_bearing = (bearing + math.pi / 2.0) % (2 * math.pi)

    left_point = destination_point(midpoint, left_bearing, distance_miles)
    right_point = destination_point(midpoint, right_bearing, distance_miles)

    return left_point, right_point


def _point_to_line_distance(pt: Coordinate, line_start: Coordinate, line_end: Coordinate) -> float:
    """Approximate distance in degrees from pt to segment (line_start, line_end)."""
    x0, y0 = pt[1], pt[0]
    x1, y1 = line_start[1], line_start[0]
    x2, y2 = line_end[1], line_end[0]

    dx = x2 - x1
    dy = y2 - y1
    line_len_sq = dx * dx + dy * dy

    if line_len_sq == 0.0:
        return math.hypot(x0 - x1, y0 - y1)

    t = max(0.0, min(1.0, ((x0 - x1) * dx + (y0 - y1) * dy) / line_len_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy

    return math.hypot(x0 - proj_x, y0 - proj_y)


def simplify_geometry(
    coords: Sequence[Coordinate], tolerance_deg: float = 0.0003
) -> list[Coordinate]:
    """Ramer-Douglas-Peucker line simplification for GeoJSON display efficiency.

    0.0003 deg is approximately 30 meters at the equator.
    """
    if len(coords) <= 2:
        return list(coords)

    def _rdp(pts: Sequence[Coordinate]) -> list[Coordinate]:
        if len(pts) <= 2:
            return list(pts)

        first = pts[0]
        last = pts[-1]
        max_dist = 0.0
        index = 0

        for i in range(1, len(pts) - 1):
            d = _point_to_line_distance(pts[i], first, last)
            if d > max_dist:
                max_dist = d
                index = i

        if max_dist > tolerance_deg:
            left = _rdp(pts[: index + 1])
            right = _rdp(pts[index:])
            return left[:-1] + right
        return [first, last]

    return _rdp(coords)
