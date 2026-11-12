"""Checkpoint sampling along polyline geometry at user-selected intervals."""

from collections.abc import Sequence
from dataclasses import dataclass

from .geometry import Coordinate, haversine_distance_miles, interpolate_coordinate

# Avoid placing a redundant checkpoint right next to destination
MIN_DESTINATION_GAP_MILES = 0.5


@dataclass(frozen=True)
class CheckpointSample:
    """A sampled location along a route."""

    index: int
    lat: float
    lon: float
    mile: float
    # Progress fraction along the entire route distance [0.0, 1.0]
    route_progress: float


def sample_checkpoints(
    geometry: Sequence[Coordinate],
    interval_miles: float = 25.0,
) -> list[CheckpointSample]:
    """Sample checkpoints along a polyline at mile 0, every interval_miles, and destination.

    Args:
        geometry: Sequence of (lat, lon) coordinates representing the route path.
        interval_miles: Checkpoint spacing in miles (e.g. 10, 25, 50).

    Returns:
        List of CheckpointSample instances strictly ordered by cumulative distance.
    """
    if not geometry:
        raise ValueError("Geometry must contain at least one coordinate")

    if len(geometry) == 1:
        return [
            CheckpointSample(
                index=0,
                lat=geometry[0][0],
                lon=geometry[0][1],
                mile=0.0,
                route_progress=1.0,
            )
        ]

    # 1. Precalculate segment lengths and cumulative distances
    segment_lengths: list[float] = []
    total_distance = 0.0
    for i in range(len(geometry) - 1):
        dist = haversine_distance_miles(geometry[i], geometry[i + 1])
        segment_lengths.append(dist)
        total_distance += dist

    if total_distance == 0.0:
        return [
            CheckpointSample(
                index=0,
                lat=geometry[0][0],
                lon=geometry[0][1],
                mile=0.0,
                route_progress=0.0,
            ),
            CheckpointSample(
                index=1,
                lat=geometry[-1][0],
                lon=geometry[-1][1],
                mile=0.0,
                route_progress=1.0,
            ),
        ]

    # 2. Determine target milestone distances
    target_miles: list[float] = [0.0]
    current = interval_miles
    while current < total_distance:
        target_miles.append(current)
        current += interval_miles

    # 3. Walk the geometry to interpolate positions at each target mile
    samples: list[CheckpointSample] = []
    seg_idx = 0
    seg_start_mile = 0.0

    for target_m in target_miles:
        # Advance segment pointer until target_m falls within [seg_start_mile, seg_end_mile]
        while (
            seg_idx < len(segment_lengths) - 1
            and seg_start_mile + segment_lengths[seg_idx] < target_m
        ):
            seg_start_mile += segment_lengths[seg_idx]
            seg_idx += 1

        seg_len = segment_lengths[seg_idx]
        if seg_len > 0:
            fraction = (target_m - seg_start_mile) / seg_len
        else:
            fraction = 0.0

        fraction = max(0.0, min(1.0, fraction))
        lat, lon = interpolate_coordinate(geometry[seg_idx], geometry[seg_idx + 1], fraction)

        samples.append(
            CheckpointSample(
                index=len(samples),
                lat=round(lat, 6),
                lon=round(lon, 6),
                mile=round(target_m, 2),
                route_progress=round(target_m / total_distance, 4),
            )
        )

    # 4. Ensure destination is always present
    last_sampled_mile = samples[-1].mile if samples else 0.0
    if total_distance - last_sampled_mile >= MIN_DESTINATION_GAP_MILES:
        samples.append(
            CheckpointSample(
                index=len(samples),
                lat=round(geometry[-1][0], 6),
                lon=round(geometry[-1][1], 6),
                mile=round(total_distance, 2),
                route_progress=1.0,
            )
        )
    else:
        # Snap the last checkpoint to the destination point and total distance
        samples[-1] = CheckpointSample(
            index=samples[-1].index,
            lat=round(geometry[-1][0], 6),
            lon=round(geometry[-1][1], 6),
            mile=round(total_distance, 2),
            route_progress=1.0,
        )

    return samples
