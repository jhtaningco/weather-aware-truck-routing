"""Tests for routing provider, layered 3-route generation, and deduplication."""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
import responses

from planner.services.eta import interpolate_checkpoint_etas
from planner.services.routing.base import RawRoute, RoutingProvider
from planner.services.routing.fallback import FallbackRoutingProvider
from planner.services.routing.ors import OpenRouteServiceRoutingProvider
from planner.services.routing.osrm import OSRMRoutingProvider
from planner.services.routing.route_set import (
    LayeredRouteService,
    are_routes_duplicates,
)
from planner.services.sampling import sample_checkpoints

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


class MockRoutingProvider(RoutingProvider):
    """Configurable mock provider for layered generation tests."""

    def __init__(self, routes_to_return: list[RawRoute] | None = None):
        self.routes_to_return = routes_to_return or []
        self.call_history: list[dict] = []

    def get_routes(
        self,
        origin,
        destination,
        load_lb=0.0,
        preference="recommended",
        via=None,
        alternatives=0,
    ) -> list[RawRoute]:
        self.call_history.append(
            {
                "origin": origin,
                "destination": destination,
                "load_lb": load_lb,
                "preference": preference,
                "via": via,
                "alternatives": alternatives,
            }
        )
        return list(self.routes_to_return)


def make_route(
    route_id: str,
    coords: list[tuple[float, float]],
    distance_mi: float = 100.0,
    duration_s: float = 3600.0,
) -> RawRoute:
    return RawRoute(
        route_id=route_id,
        label=f"Route {route_id}",
        distance_miles=distance_mi,
        duration_seconds=duration_s,
        geometry=tuple(coords),
        steps=(),
    )


# --------------------------------------------------------------------------- ORS Provider


@responses.activate
def test_ors_provider_parses_fixture_correctly():
    fixture_path = FIXTURES_DIR / "ors_directions_dallas_denver.json"
    with open(fixture_path, encoding="utf-8") as f:
        data = json.load(f)

    responses.add(
        responses.POST,
        "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
        json=data,
        status=200,
    )

    provider = OpenRouteServiceRoutingProvider(api_key="test-key")
    routes = provider.get_routes(
        origin=(32.7767, -96.7970),
        destination=(39.7392, -104.9903),
        load_lb=35000,
        alternatives=1,
    )

    assert len(routes) == 2
    # Route 1: 1,275,000 meters ~ 792.25 miles
    assert 790 < routes[0].distance_miles < 795
    assert routes[0].duration_seconds == 43200.0
    # Coordinates converted to (lat, lon)
    assert routes[0].geometry[0] == (32.7767, -96.797)
    assert routes[0].geometry[-1] == (39.7392, -104.9903)
    assert len(routes[0].steps) == 3


def test_ors_provider_requires_api_key():
    provider = OpenRouteServiceRoutingProvider(api_key="")
    with pytest.raises(ValueError, match="ORS_API_KEY is not configured"):
        provider.get_routes(origin=(30, -90), destination=(31, -90))


# --------------------------------------------------------------------------- Deduplication


def test_deduplication_detects_identical_routes():
    coords = [(30.0, -90.0), (31.0, -90.0), (32.0, -90.0)]
    r1 = make_route("1", coords, 100.0)
    r2 = make_route("2", coords, 100.0)
    assert are_routes_duplicates(r1, r2) is True


def test_deduplication_detects_minor_variation_as_duplicate():
    # Route A
    coords_a = [(float(i), 0.0) for i in range(100)]
    r_a = make_route("A", coords_a, 100.0)

    # Route B is 95% identical, with only 5 points shifted by 200 meters (~0.12 mi)
    coords_b = [(float(i), 0.002 if i < 5 else 0.0) for i in range(100)]
    r_b = make_route("B", coords_b, 100.0)

    assert are_routes_duplicates(r_a, r_b) is True


def test_deduplication_keeps_distinct_routes():
    coords_a = [(30.0, -90.0), (31.0, -90.0), (32.0, -90.0)]
    # Route B takes a big loop to the west (-95.0 lon)
    coords_b = [(30.0, -90.0), (31.0, -95.0), (32.0, -90.0)]
    r_a = make_route("A", coords_a, 138.0)
    r_b = make_route("B", coords_b, 350.0)

    assert are_routes_duplicates(r_a, r_b) is False


# --------------------------------------------------------------------------- Layered 3 Routes


