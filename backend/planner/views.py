"""API endpoints for routing health, geocoding, and plan creation."""

import uuid

from django.core.cache import caches
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Plan
from .serializers import PlanRequestSerializer
from .services.geocoding import geocode_address
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
