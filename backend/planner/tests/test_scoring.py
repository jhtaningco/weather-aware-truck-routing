"""Tests for route scoring, segment-mile attribution, and route metrics."""

import pytest

from planner.services.risk import CheckpointRisk, RiskLevel
from planner.services.scoring import calculate_segment_lengths, score_route

L, M, H, S, N = (
    RiskLevel.LOW,
    RiskLevel.MODERATE,
    RiskLevel.HIGH,
    RiskLevel.SEVERE,
    RiskLevel.NO_TRAVEL,
)


def make_risk(level: RiskLevel, load_escalated: bool = False) -> CheckpointRisk:
    return CheckpointRisk(
        level=level,
        base_level=level,
        wind=level,
        rain=L,
        snow=L,
        load_escalated=load_escalated,
        drivers=() if level == L else ("wind",),
    )


def test_segment_lengths_sum_exactly_to_total_distance():
    # Checkpoints at [0, 25, 50, 75, 93.4]
    miles = [0.0, 25.0, 50.0, 75.0, 93.4]
    total = 93.4
    lengths = calculate_segment_lengths(miles, total)

    assert len(lengths) == len(miles)
    assert abs(sum(lengths) - total) < 1e-4


@pytest.mark.parametrize(
    ("checkpoints", "total", "expected"),
    [
        ([0.0, 100.0], 100.0, [50.0, 50.0]),
        ([0.0, 25.0, 50.0], 50.0, [12.5, 25.0, 12.5]),
        ([0.0, 10.0, 20.0, 30.0], 30.0, [5.0, 10.0, 10.0, 5.0]),
    ],
)
def test_segment_lengths_midpoint_distribution(checkpoints, total, expected):
    lengths = calculate_segment_lengths(checkpoints, total)
    assert lengths == expected
    assert sum(lengths) == total


def test_score_route_metrics_handcrafted():
    # 4 checkpoints along a 30-mile route:
    # cp 0: mile 0,  seg = 5 mi,   Low (0)
    # cp 1: mile 10, seg = 10 mi,  Moderate (1)
    # cp 2: mile 20, seg = 10 mi,  High (2)
    # cp 3: mile 30, seg = 5 mi,   Severe (3)
    miles = [0.0, 10.0, 20.0, 30.0]
    risks = [make_risk(L), make_risk(M), make_risk(H), make_risk(S)]
    coords = [(30.0, -90.0), (30.1, -90.0), (30.2, -90.0), (30.3, -90.0)]
    etas = ["2026-11-20T10:00:00Z"] * 4
    weathers = [{"wind_mph": 10.0, "gust_mph": 15.0, "rain_in_hr": 0.0, "snow_in_hr": 0.0}] * 4

    metrics = score_route(
        checkpoint_miles=miles,
        checkpoint_risks=risks,
        checkpoint_coords=coords,
        checkpoint_etas=etas,
        checkpoint_weathers=weathers,
        total_distance=30.0,
        total_duration_seconds=1800.0,
    )

    # Segment miles attribution
    assert metrics.miles_by_risk["low"] == 5.0
    assert metrics.miles_by_risk["moderate"] == 10.0
    assert metrics.miles_by_risk["high"] == 10.0
    assert metrics.miles_by_risk["severe"] == 5.0
    assert metrics.miles_by_risk["no_travel"] == 0.0
    assert sum(metrics.miles_by_risk.values()) == 30.0

    # Weighted average: (5*0 + 10*1 + 10*2 + 5*3) / 30 = (0 + 10 + 20 + 15) / 30 = 45 / 30 = 1.5
    assert metrics.avg_risk == 1.5
    assert metrics.max_risk == 3
    assert metrics.travel_blocked is False


def test_score_route_with_no_travel():
    miles = [0.0, 20.0]
    risks = [make_risk(L), make_risk(N)]
    coords = [(30.0, -90.0), (30.2, -90.0)]
    etas = ["2026-11-20T10:00:00Z"] * 2
    weathers = [{"wind_mph": 60.0, "gust_mph": 70.0, "rain_in_hr": 0.0, "snow_in_hr": 0.0}] * 2

    metrics = score_route(
        checkpoint_miles=miles,
        checkpoint_risks=risks,
        checkpoint_coords=coords,
        checkpoint_etas=etas,
        checkpoint_weathers=weathers,
        total_distance=20.0,
        total_duration_seconds=1200.0,
    )

    assert metrics.miles_by_risk["no_travel"] == 10.0
    assert metrics.travel_blocked is True
    assert metrics.max_risk == 4
