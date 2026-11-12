"""Cumulative duration calculation and checkpoint ETA interpolation."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

METERS_PER_MILE = 1609.344


@dataclass(frozen=True)
class StepDuration:
    """A step or segment of a route with distance and duration."""

    distance_miles: float
    duration_seconds: float


def interpolate_checkpoint_etas(
    departure_time: datetime,
    checkpoint_miles: Sequence[float],
    steps: Sequence[StepDuration],
    total_duration_seconds: float,
) -> list[datetime]:
    """Compute ETA at each checkpoint by interpolating cumulative driving time across route steps.

    Guarantees:
    - Departure time at mile 0 (ETA == departure_time).
    - Monotonically non-decreasing ETAs.
    - Destination checkpoint ETA exactly equals departure_time + total_duration_seconds.
    - Uses step-level driving speeds rather than a single trip-average speed.

    Args:
        departure_time: ISO-8601 aware datetime of departure.
        checkpoint_miles: Sequence of cumulative distances for checkpoints (e.g. [0, 10, 20...]).
        steps: Sequence of step distances (in miles) and durations (in seconds).
        total_duration_seconds: The provider's total travel time for the route.

    Returns:
        List of datetime objects representing arrival ETA at each checkpoint.
    """
    if not checkpoint_miles:
        return []

    # If steps are missing or zero-length, fall back to proportional distribution
    total_step_distance = sum(s.distance_miles for s in steps)
    destination_mile = checkpoint_miles[-1]

    if not steps or total_step_distance <= 0 or destination_mile <= 0:
        return [
            departure_time
            + timedelta(
                seconds=(m / destination_mile * total_duration_seconds)
                if destination_mile > 0
                else 0.0
            )
            for m in checkpoint_miles
        ]

    # Precalculate step cumulative distance and time bounds
    step_ranges: list[tuple[float, float, float, float]] = []
    # (start_mile, end_mile, start_time_s, step_duration_s)
    cum_mile = 0.0
    cum_time = 0.0

    for s in steps:
        step_ranges.append((cum_mile, cum_mile + s.distance_miles, cum_time, s.duration_seconds))
        cum_mile += s.distance_miles
        cum_time += s.duration_seconds

    # Scale step distances slightly if total_step_distance differs slightly from checkpoint distance
    scale_factor = destination_mile / total_step_distance if total_step_distance > 0 else 1.0

    etas: list[datetime] = []
    step_idx = 0

    for mile in checkpoint_miles:
        if mile <= 0.0:
            etas.append(departure_time)
            continue
        if mile >= destination_mile:
            etas.append(departure_time + timedelta(seconds=total_duration_seconds))
            continue

        # Adjust target mile to step distance space
        target_step_mile = mile / scale_factor

        # Advance step pointer
        while step_idx < len(step_ranges) - 1 and step_ranges[step_idx][1] < target_step_mile:
            step_idx += 1

        start_m, end_m, start_t, dur_t = step_ranges[step_idx]
        span = end_m - start_m
        if span > 0:
            frac = max(0.0, min(1.0, (target_step_mile - start_m) / span))
        else:
            frac = 0.0

        cum_sec = start_t + frac * dur_t

        # Cap within [0, total_duration_seconds] and ensure non-decreasing
        cum_sec = max(0.0, min(total_duration_seconds, cum_sec))
        if etas:
            prev_sec = (etas[-1] - departure_time).total_seconds()
            cum_sec = max(prev_sec, cum_sec)

        etas.append(departure_time + timedelta(seconds=cum_sec))

    return etas
