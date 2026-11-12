"""Tests for checkpoint sampling along polyline routes."""

import pytest

from planner.services.geometry import haversine_distance_miles
from planner.services.sampling import sample_checkpoints


def test_sampling_empty_raises():
    with pytest.raises(ValueError):
        sample_checkpoints([])


def test_sampling_single_point():
    samples = sample_checkpoints([(35.0, -95.0)], interval_miles=25.0)
    assert len(samples) == 1
    assert samples[0].mile == 0.0
    assert samples[0].lat == 35.0


def test_sampling_mile_zero_and_destination_always_included():
    # Straight north line from (30.0, -90.0) to (32.0, -90.0) ~ 138 miles
    p1 = (30.0, -90.0)
    p2 = (32.0, -90.0)
    total_len = haversine_distance_miles(p1, p2)

    samples = sample_checkpoints([p1, p2], interval_miles=25.0)

    # First checkpoint must be mile 0
    assert samples[0].mile == 0.0
    assert samples[0].lat == p1[0]
    assert samples[0].lon == p1[1]

    # Last checkpoint must be destination
    assert samples[-1].lat == p2[0]
    assert samples[-1].lon == p2[1]
    assert abs(samples[-1].mile - total_len) < 0.1
    assert samples[-1].route_progress == 1.0


@pytest.mark.parametrize("interval", [10.0, 25.0, 50.0])
def test_sampling_intervals_are_consistent(interval):
    # Route of approx 100 miles
    p1 = (30.0, -90.0)
    p2 = (31.45, -90.0)  # ~100.2 miles
    samples = sample_checkpoints([p1, p2], interval_miles=interval)

    # Miles should increase monotonically
    miles = [s.mile for s in samples]
    assert miles == sorted(miles)

    # Intermediate intervals should be exactly spaced
    for i in range(1, len(samples) - 1):
        expected_mile = i * interval
        assert abs(samples[i].mile - expected_mile) < 0.05


def test_sampling_complex_multisegment_route():
    coords = [
        (32.7767, -96.7970),  # Dallas
        (33.9137, -98.4934),  # Wichita Falls
        (35.2220, -101.8313),  # Amarillo
        (36.5378, -103.6672),  # Clayton
        (39.7392, -104.9903),  # Denver
    ]
    samples = sample_checkpoints(coords, interval_miles=50.0)

    assert samples[0].mile == 0.0
    assert samples[-1].route_progress == 1.0
    assert len(samples) >= 10  # ~780 miles / 50 ~= 16 checkpoints
    # Check monotonic progress
    for i in range(len(samples) - 1):
        assert samples[i].mile < samples[i + 1].mile
