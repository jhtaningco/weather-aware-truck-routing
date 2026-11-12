"""Tests for geometry calculations: haversine, perpendicular offset, and simplification."""

from planner.services.geometry import (
    haversine_distance_m,
    haversine_distance_miles,
    perpendicular_offset,
    polyline_length_miles,
    simplify_geometry,
)


def test_haversine_distance_same_point_is_zero():
    p = (40.7128, -74.0060)
    assert haversine_distance_m(p, p) == 0.0
    assert haversine_distance_miles(p, p) == 0.0


def test_haversine_known_distance():
    # NYC (40.7128, -74.0060) to LA (34.0522, -118.2437) is approx 2,445 - 2,455 miles
    nyc = (40.7128, -74.0060)
    la = (34.0522, -118.2437)
    dist = haversine_distance_miles(nyc, la)
    assert 2440 < dist < 2460


def test_polyline_length():
    # A path with 3 points
    p1 = (32.7767, -96.7970)  # Dallas
    p2 = (35.2220, -101.8313)  # Amarillo
    p3 = (39.7392, -104.9903)  # Denver

    total = polyline_length_miles([p1, p2, p3])
    seg1 = haversine_distance_miles(p1, p2)
    seg2 = haversine_distance_miles(p2, p3)
    assert abs(total - (seg1 + seg2)) < 1e-6


def test_perpendicular_offset():
    p1 = (30.0, -90.0)
    p2 = (30.0, -80.0)  # due east
    left, right = perpendicular_offset(p1, p2, fraction=0.5, distance_miles=50.0)

    # Midpoint is at (30.0, -85.0)
    # Heading is East (approx 90 deg)
    # Left is North (lat > 30.0), Right is South (lat < 30.0)
    assert left[0] > 30.0
    assert right[0] < 30.0

    # Distance from midpoint to left offset should be approx 50 miles
    midpoint = (30.0, -85.0)
    assert abs(haversine_distance_miles(midpoint, left) - 50.0) < 1.0
    assert abs(haversine_distance_miles(midpoint, right) - 50.0) < 1.0


def test_simplify_preserves_endpoints():
    coords = [(0.0, 0.0), (0.00001, 0.0), (0.00002, 0.0), (1.0, 1.0)]
    simplified = simplify_geometry(coords, tolerance_deg=0.001)
    assert simplified[0] == (0.0, 0.0)
    assert simplified[-1] == (1.0, 1.0)
    assert len(simplified) < len(coords)


def test_simplify_empty_or_small():
    assert simplify_geometry([]) == []
    assert simplify_geometry([(1.0, 1.0)]) == [(1.0, 1.0)]
    assert simplify_geometry([(1.0, 1.0), (2.0, 2.0)]) == [(1.0, 1.0), (2.0, 2.0)]
