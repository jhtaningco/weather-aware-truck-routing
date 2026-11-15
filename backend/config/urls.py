"""Root URL configuration with API routing and SPA static fallback."""

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound
from django.urls import include, path, re_path


def spa_fallback(request):
    """Serve static assets if requested, or fallback to index.html for SPA routes."""
    raw_path = request.path_info.lstrip("/")
    if raw_path:
        for base in (settings.FRONTEND_DIST, settings.STATIC_ROOT):
            candidate = base / raw_path
            if candidate.is_file():
                return FileResponse(open(candidate, "rb"))
    index_file = settings.FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(open(index_file, "rb"), content_type="text/html")
    return HttpResponseNotFound("Frontend build not found. Run 'npm run build' in frontend.")


urlpatterns = [
    path("api/", include("planner.urls")),
    re_path(r"^(?!api/).*$", spa_fallback, name="spa_fallback"),
]
