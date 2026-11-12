"""API endpoints for routing health, geocoding, and plan creation."""

import uuid
from datetime import datetime

from django.core.cache import cache, caches
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Plan
from .serializers import PlanRequestSerializer
from .services.geocoding import geocode_address
from .services.heatmap import compute_corridor_heatmap
from .services.planner_service import generate_plan

API_VERSION = "0.1.0"


@api_view(["GET"])
@throttle_classes([])
def health(request: Request) -> Response:
    """Liveness probe. Also reports which cache backend is active."""
    backend = type(caches["default"]).__name__
    return Response({"status": "ok", "version": API_VERSION, "cache_backend": backend})


@api_view(["GET"])
def geocode(request: Request) -> Response:
    """Autocomplete and geocoding endpoint: GET /api/geocode?q=<text>."""
    query = request.query_params.get("q", "").strip()
    if not query or len(query) < 2:
        return Response([])

    results = geocode_address(query)
    return Response(results)


@api_view(["POST"])
def create_plan(request: Request) -> Response:
    """Generate a route plan with weather evaluations: POST /api/plans."""
    serializer = PlanRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "error": {
                    "code": "invalid_input",
                    "message": "Invalid trip parameters",
                    "details": serializer.errors,
                }
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    validated = serializer.validated_data
    try:
        plan_data = generate_plan(
            origin=validated["origin"],
            destination=validated["destination"],
            depart_at=validated["depart_at"],
            load_lb=validated["load_lb"],
            interval_mi=validated["interval_mi"],
        )
        return Response(plan_data, status=status.HTTP_201_CREATED)
    except ValueError as exc:
        return Response(
            {"error": {"code": "routing_error", "message": str(exc)}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return Response(
            {
                "error": {
                    "code": "server_error",
                    "message": f"Failed to generate route plan: {exc}",
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def get_plan(request: Request, plan_id: str) -> Response:
    """Retrieve an existing plan by ID: GET /api/plans/<id>."""
    try:
        valid_uuid = uuid.UUID(plan_id)
        plan = Plan.objects.get(id=valid_uuid)
        return Response(plan.payload)
    except (ValueError, Plan.DoesNotExist):
        return Response(
            {"error": {"code": "not_found", "message": f"Plan {plan_id} not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
def get_heatmap(request: Request, plan_id: str) -> Response:
    """Retrieve 48-hour corridor weather risk heatmap for a plan: GET /api/plans/<id>/heatmap."""
    try:
        valid_uuid = uuid.UUID(plan_id)
        plan = Plan.objects.get(id=valid_uuid)
    except (ValueError, Plan.DoesNotExist):
        return Response(
            {"error": {"code": "not_found", "message": f"Plan {plan_id} not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )

    # 1. Check cache or stored payload
    cache_key = f"plan:heatmap:{plan_id}"
    cached_heatmap = cache.get(cache_key)
    if cached_heatmap is not None:
        return Response(cached_heatmap)

    if plan.payload.get("heatmap"):
        return Response(plan.payload["heatmap"])

    # 2. Compute heatmap
    try:
        inputs = plan.payload.get("inputs", {})
        depart_at_str = inputs.get("depart_at", "")
        depart_at = datetime.fromisoformat(depart_at_str)
        load_lb = float(inputs.get("load_lb", 0.0))

        # Extract route coordinate sequences: GeoJSON [lon, lat] -> [lat, lon]
        routes = plan.payload.get("routes", [])
        route_geoms = [
            [[coord[1], coord[0]] for coord in r.get("geometry", {}).get("coordinates", [])]
            for r in routes
        ]

        heatmap_data = compute_corridor_heatmap(
            plan_id=str(plan.id),
            depart_at=depart_at,
            load_lb=load_lb,
            route_geometries=route_geoms,
        )

        # Cache for 24 hours and save on plan payload
        cache.set(cache_key, heatmap_data, timeout=86400)
        plan.payload["heatmap"] = heatmap_data
        plan.save(update_fields=["payload"])

        return Response(heatmap_data)
    except Exception as exc:
        return Response(
            {
                "error": {
                    "code": "heatmap_computation_failed",
                    "message": f"Failed to compute corridor heatmap: {exc}",
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
