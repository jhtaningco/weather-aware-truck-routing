"""Tests for Open-Meteo weather provider, batching, and linear interpolation."""

from datetime import UTC, datetime, timedelta

import pytest
import responses
from django.core.cache import cache

from planner.services.weather.open_meteo import (
    OPEN_METEO_FORECAST_URL,
    OpenMeteoWeatherProvider,
)


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


def make_mock_hourly_response(start_time: datetime, count: int = 5):
    times = []
    winds = []
    gusts = []
    rains = []
    showers = []
    snows = []

    for i in range(count):
        t = start_time + timedelta(hours=i)
        times.append(t.strftime("%Y-%m-%dT%H:%M"))
        winds.append(10.0 + i * 10.0)  # 10, 20, 30, 40, 50
        gusts.append(15.0 + i * 10.0)
        rains.append(0.1 * i)
        showers.append(0.05 * i)  # total rain rate = 0.15 * i
        snows.append(0.2 * i)

    return {
        "latitude": 35.0,
        "longitude": -95.0,
        "hourly": {
            "time": times,
            "wind_speed_10m": winds,
            "wind_gusts_10m": gusts,
            "rain": rains,
            "showers": showers,
            "snowfall": snows,
        },
    }


@responses.activate
def test_open_meteo_exact_hour():
    t0 = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_data = make_mock_hourly_response(t0, count=4)

    responses.add(
        responses.GET,
        OPEN_METEO_FORECAST_URL,
        json=mock_data,
        status=200,
    )

    provider = OpenMeteoWeatherProvider()
    results = provider.get_weather_at_etas([((35.0, -95.0), t0)])

    assert len(results) == 1
    w = results[0]
    # At t0 (hour 0): wind=10.0, rain=0.0+0.0=0.0
    assert w.wind_mph == 10.0
    assert w.gust_mph == 15.0
    assert w.rain_in_hr == 0.0
    assert w.snow_in_hr == 0.0


@responses.activate
def test_open_meteo_linear_interpolation_halfway():
    t0 = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_data = make_mock_hourly_response(t0, count=4)

    responses.add(
        responses.GET,
        OPEN_METEO_FORECAST_URL,
        json=mock_data,
        status=200,
    )

    provider = OpenMeteoWeatherProvider()
    # Query at 10:30 (halfway between hour 0 and hour 1)
    t_half = t0 + timedelta(minutes=30)
    results = provider.get_weather_at_etas([((35.0, -95.0), t_half)])

    w = results[0]
    # Hour 0: wind 10, gust 15, rain 0.0
    # Hour 1: wind 20, gust 25, rain 0.15 (0.10 rain + 0.05 showers)
    # Halfway: wind 15.0, gust 20.0, rain 0.08, snow 0.10
    assert w.wind_mph == 15.0
    assert w.gust_mph == 20.0
    assert abs(w.rain_in_hr - 0.08) < 0.02
    assert abs(w.snow_in_hr - 0.10) < 0.02


@responses.activate
def test_open_meteo_boundary_clamping():
    t0 = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_data = make_mock_hourly_response(t0, count=3)

    responses.add(
        responses.GET,
        OPEN_METEO_FORECAST_URL,
        json=mock_data,
        status=200,
    )

    provider = OpenMeteoWeatherProvider()
    # Before series starts
    t_before = t0 - timedelta(hours=2)
    # After series ends
    t_after = t0 + timedelta(hours=10)

    results = provider.get_weather_at_etas(
        [
            ((35.0, -95.0), t_before),
            ((35.0, -95.0), t_after),
        ]
    )

    # Clamps to hour 0
    assert results[0].wind_mph == 10.0
    # Clamps to hour 2 (last hour)
    assert results[1].wind_mph == 30.0


@responses.activate
def test_weather_caching_avoids_repeated_network_calls():
    t0 = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
    mock_data = make_mock_hourly_response(t0, count=3)

    responses.add(
        responses.GET,
        OPEN_METEO_FORECAST_URL,
        json=mock_data,
        status=200,
    )

    provider = OpenMeteoWeatherProvider()
    # First call
    provider.get_weather_at_etas([((35.001, -95.002), t0)])
    assert len(responses.calls) == 1

    # Second call for essentially the same coordinate (rounds to 35.0, -95.0)
    provider.get_weather_at_etas([((35.004, -94.998), t0 + timedelta(minutes=15))])
    # Should hit cache, not make another HTTP request
    assert len(responses.calls) == 1
