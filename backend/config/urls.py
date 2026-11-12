"""Root URL configuration with API routing and SPA static fallback."""

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound
from django.urls import include, path, re_path


def spa_fallback(request):
    """Serve the compiled React SPA index.html for all non-API routes."""
    index_file = settings.FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(open(index_file, "rb"), content_type="text/html")
    return HttpResponseNotFound("Frontend build not found. Run 'npm run build' in frontend.")


urlpatterns = [
    path("api/", include("planner.urls")),
    re_path(r"^(?!api/).*$", spa_fallback, name="spa_fallback"),
]
