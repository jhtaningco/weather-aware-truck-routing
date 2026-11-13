"""High-level orchestration service for building, evaluating, and ranking route plans."""

import logging
from datetime import datetime
from typing import Any

from django.conf import settings

from ..models import Plan
from .eta import interpolate_checkpoint_etas
from .geometry import simplify_geometry
from .recommend import RouteScore, rank_routes
from .risk import assess_checkpoint
from .routing.base import RoutingProvider
from .routing.fallback import FallbackRoutingProvider
from .routing.ors import OpenRouteServiceRoutingProvider
from .routing.osrm import OSRMRoutingProvider
from .routing.route_set import LayeredRouteService
from .sampling import sample_checkpoints
from .scoring import score_route
from .weather.base import WeatherProvider
from .weather.open_meteo import OpenMeteoWeatherProvider

logger = logging.getLogger(__name__)


def generate_plan(
    origin: dict[str, Any],
    destination: dict[str, Any],
    depart_at: datetime,
    load_lb: int,
    interval_mi: int = 25,
    routing_provider: RoutingProvider | None = None,
    weather_provider: WeatherProvider | None = None,
) -> dict[str, Any]:
    """Execute the end-to-end plan generation pipeline and persist to database."""
    # 1. Initialize providers
    if routing_provider is None:
        ors_key = getattr(settings, "ORS_API_KEY", "")
        primary_provider = OpenRouteServiceRoutingProvider(api_key=ors_key)
        routing_provider = FallbackRoutingProvider(
            primary=primary_provider,
            fallback=OSRMRoutingProvider(),
        )

    if weather_provider is None:
        weather_provider = OpenMeteoWeatherProvider()

    route_service = LayeredRouteService(routing_provider)

    origin_coord = (float(origin["lat"]), float(origin["lon"]))
    dest_coord = (float(destination["lat"]), float(destination["lon"]))

    # 2. Layered generation of 3 distinct routes
    raw_routes, note = route_service.get_three_distinct_routes(
        origin=origin_coord,
        destination=dest_coord,
        load_lb=float(load_lb),
    )

    if not raw_routes:
        raise ValueError("Could not find any viable driving route between these locations.")

    # 3. Process each route: sample checkpoints, calculate ETAs, fetch weather, assess risk
    scored_routes_data: list[dict[str, Any]] = []
    route_scores_for_ranking: list[RouteScore] = []

    # Pre-sample checkpoints and pre-fetch weather in a single batched pass
    route_samples = [
        sample_checkpoints(route.geometry, interval_miles=float(interval_mi))
        for route in raw_routes
    ]
    all_coords_to_fetch: list[Coordinate] = [
        (s.lat, s.lon) for samples in route_samples for s in samples
    ]
    if hasattr(weather_provider, "get_hourly_series_batch"):
        try:
            weather_provider.get_hourly_series_batch(all_coords_to_fetch)
        except Exception as exc:
            logger.warning("Pre-fetching weather batch failed: %s", exc)

    for idx, route in enumerate(raw_routes):
        samples = route_samples[idx]
        sample_coords = [(s.lat, s.lon) for s in samples]
        sample_miles = [s.mile for s in samples]

        etas = interpolate_checkpoint_etas(
            departure_time=depart_at,
            checkpoint_miles=sample_miles,
            steps=route.steps,
            total_duration_seconds=route.duration_seconds,
        )

        points_with_etas = list(zip(sample_coords, etas, strict=False))
        weathers = weather_provider.get_weather_at_etas(points_with_etas)

        # Assess risk at each checkpoint
        risks = [
            assess_checkpoint(
                wind_mph=w.wind_mph,
                rain_in_hr=w.rain_in_hr,
                snow_in_hr=w.snow_in_hr,
                load_lb=float(load_lb),
            )
            for w in weathers
        ]

        weather_dicts = [
            {
                "wind_mph": w.wind_mph,
                "gust_mph": w.gust_mph,
                "rain_in_hr": w.rain_in_hr,
                "snow_in_hr": w.snow_in_hr,
            }
            for w in weathers
        ]
        eta_strings = [t.isoformat() for t in etas]

        # Calculate segment miles and metrics
        metrics = score_route(
            checkpoint_miles=sample_miles,
            checkpoint_risks=risks,
            checkpoint_coords=sample_coords,
            checkpoint_etas=eta_strings,
            checkpoint_weathers=weather_dicts,
            total_distance=route.distance_miles,
            total_duration_seconds=route.duration_seconds,
        )

        route_scores_for_ranking.append(
            RouteScore(
                route_id=route.route_id,
                label=route.label,
                miles_by_risk=metrics.miles_by_risk,
                avg_risk=metrics.avg_risk,
                duration_s=metrics.duration_seconds,
            )
        )

        # Simplify geometry for efficient display GeoJSON
        simplified_coords = simplify_geometry(route.geometry, tolerance_deg=0.0003)
        # GeoJSON LineString coordinates are [lon, lat]
        geojson_coords = [[pt[1], pt[0]] for pt in simplified_coords]

        # Format checkpoints for API output
        api_checkpoints = []
        for cp in metrics.checkpoints:
            api_checkpoints.append(
                {
                    "index": cp.index,
                    "lat": cp.lat,
                    "lon": cp.lon,
                    "mile": cp.mile,
                    "eta": cp.eta,
                    "weather": cp.weather,
                    "risk": {
                        "level": int(cp.risk.level),
                        "level_name": cp.risk.level.label,
                        "wind": int(cp.risk.wind),
                        "rain": int(cp.risk.rain),
                        "snow": int(cp.risk.snow),
                        "load_escalated": cp.risk.load_escalated,
                        "drivers": list(cp.risk.drivers),
                    },
                }
            )

        scored_routes_data.append(
            {
                "id": route.route_id,
                "label": route.label,
                "distance_mi": metrics.distance_miles,
                "duration_s": metrics.duration_seconds,
                "arrival_eta": eta_strings[-1] if eta_strings else depart_at.isoformat(),
                "geometry": {
                    "type": "LineString",
                    "coordinates": geojson_coords,
                },
                "summary": {
                    "miles_by_risk": metrics.miles_by_risk,
                    "avg_risk": metrics.avg_risk,
                    "max_risk": metrics.max_risk,
                    "travel_blocked": metrics.travel_blocked,
                },
                "checkpoints": api_checkpoints,
            }
        )

    # 4. Rank routes lexicographically and generate explanations
    rec_result = rank_routes(route_scores_for_ranking)

    # Enrich each route with its rank and reasons
    ranking_by_id = {r.route_id: r for r in rec_result.ranking}
    for r_data in scored_routes_data:
        ranked_info = ranking_by_id.get(r_data["id"])
        if ranked_info:
            r_data["summary"]["rank"] = ranked_info.rank
            r_data["summary"]["reasons"] = list(ranked_info.reasons)

    # Sort routes in the response by rank (recommended first)
    scored_routes_data.sort(key=lambda r: r["summary"]["rank"])

    # 5. Assemble full response payload matching Section 5 contract
    plan_record = Plan(payload={})
    plan_id = str(plan_record.id)

    response_payload: dict[str, Any] = {
        "id": plan_id,
        "inputs": {
            "origin": origin,
            "destination": destination,
            "depart_at": depart_at.isoformat(),
            "load_lb": load_lb,
            "interval_mi": interval_mi,
        },
        "recommended_route_id": rec_result.route_id,
        "recommendation": {
            "route_id": rec_result.route_id,
            "explanation": rec_result.explanation,
            "recommended_blocked": rec_result.recommended_blocked,
            "all_blocked": rec_result.all_blocked,
            "corridor_note": note,
        },
        "routes": scored_routes_data,
    }

    # 6. Persist to database
    plan_record.payload = response_payload
    plan_record.save()

    return response_payload
