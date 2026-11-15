"""Geocoding service with caching and provider fallback."""

import hashlib
import logging
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"
PHOTON_GEOCODE_URL = "https://photon.komoot.io/api/"
CACHE_TTL_SECONDS = 86400  # 24 hours

# Common US logistics hubs and test fixtures for offline development and testing
FALLBACK_CITIES = {
    "dallas": {"label": "Dallas, TX, United States", "lat": 32.7767, "lon": -96.7970},
    "denver": {"label": "Denver, CO, United States", "lat": 39.7392, "lon": -104.9903},
    "chicago": {"label": "Chicago, IL, United States", "lat": 41.8781, "lon": -87.6298},
    "atlanta": {"label": "Atlanta, GA, United States", "lat": 33.7490, "lon": -84.3880},
    "los angeles": {"label": "Los Angeles, CA, United States", "lat": 34.0522, "lon": -118.2437},
    "california": {"label": "California, United States", "lat": 36.7015, "lon": -118.7560},
    "san francisco": {"label": "San Francisco, CA, United States", "lat": 37.7749, "lon": -122.4194},
    "sacramento": {"label": "Sacramento, CA, United States", "lat": 38.5816, "lon": -121.4944},
    "new york": {"label": "New York, NY, United States", "lat": 40.7128, "lon": -74.0060},
    "seattle": {"label": "Seattle, WA, United States", "lat": 47.6062, "lon": -122.3321},
    "miami": {"label": "Miami, FL, United States", "lat": 25.7617, "lon": -80.1918},
    "houston": {"label": "Houston, TX, United States", "lat": 29.7604, "lon": -95.3698},
    "phoenix": {"label": "Phoenix, AZ, United States", "lat": 33.4484, "lon": -112.0740},
    "texas": {"label": "Texas, United States", "lat": 31.9686, "lon": -99.9018},
    "amarillo": {"label": "Amarillo, TX, United States", "lat": 35.2220, "lon": -101.8313},
    "wichita falls": {"label": "Wichita Falls, TX, United States", "lat": 33.9137, "lon": -98.4934},
}


def _query_photon(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Query the free Photon geocoding API powered by OpenStreetMap."""
    try:
        headers = {"User-Agent": "WeatherAwareTruckRouting/1.0 (assessment@spotter.ai)"}
        params = {"q": query, "limit": limit}
        resp = requests.get(PHOTON_GEOCODE_URL, params=params, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for feat in data.get("features", []):
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                coords = geom.get("coordinates", [])
                if len(coords) >= 2:
                    parts = [props.get("name")]
                    state = props.get("state")
                    if state and state != props.get("name"):
                        parts.append(state)
                    country = props.get("country")
                    if country:
                        parts.append(country)
                    label = ", ".join(p for p in parts if p)
                    results.append(
                        {
                            "label": label,
                            "lat": round(float(coords[1]), 5),
                            "lon": round(float(coords[0]), 5),
                        }
                    )
            return results
    except Exception as exc:
        logger.warning("Photon geocoding request failed: %s", exc)
    return []


def geocode_address(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Geocode an address or city query into [{label, lat, lon}].

    Results are cached by query string.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    query_hash = hashlib.sha256(clean_query.lower().encode()).hexdigest()[:16]
    cache_key = f"geocode:{query_hash}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    api_key = getattr(settings, "ORS_API_KEY", "")

    results: list[dict[str, Any]] = []

    if api_key:
        try:
            params = {
                "api_key": api_key,
                "text": clean_query,
                "size": limit,
            }
            resp = requests.get(ORS_GEOCODE_URL, params=params, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    coords = geom.get("coordinates", [])
                    if len(coords) >= 2:
                        results.append(
                            {
                                "label": props.get("label", clean_query),
                                "lat": round(float(coords[1]), 5),
                                "lon": round(float(coords[0]), 5),
                            }
                        )
        except Exception as exc:
            logger.warning("ORS Geocoding request failed: %s", exc)

    # If no ORS results (e.g. no API key configured), query free OSM/Photon geocoding
    if not results:
        results = _query_photon(clean_query, limit=limit)

    # Fallback to local curated cities if network unavailable or empty
    if not results:
        q_lower = clean_query.lower()
        for name, city in FALLBACK_CITIES.items():
            if name in q_lower or q_lower in name:
                results.append(dict(city))
                if len(results) >= limit:
                    break

    cache.set(cache_key, results, timeout=CACHE_TTL_SECONDS)
    return results
