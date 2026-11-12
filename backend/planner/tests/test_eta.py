"""Tests for ETA interpolation using step-level durations."""

from datetime import UTC, datetime

from planner.services.eta import StepDuration, interpolate_checkpoint_etas


def test_eta_empty_checkpoints():
    t0 = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)
    assert interpolate_checkpoint_etas(t0, [], [], 0.0) == []


def test_eta_at_mile_zero_is_departure_time():
    t0 = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)
    steps = [StepDuration(distance_miles=100.0, duration_seconds=3600.0)]
    etas = interpolate_checkpoint_etas(t0, [0.0, 50.0, 100.0], steps, 3600.0)

    assert etas[0] == t0
    # Final ETA matches departure + total duration
    assert (etas[-1] - t0).total_seconds() == 3600.0


def test_eta_monotonicity():
    t0 = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)
    # Step 1: 50 miles, 60 mph (3000 seconds)
    # Step 2: 50 miles in congested city, 25 mph (7200 seconds)
    steps = [
        StepDuration(distance_miles=50.0, duration_seconds=3000.0),
        StepDuration(distance_miles=50.0, duration_seconds=7200.0),
    ]
    checkpoints = [0.0, 10.0, 25.0, 50.0, 75.0, 100.0]
    etas = interpolate_checkpoint_etas(t0, checkpoints, steps, 10200.0)

    assert len(etas) == len(checkpoints)
    # Monotonically increasing
    for i in range(len(etas) - 1):
        assert etas[i] < etas[i + 1]

    # Destination time is exact
    assert (etas[-1] - t0).total_seconds() == 10200.0


def test_eta_reflects_different_step_speeds_not_average_speed():
    t0 = datetime(2026, 11, 15, 8, 0, tzinfo=UTC)
    # Step 1: 50 miles at 100 mph (1800s)
    # Step 2: 50 miles at 20 mph (9000s)
    # Total: 100 miles, 10800s (avg speed = 33.3 mph)
    steps = [
        StepDuration(distance_miles=50.0, duration_seconds=1800.0),
        StepDuration(distance_miles=50.0, duration_seconds=9000.0),
    ]
    etas = interpolate_checkpoint_etas(t0, [0.0, 50.0, 100.0], steps, 10800.0)

    # At 50 miles, elapsed time should be 1800s, NOT half of average (5400s)
    elapsed_at_midpoint = (etas[1] - t0).total_seconds()
    assert elapsed_at_midpoint == 1800.0
