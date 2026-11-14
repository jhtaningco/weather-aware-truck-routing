"""Open Source Routing Machine (OSRM) provider requiring zero API keys."""

import logging
import time
from typing import Any

import requests

from ..eta import StepDuration
from ..geometry import METERS_PER_MILE, Coordinate
from .base import RawRoute, RoutingProvider

logger = logging.getLogger(__name__)

OSRM_ROUTING_URL = "https://router.project-osrm.org/route/v1/driving"
MAX_RETRIES = 2
BACKOFF_FACTOR = 0.5


class OSRMRoutingProvider(RoutingProvider):
    """RoutingProvider implementation backed by the public OSRM demo server.

    Provides free, unmetered routing with zero API key configuration.
    """

    def __init__(self, base_url: str = OSRM_ROUTING_URL):
        self.base_url = base_url.rstrip("/")

    def get_routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        load_lb: float = 0.0,
        preference: str = "recommended",
        via: Coordinate | None = None,
        alternatives: int = 0,
    ) -> list[RawRoute]:
        """Query OSRM for driving routes between origin and destination."""
        # OSRM expects coordinates as lon,lat;lon,lat
        coord_parts = [f"{origin[1]:.6f},{origin[0]:.6f}"]
        if via is not None:
            coord_parts.append(f"{via[1]:.6f},{via[0]:.6f}")
        coord_parts.append(f"{destination[1]:.6f},{destination[0]:.6f}")
        coords_str = ";".join(coord_parts)

        alt_str = "true" if alternatives > 0 else "false"
        url = (
            f"{self.base_url}/{coords_str}"
            f"?overview=full&geometries=geojson&steps=true&alternatives={alt_str}"
        )

        headers = {
            "User-Agent": "WeatherAwareTruckRouting/1.0 (Assessment Evaluation)",
            "Accept": "application/json",
        }

        data = self._request_with_retry(url, headers)
        return self._parse_routes(data)

    def _request_with_retry(self, url: str, headers: dict[str, str]) -> dict[str, Any]:
        """Get request with exponential backoff on transient errors."""
        last_exc: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code in {429, 502, 503, 504}:
                    sleep_time = BACKOFF_FACTOR * (2**attempt)
                    logger.warning(
                        "OSRM server returned %d. Retrying in %.1fs (attempt %d/%d)...",
                        resp.status_code,
                        sleep_time,
                        attempt + 1,
                        MAX_RETRIES,
                    )
                    time.sleep(sleep_time)
                    continue

                raise ValueError(f"OSRM error ({resp.status_code}): {resp.text[:200]}")

            except (requests.Timeout, requests.ConnectionError) as exc:
                last_exc = exc
                sleep_time = BACKOFF_FACTOR * (2**attempt)
                logger.warning("OSRM connection error (%s). Retrying in %.1fs...", exc, sleep_time)
                time.sleep(sleep_time)

        raise RuntimeError(f"OSRM call failed after {MAX_RETRIES} attempts: {last_exc}")

    def _parse_routes(self, data: dict[str, Any]) -> list[RawRoute]:
        """Convert OSRM JSON response to domain RawRoute instances."""
        if data.get("code") != "Ok":
            logger.warning("OSRM returned non-Ok code: %s", data.get("code"))
            return []

        raw_routes = data.get("routes", [])
        if not raw_routes:
            return []

        results: list[RawRoute] = []
        for idx, route in enumerate(raw_routes):
            dist_m = float(route.get("distance", 0.0))
            dur_s = float(route.get("duration", 0.0))

            # GeoJSON coordinates are [lon, lat] -> convert to (lat, lon)
            coords_raw = route.get("geometry", {}).get("coordinates", [])
            geom: list[Coordinate] = [(float(pt[1]), float(pt[0])) for pt in coords_raw]

            # Collect steps across all legs
            steps: list[StepDuration] = []
            for leg in route.get("legs", []):
                for step in leg.get("steps", []):
                    step_m = float(step.get("distance", 0.0))
                    step_s = float(step.get("duration", 0.0))
                    steps.append(
                        StepDuration(
                            distance_miles=step_m / METERS_PER_MILE,
                            duration_seconds=step_s,
                        )
                    )

            label = f"Route {chr(ord('A') + idx)}"
            results.append(
                RawRoute(
                    route_id=f"route-{idx + 1}",
                    label=label,
                    distance_miles=round(dist_m / METERS_PER_MILE, 2),
                    duration_seconds=round(dur_s, 1),
                    geometry=tuple(geom),
                    steps=tuple(steps),
                )
            )

        return results
