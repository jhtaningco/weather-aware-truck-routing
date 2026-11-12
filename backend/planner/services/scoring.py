"""Route risk scoring and segment-mile attribution."""

from collections.abc import Sequence
from dataclasses import dataclass

from .risk import CheckpointRisk, RiskLevel


@dataclass(frozen=True)
class CheckpointEvaluation:
    """A checkpoint combined with its risk assessment and assigned segment length."""

    index: int
    lat: float
    lon: float
    mile: float
    eta: str  # ISO-8601 formatted
    segment_miles: float
    weather: dict[str, float]
    risk: CheckpointRisk


@dataclass(frozen=True)
class RouteMetrics:
    """Aggregated risk and distance metrics for an entire route."""

    distance_miles: float
    duration_seconds: float
    miles_by_risk: dict[str, float]
    avg_risk: float
    max_risk: int
    travel_blocked: bool
    checkpoints: list[CheckpointEvaluation]


def calculate_segment_lengths(
    checkpoint_miles: Sequence[float], total_distance: float
) -> list[float]:
    """Calculate segment lengths using midpoint-to-midpoint coverage.

    Guarantees:
    - sum(segment_lengths) == total_distance (exact sum).
    """
    k = len(checkpoint_miles)
    if k == 0:
        return []
    if k == 1:
        return [round(total_distance, 2)]

    lengths: list[float] = []

    # First checkpoint: [0.0, midpoint to next)
    lengths.append((checkpoint_miles[1] - checkpoint_miles[0]) / 2.0)

    # Intermediate checkpoints: [midpoint from previous, midpoint to next)
    for i in range(1, k - 1):
        lengths.append((checkpoint_miles[i + 1] - checkpoint_miles[i - 1]) / 2.0)

    # Destination checkpoint: [midpoint from previous, total_distance]
    lengths.append(total_distance - ((checkpoint_miles[k - 2] + checkpoint_miles[k - 1]) / 2.0))

    # Clean rounding while ensuring exact sum
    rounded = [round(x, 2) for x in lengths]
    diff = round(total_distance - sum(rounded), 2)
    if rounded and abs(diff) > 0:
        # Absorb rounding cent into the longest segment
        max_idx = rounded.index(max(rounded))
        rounded[max_idx] = round(rounded[max_idx] + diff, 2)

    return rounded


def score_route(
    checkpoint_miles: Sequence[float],
    checkpoint_risks: Sequence[CheckpointRisk],
    checkpoint_coords: Sequence[tuple[float, float]],
    checkpoint_etas: Sequence[str],
    checkpoint_weathers: Sequence[dict[str, float]],
    total_distance: float,
    total_duration_seconds: float,
) -> RouteMetrics:
    """Attribute segment miles to risk levels and compute route risk metrics."""
    segment_lengths = calculate_segment_lengths(checkpoint_miles, total_distance)

    miles_by_risk = {
        RiskLevel.LOW.key: 0.0,
        RiskLevel.MODERATE.key: 0.0,
        RiskLevel.HIGH.key: 0.0,
        RiskLevel.SEVERE.key: 0.0,
        RiskLevel.NO_TRAVEL.key: 0.0,
    }

    weighted_risk_sum = 0.0
    max_risk_ordinal = 0
    evaluations: list[CheckpointEvaluation] = []

    for idx, (mile, risk, length) in enumerate(
        zip(checkpoint_miles, checkpoint_risks, segment_lengths, strict=False)
    ):
        risk_key = risk.level.key
        miles_by_risk[risk_key] = round(miles_by_risk[risk_key] + length, 2)

        weighted_risk_sum += length * int(risk.level)
        max_risk_ordinal = max(max_risk_ordinal, int(risk.level))

        evaluations.append(
            CheckpointEvaluation(
                index=idx,
                lat=checkpoint_coords[idx][0],
                lon=checkpoint_coords[idx][1],
                mile=round(mile, 2),
                eta=checkpoint_etas[idx],
                segment_miles=length,
                weather=dict(checkpoint_weathers[idx]),
                risk=risk,
            )
        )

    avg_risk = round(weighted_risk_sum / total_distance, 3) if total_distance > 0 else 0.0
    travel_blocked = miles_by_risk[RiskLevel.NO_TRAVEL.key] > 0.0

    return RouteMetrics(
        distance_miles=round(total_distance, 2),
        duration_seconds=round(total_duration_seconds, 1),
        miles_by_risk=miles_by_risk,
        avg_risk=avg_risk,
        max_risk=max_risk_ordinal,
        travel_blocked=travel_blocked,
        checkpoints=evaluations,
    )
