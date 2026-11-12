from django.core.cache import caches
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

from .services.geocoding import geocode_address

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
