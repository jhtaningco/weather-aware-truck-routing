from django.core.cache import cache
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

API_VERSION = "0.1.0"


@api_view(["GET"])
@throttle_classes([])
def health(request: Request) -> Response:
    """Liveness probe. Also reports which cache backend is active."""
    backend = type(cache).__name__
    return Response({"status": "ok", "version": API_VERSION, "cache_backend": backend})