def test_layered_service_uses_layers_until_3_distinct_routes():
    # Setup mock provider returning 1 route initially, another on fastest, another on shortest
    r1 = make_route("r1", [(30.0, -90.0), (31.0, -90.0)], 70.0)
    r2 = make_route("r2", [(30.0, -90.0), (30.5, -92.0), (31.0, -90.0)], 90.0)
    r3 = make_route("r3", [(30.0, -90.0), (30.5, -88.0), (31.0, -90.0)], 95.0)

    class MultiStepProvider(RoutingProvider):
        def get_routes(
            self,
            origin,
            destination,
            load_lb=0.0,
            preference="recommended",
            via=None,
            alternatives=0,
        ):
            if alternatives > 0:
                return [r1]  # Layer 1 returns only 1 route
            if preference == "fastest":
                return [r2]  # Layer 2 returns r2
            if preference == "shortest":
                return [r3]  # Layer 2 returns r3
            return []

    service = LayeredRouteService(MultiStepProvider())
    routes, note = service.get_three_distinct_routes((30.0, -90.0), (31.0, -90.0))

    assert len(routes) == 3
    assert [r.route_id for r in routes] == ["route-1", "route-2", "route-3"]
    assert [r.label for r in routes] == ["Route A", "Route B", "Route C"]
    assert note is None


def test_layered_service_handles_short_trip_with_fewer_than_3_routes():
    # Only 1 unique route possible
    r1 = make_route("r1", [(30.0, -90.0), (30.01, -90.0)], 0.7)
    provider = MockRoutingProvider([r1])
    service = LayeredRouteService(provider)

    routes, note = service.get_three_distinct_routes((30.0, -90.0), (30.01, -90.0))
    assert len(routes) == 1
    assert "Found 1 distinct route" in (note or "")


# --------------------------------------------------------------------------- End-to-End Pipeline


@responses.activate
def test_full_pipeline_routes_sampling_etas():
    """Verify full end-to-end flow from ORS fixture to checkpoints and interpolated ETAs."""
    fixture_path = FIXTURES_DIR / "ors_directions_dallas_denver.json"
    with open(fixture_path, encoding="utf-8") as f:
        data = json.load(f)

    responses.add(
        responses.POST,
        "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
        json=data,
        status=200,
    )

    provider = OpenRouteServiceRoutingProvider(api_key="test-key")
    routes = provider.get_routes((32.7767, -96.7970), (39.7392, -104.9903), load_lb=42000)

    assert len(routes) >= 2
    route = routes[0]

    # Sample checkpoints every 50 miles
    checkpoints = sample_checkpoints(route.geometry, interval_miles=50.0)
    assert len(checkpoints) >= 15
    assert checkpoints[0].mile == 0.0
    assert checkpoints[-1].route_progress == 1.0

    # Compute ETAs
    t_depart = datetime(2026, 11, 20, 7, 0, tzinfo=UTC)
    checkpoint_miles = [cp.mile for cp in checkpoints]
    etas = interpolate_checkpoint_etas(
        t_depart, checkpoint_miles, route.steps, route.duration_seconds
    )

    assert len(etas) == len(checkpoints)
    assert etas[0] == t_depart
    assert (etas[-1] - t_depart).total_seconds() == route.duration_seconds
    for i in range(len(etas) - 1):
        assert etas[i] < etas[i + 1]


@responses.activate
def test_osrm_provider_parses_routes_and_steps():
    """Verify OSRMRoutingProvider parses OSRM response correctly."""
    mock_osrm_data = {
        "code": "Ok",
        "routes": [
            {
                "distance": 160934.4,  # 100 miles in meters
                "duration": 5400.0,
                "geometry": {
                    "coordinates": [[-96.7970, 32.7767], [-97.0, 33.0], [-104.9903, 39.7392]],
                    "type": "LineString",
                },
                "legs": [
                    {
                        "distance": 160934.4,
                        "duration": 5400.0,
                        "steps": [
                            {"distance": 80467.2, "duration": 2700.0},
                            {"distance": 80467.2, "duration": 2700.0},
                        ],
                    }
                ],
            }
        ],
    }

    responses.add(
        responses.GET,
        "https://router.project-osrm.org/route/v1/driving/-96.797000,32.776700;-104.990300,39.739200?overview=full&geometries=geojson&steps=true&alternatives=false",
        json=mock_osrm_data,
        status=200,
    )

    provider = OSRMRoutingProvider()
    routes = provider.get_routes((32.7767, -96.7970), (39.7392, -104.9903))

    assert len(routes) == 1
    assert routes[0].distance_miles == 100.0
    assert routes[0].duration_seconds == 5400.0
    assert len(routes[0].geometry) == 3
    assert len(routes[0].steps) == 2
    assert routes[0].steps[0].distance_miles == 50.0


def test_fallback_routing_provider():
    """FallbackRoutingProvider tries primary first, falling back on failure."""
    primary_fail = MockRoutingProvider([])
    primary_fail.get_routes = lambda *a, **kw: (_ for _ in ()).throw(ValueError("ORS failed"))

    fallback_success = MockRoutingProvider([make_route("fb-1", [(30.0, -90.0), (31.0, -90.0)])])

    composite = FallbackRoutingProvider(primary=primary_fail, fallback=fallback_success)
    routes = composite.get_routes((30.0, -90.0), (31.0, -90.0))

    assert len(routes) == 1
    assert routes[0].route_id == "fb-1"

