"""Tests for corridor grid generation and 48-hour heatmap computation."""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from planner.models import Plan
from planner.services.geometry import Coordinate
from planner.services.heatmap import (
    compute_corridor_heatmap,
    generate_corridor_grid,
)
from planner.services.weather.base import CheckpointWeather

pytestmark = pytest.mark.django_db


class MockWeatherProvider:
    """Mock weather provider returning deterministic hourly weather series."""

    def __init__(self, sustained_wind: float = 20.0, rain: float = 0.05):
        self.sustained_wind = sustained_wind
        self.rain = rain

    def get_hourly_series_batch(self, coords: list[Coordinate]) -> dict[tuple[float, float], dict]:
        series = {}
        for c in coords:
            c_round = (round(c[0], 2), round(c[1], 2))
            series[c_round] = {
                "times": [
                    datetime(2026, 11, 12, 0, 0, tzinfo=UTC) + timedelta(hours=h)
                    for h in range(72)
                ],
                "wind": [self.sustained_wind] * 72,
                "gusts": [self.sustained_wind + 10.0] * 72,
                "rain": [self.rain] * 72,
                "showers": [0.0] * 72,
                "snow": [0.0] * 72,
            }
        return series

    def interpolate_at_time(self, series: dict, dt: datetime) -> CheckpointWeather:
        return CheckpointWeather(
            wind_mph=self.sustained_wind,
            gust_mph=self.sustained_wind + 10.0,
            rain_in_hr=self.rain,
            snow_in_hr=0.0,
        )


def test_generate_corridor_grid_basic():
    # Simple corridor between Dallas and Oklahoma City (~200 miles)
    route = [
        (32.7767, -96.7970),
        (33.2148, -97.1331),
        (34.1743, -97.1436),
        (35.4676, -97.5164),
    ]

    grid = generate_corridor_grid([route], max_points=250, interval_miles=25.0)

    assert len(grid) > 0
    assert len(grid) <= 250
    # Center points plus perpendicular offsets should generate multiple points
    assert len(grid) >= 4


def test_generate_corridor_grid_caps_at_max_points():
    # Create a long route with many segments
    long_route = [(30.0 + i * 0.1, -95.0 - i * 0.1) for i in range(200)]

    grid = generate_corridor_grid([long_route], max_points=50, interval_miles=5.0)

    assert len(grid) == 50


def test_compute_corridor_heatmap_structure():
    route = [
        (32.7767, -96.7970),
        (34.1743, -97.1436),
        (35.4676, -97.5164),
    ]
    depart_at = datetime(2026, 11, 12, 14, 0, tzinfo=UTC)
    mock_provider = MockWeatherProvider(sustained_wind=28.0, rain=0.0)  # Moderate wind

    heatmap = compute_corridor_heatmap(
        plan_id="test-plan-1",
        depart_at=depart_at,
        load_lb=35000.0,
        route_geometries=[route],
        weather_provider=mock_provider,
        max_points=20,
    )

    assert heatmap["plan_id"] == "test-plan-1"
    assert heatmap["hours"] == 49
    assert len(heatmap["points"]) > 0
    assert len(heatmap["risk"]) == len(heatmap["points"])
    # Each row in risk matrix has 49 entries
    for row in heatmap["risk"]:
        assert len(row) == 49
        # Wind 28 mph is Moderate (1)
        assert all(val == 1 for val in row)


def test_compute_corridor_heatmap_with_load_escalation():
    route = [(32.7767, -96.7970), (33.5, -97.0)]
    depart_at = datetime(2026, 11, 12, 14, 0, tzinfo=UTC)
    # Wind 48 mph + load 35,000 lb escalates to No Travel (4)
    mock_provider = MockWeatherProvider(sustained_wind=48.0, rain=0.0)

    heatmap = compute_corridor_heatmap(
        plan_id="test-plan-escalated",
        depart_at=depart_at,
        load_lb=35000.0,
        route_geometries=[route],
        weather_provider=mock_provider,
        max_points=10,
    )

    for row in heatmap["risk"]:
        assert all(val == 4 for val in row)


def test_get_heatmap_api_not_found():
    client = APIClient()
    response = client.get(f"/api/plans/{uuid.uuid4()}/heatmap")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_get_heatmap_api_success():
    client = APIClient()
    # Create sample plan
    plan_id = uuid.uuid4()
    plan_payload = {
        "id": str(plan_id),
        "inputs": {
            "origin": {"label": "Dallas, TX", "lat": 32.7767, "lon": -96.7970},
            "destination": {"label": "Austin, TX", "lat": 30.2672, "lon": -97.7431},
            "depart_at": "2026-11-12T14:00:00+00:00",
            "load_lb": 32000,
            "interval_mi": 25,
        },
        "routes": [
            {
                "id": "route-0",
                "label": "Interstate 35 S",
                "distance_mi": 195.0,
                "duration_s": 10800,
                "arrival_eta": "2026-11-12T17:00:00+00:00",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-96.7970, 32.7767], [-97.7431, 30.2672]],
                },
            }
        ],
    }

    Plan.objects.create(id=plan_id, payload=plan_payload)

    with patch(
        "planner.views.compute_corridor_heatmap",
        return_value={
            "plan_id": str(plan_id),
            "start_time": "2026-11-12T14:00:00+00:00",
            "hours": 49,
            "points": [[32.7767, -96.7970], [30.2672, -97.7431]],
            "risk": [[0] * 49, [1] * 49],
        },
    ) as mock_compute:
        # First call: computes and returns
        resp = client.get(f"/api/plans/{plan_id}/heatmap")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_id"] == str(plan_id)
        assert data["hours"] == 49
        assert len(data["points"]) == 2
        assert mock_compute.call_count == 1

        # Second call: served from cache/payload without recomputing
        resp2 = client.get(f"/api/plans/{plan_id}/heatmap")
        assert resp2.status_code == 200
        assert mock_compute.call_count == 1
