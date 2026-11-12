"""End-to-end integration tests for the /api/plans endpoint."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from planner.services.routing.base import RawRoute, RoutingProvider
from planner.services.weather.base import CheckpointWeather, WeatherProvider

pytestmark = pytest.mark.django_db


class StubRoutingProvider(RoutingProvider):
    """Deterministic routing provider returning 2 distinct routes."""

    def get_routes(
        self, origin, destination, load_lb=0.0, preference="recommended", via=None, alternatives=0
    ):
        # Route A: direct path
        coords_a = [
            (origin[0], origin[1]),
            ((origin[0] + destination[0]) / 2.0, (origin[1] + destination[1]) / 2.0),
            (destination[0], destination[1]),
        ]
        # Route B: curved detour path
        coords_b = [
            (origin[0], origin[1]),
            ((origin[0] + destination[0]) / 2.0 + 2.0, (origin[1] + destination[1]) / 2.0 - 2.0),
            (destination[0], destination[1]),
        ]

        r1 = RawRoute("route-1", "Route A", 100.0, 5400.0, tuple(coords_a), ())
        r2 = RawRoute("route-2", "Route B", 120.0, 6600.0, tuple(coords_b), ())
        return [r1, r2]


class StubWeatherProvider(WeatherProvider):
    """Deterministic weather provider returning configured wind and precipitation."""

    def __init__(self, wind_mph: float = 20.0, rain_in_hr: float = 0.0):
        self.wind_mph = wind_mph
        self.rain_in_hr = rain_in_hr

    def get_weather_at_etas(self, points_with_etas):
        return [
            CheckpointWeather(
                wind_mph=self.wind_mph,
                gust_mph=self.wind_mph + 5.0,
                rain_in_hr=self.rain_in_hr,
                snow_in_hr=0.0,
            )
            for _ in points_with_etas
        ]


@pytest.fixture
def api_client():
    return APIClient()


def test_create_plan_success_and_contract(api_client):
    depart_time = (datetime.now(UTC) + timedelta(hours=3)).isoformat()
    payload = {
        "origin": {"label": "Dallas, TX", "lat": 32.7767, "lon": -96.7970},
        "destination": {"label": "Denver, CO", "lat": 39.7392, "lon": -104.9903},
        "depart_at": depart_time,
        "load_lb": 25000,
        "interval_mi": 25,
    }

    with (
        patch(
            "planner.services.planner_service.OpenRouteServiceRoutingProvider",
            return_value=StubRoutingProvider(),
        ),
        patch(
            "planner.services.planner_service.OpenMeteoWeatherProvider",
            return_value=StubWeatherProvider(wind_mph=20.0),
        ),
    ):
        response = api_client.post("/api/plans", payload, format="json")

    assert response.status_code == 201
    data = response.json()

    # Verify API contract
    assert "id" in data
    assert data["inputs"]["load_lb"] == 25000
    assert "recommended_route_id" in data
    assert "recommendation" in data
    assert "explanation" in data["recommendation"]
    assert len(data["routes"]) == 2

    route = data["routes"][0]
    assert "id" in route
    assert "label" in route
    assert "distance_mi" in route
    assert "duration_s" in route
    assert "arrival_eta" in route
    assert route["geometry"]["type"] == "LineString"
    assert "summary" in route
    assert "miles_by_risk" in route["summary"]
    assert "rank" in route["summary"]
    assert "checkpoints" in route
    assert len(route["checkpoints"]) >= 2

    # Checkpoint schema
    cp0 = route["checkpoints"][0]
    assert cp0["index"] == 0
    assert "weather" in cp0
    assert "risk" in cp0
    assert "drivers" in cp0["risk"]


def test_load_weight_escalates_risk_under_high_wind(api_client):
    """50 mph sustained wind is Severe under 25,000 lb, but No Travel under 35,000 lb."""
    depart_time = (datetime.now(UTC) + timedelta(hours=3)).isoformat()

    base_payload = {
        "origin": {"label": "Dallas, TX", "lat": 32.7767, "lon": -96.7970},
        "destination": {"label": "Denver, CO", "lat": 39.7392, "lon": -104.9903},
        "depart_at": depart_time,
        "interval_mi": 50,
    }

    # 1. 25,000 lb load: wind in [45, 55) is Severe, NOT No Travel
    with (
        patch(
            "planner.services.planner_service.OpenRouteServiceRoutingProvider",
            return_value=StubRoutingProvider(),
        ),
        patch(
            "planner.services.planner_service.OpenMeteoWeatherProvider",
            return_value=StubWeatherProvider(wind_mph=50.0),
        ),
    ):
        resp_light = api_client.post(
            "/api/plans", {**base_payload, "load_lb": 25000}, format="json"
        )

    assert resp_light.status_code == 201
    data_light = resp_light.json()
    assert data_light["routes"][0]["summary"]["travel_blocked"] is False
    assert data_light["routes"][0]["summary"]["miles_by_risk"]["no_travel"] == 0.0
    assert data_light["routes"][0]["summary"]["miles_by_risk"]["severe"] > 0.0

    # 2. 35,000 lb load: wind in [45, 55) + load > 30,000 lb triggers NO TRAVEL
    with (
        patch(
            "planner.services.planner_service.OpenRouteServiceRoutingProvider",
            return_value=StubRoutingProvider(),
        ),
        patch(
            "planner.services.planner_service.OpenMeteoWeatherProvider",
            return_value=StubWeatherProvider(wind_mph=50.0),
        ),
    ):
        resp_heavy = api_client.post(
            "/api/plans", {**base_payload, "load_lb": 35000}, format="json"
        )

    assert resp_heavy.status_code == 201
    data_heavy = resp_heavy.json()
    assert data_heavy["routes"][0]["summary"]["travel_blocked"] is True
    assert data_heavy["routes"][0]["summary"]["miles_by_risk"]["no_travel"] > 0.0
    assert data_heavy["routes"][0]["checkpoints"][0]["risk"]["load_escalated"] is True


def test_create_plan_invalid_inputs(api_client):
    depart_time = (datetime.now(UTC) + timedelta(hours=3)).isoformat()

    # Negative load
    resp = api_client.post(
        "/api/plans",
        {
            "origin": {"lat": 30.0, "lon": -90.0},
            "destination": {"lat": 31.0, "lon": -90.0},
            "depart_at": depart_time,
            "load_lb": -500,
        },
        format="json",
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "invalid_input"

    # Same origin and destination
    resp_same = api_client.post(
        "/api/plans",
        {
            "origin": {"lat": 30.0, "lon": -90.0},
            "destination": {"lat": 30.0, "lon": -90.0},
            "depart_at": depart_time,
            "load_lb": 10000,
        },
        format="json",
    )
    assert resp_same.status_code == 400
    assert resp_same.json()["error"]["code"] == "invalid_input"

    # Past departure time (> 2 hours ago)
    past_time = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    resp_past = api_client.post(
        "/api/plans",
        {
            "origin": {"lat": 30.0, "lon": -90.0},
            "destination": {"lat": 31.0, "lon": -90.0},
            "depart_at": past_time,
            "load_lb": 10000,
        },
        format="json",
    )
    assert resp_past.status_code == 400
    assert resp_past.json()["error"]["code"] == "invalid_input"

    # Exceeding forecast horizon (> 16 days)
    far_future = (datetime.now(UTC) + timedelta(days=20)).isoformat()
    resp_future = api_client.post(
        "/api/plans",
        {
            "origin": {"lat": 30.0, "lon": -90.0},
            "destination": {"lat": 31.0, "lon": -90.0},
            "depart_at": far_future,
            "load_lb": 10000,
        },
        format="json",
    )
    assert resp_future.status_code == 400
    assert resp_future.json()["error"]["code"] == "invalid_input"


def test_create_plan_short_trip_checkpoints(api_client):
    depart_time = (datetime.now(UTC) + timedelta(hours=1)).isoformat()

    class ShortTripRoutingProvider(RoutingProvider):
        def get_routes(
            self,
            origin,
            destination,
            load_lb=0.0,
            preference="recommended",
            via=None,
            alternatives=0,
        ):
            # Short trip matching haversine distance of coordinates
            coords = [(origin[0], origin[1]), (destination[0], destination[1])]
            return [RawRoute("short-1", "Local Highway", 3.81, 360.0, tuple(coords), ())]

    with (
        patch(
            "planner.services.planner_service.OpenRouteServiceRoutingProvider",
            return_value=ShortTripRoutingProvider(),
        ),
        patch(
            "planner.services.planner_service.OpenMeteoWeatherProvider",
            return_value=StubWeatherProvider(),
        ),
    ):
        resp = api_client.post(
            "/api/plans",
            {
                "origin": {"lat": 32.7767, "lon": -96.7970},
                "destination": {"lat": 32.8300, "lon": -96.7800},
                "depart_at": depart_time,
                "load_lb": 10000,
                "interval_mi": 25,
            },
            format="json",
        )

    assert resp.status_code == 201
    data = resp.json()
    route = data["routes"][0]
    # Even though interval is 25 mi, a 4.5 mi trip must include both mile 0 and destination
    assert len(route["checkpoints"]) >= 2
    assert route["checkpoints"][0]["mile"] == 0.0
    assert route["checkpoints"][-1]["mile"] == route["distance_mi"]


def test_get_plan_by_id(api_client):
    depart_time = (datetime.now(UTC) + timedelta(hours=2)).isoformat()
    payload = {
        "origin": {"label": "Dallas", "lat": 32.7767, "lon": -96.7970},
        "destination": {"label": "Denver", "lat": 39.7392, "lon": -104.9903},
        "depart_at": depart_time,
        "load_lb": 15000,
        "interval_mi": 50,
    }

    with (
        patch(
            "planner.services.planner_service.OpenRouteServiceRoutingProvider",
            return_value=StubRoutingProvider(),
        ),
        patch(
            "planner.services.planner_service.OpenMeteoWeatherProvider",
            return_value=StubWeatherProvider(),
        ),
    ):
        create_resp = api_client.post("/api/plans", payload, format="json")

    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Fetch via GET
    get_resp = api_client.get(f"/api/plans/{plan_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == plan_id


def test_get_plan_not_found(api_client):
    resp = api_client.get("/api/plans/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"
