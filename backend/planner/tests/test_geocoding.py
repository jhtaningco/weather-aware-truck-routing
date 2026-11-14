"""Tests for geocoding service and /api/geocode endpoint."""

import hashlib
import json
from pathlib import Path

import pytest
import responses
from django.core.cache import cache
from rest_framework.test import APIClient

from planner.services.geocoding import ORS_GEOCODE_URL, geocode_address

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


@pytest.fixture(autouse=True)
def clear_test_cache():
    cache.clear()
    yield
    cache.clear()


@responses.activate
def test_geocode_with_ors_mock(settings):
    settings.ORS_API_KEY = "test-ors-key"
    fixture_path = FIXTURES_DIR / "ors_geocode_dallas.json"
    with open(fixture_path, encoding="utf-8") as f:
        mock_data = json.load(f)

    responses.add(
        responses.GET,
        ORS_GEOCODE_URL,
        json=mock_data,
        status=200,
    )

    results = geocode_address("Dallas")
    assert len(results) == 1
    assert results[0]["label"] == "Dallas, TX, USA"
    assert results[0]["lat"] == 32.7767
    assert results[0]["lon"] == -96.797


def test_geocode_fallback_offline():
    # Even without ORS key, fallback returns matching city
    results = geocode_address("Denver")
    assert len(results) >= 1
    assert "Denver" in results[0]["label"]
    assert results[0]["lat"] == 39.7392
    assert results[0]["lon"] == -104.9903


def test_geocode_caching():
    results1 = geocode_address("Chicago")
    # Verify cached
    query_hash = hashlib.sha256("chicago".encode()).hexdigest()[:16]
    cache_key = f"geocode:{query_hash}:5"
    assert cache.get(cache_key) == results1

    # Second call returns from cache
    results2 = geocode_address("Chicago")
    assert results1 == results2


def test_geocode_api_endpoint():
    client = APIClient()
    response = client.get("/api/geocode?q=Dallas")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "lat" in data[0]
    assert "lon" in data[0]
    assert "label" in data[0]


def test_geocode_api_endpoint_short_query():
    client = APIClient()
    response = client.get("/api/geocode?q=d")
    assert response.status_code == 200
    assert response.json() == []
