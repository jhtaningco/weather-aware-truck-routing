"""Open-Meteo forecast API client with coordinate batching and ETA linear interpolation."""

import logging
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

import requests
from django.core.cache import cache

from ..geometry import Coordinate
from .base import CheckpointWeather, WeatherProvider

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
BATCH_CHUNK_SIZE = 50
WEATHER_CACHE_TTL = 3600  # 1 hour


def _round_coord(coord: Coordinate) -> tuple[float, float]:
    """Round coordinate to 2 decimal places (~1.1 km) for weather caching."""
    return round(coord[0], 2), round(coord[1], 2)


def _parse_utc_iso(time_str: str) -> datetime:
    """Parse Open-Meteo UTC hourly timestamp 'YYYY-MM-DDTHH:MM'."""
    # Append +00:00 if timezone offset is not present
    if "Z" in time_str:
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    if "+" not in time_str and "-" not in time_str[10:]:
        return datetime.fromisoformat(f"{time_str}+00:00")
    return datetime.fromisoformat(time_str)


class OpenMeteoWeatherProvider(WeatherProvider):
    """Weather provider implementation backed by Open-Meteo free API."""

    def __init__(self, base_url: str = OPEN_METEO_FORECAST_URL, timeout: int = 15):
        self.base_url = base_url
        self.timeout = timeout

    def get_hourly_series_batch(
        self, coords: Sequence[Coordinate]
    ) -> dict[tuple[float, float], dict[str, list]]:
        """Fetch and return hourly forecast series for coordinates with 1h caching."""
        unique_coords = list({_round_coord(c) for c in coords})
        series_by_coord: dict[tuple[float, float], dict[str, list]] = {}
        missing_coords: list[tuple[float, float]] = []

        for c in unique_coords:
            cache_key = f"weather:series:{c[0]}:{c[1]}"
            cached_series = cache.get(cache_key)
            if cached_series is not None:
                series_by_coord[c] = cached_series
            else:
                missing_coords.append(c)

        if missing_coords:
            fetched_data = self._fetch_batches(missing_coords)
            for c, series in fetched_data.items():
                series_by_coord[c] = series
                cache_key = f"weather:series:{c[0]}:{c[1]}"
                cache.set(cache_key, series, timeout=WEATHER_CACHE_TTL)

        return series_by_coord

    def interpolate_at_time(
        self, series: dict[str, list], dt: datetime
    ) -> CheckpointWeather:
        """Interpolate weather values from an hourly series at a specific datetime."""
        if not series or not series.get("times"):
            return CheckpointWeather(0.0, 0.0, 0.0, 0.0)
        return self._interpolate_at_eta(series, dt)

    def get_weather_at_etas(
        self,
        points_with_etas: Sequence[tuple[Coordinate, datetime]],
    ) -> list[CheckpointWeather]:
        """Fetch and interpolate weather conditions for each point at its arrival ETA."""
        if not points_with_etas:
            return []

        series_by_coord = self.get_hourly_series_batch([p[0] for p in points_with_etas])

        results: list[CheckpointWeather] = []
        for coord, eta in points_with_etas:
            c_round = _round_coord(coord)
            series = series_by_coord.get(c_round, {})
            results.append(self.interpolate_at_time(series, eta))

        return results

    def _fetch_batches(
        self, coords: list[tuple[float, float]]
    ) -> dict[tuple[float, float], dict[str, list]]:
        """Fetch hourly weather series from Open-Meteo in batched requests."""
        results: dict[tuple[float, float], dict[str, list]] = {}

        for i in range(0, len(coords), BATCH_CHUNK_SIZE):
            chunk = coords[i : i + BATCH_CHUNK_SIZE]
            lats = ",".join(str(c[0]) for c in chunk)
            lons = ",".join(str(c[1]) for c in chunk)

            params = {
                "latitude": lats,
                "longitude": lons,
                "hourly": "wind_speed_10m,wind_gusts_10m,rain,showers,snowfall",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "timezone": "UTC",
            }

            try:
                resp = requests.get(self.base_url, params=params, timeout=self.timeout)
                if resp.status_code == 200:
                    data = resp.json()
                    # Open-Meteo returns a list if multiple coordinates, or a single dict if one
                    data_list = data if isinstance(data, list) else [data]
                    for idx, item in enumerate(data_list):
                        if idx < len(chunk):
                            coord = chunk[idx]
                            results[coord] = self._normalize_hourly(item.get("hourly", {}))
                else:
                    logger.warning("Open-Meteo returned status %d: %s", resp.status_code, resp.text)
            except Exception as exc:
                logger.warning("Open-Meteo request failed: %s", exc)

        return results

    def _normalize_hourly(self, hourly_raw: dict[str, Any]) -> dict[str, list]:
        """Parse string times into timestamps and extract lists."""
        times_raw = hourly_raw.get("time", [])
        if not times_raw:
            return {}

        parsed_times: list[datetime] = []
        for t_str in times_raw:
            try:
                parsed_times.append(_parse_utc_iso(t_str))
            except Exception:
                pass

        return {
            "times": parsed_times,
            "wind": [float(x or 0.0) for x in hourly_raw.get("wind_speed_10m", [])],
            "gusts": [float(x or 0.0) for x in hourly_raw.get("wind_gusts_10m", [])],
            "rain": [float(x or 0.0) for x in hourly_raw.get("rain", [])],
            "showers": [float(x or 0.0) for x in hourly_raw.get("showers", [])],
            "snow": [float(x or 0.0) for x in hourly_raw.get("snowfall", [])],
        }

    def _interpolate_at_eta(self, series: dict[str, list], eta: datetime) -> CheckpointWeather:
        """Linearly interpolate hourly values at the exact ETA."""
        times: list[datetime] = series.get("times", [])
        if not times:
            return CheckpointWeather(0.0, 0.0, 0.0, 0.0)

        # Ensure ETA is UTC aware
        if eta.tzinfo is None:
            eta_utc = eta.replace(tzinfo=UTC)
        else:
            eta_utc = eta.astimezone(UTC)

        # Clamping at boundaries
        if eta_utc <= times[0]:
            idx = 0
            return self._extract_at_index(series, idx)
        if eta_utc >= times[-1]:
            idx = len(times) - 1
            return self._extract_at_index(series, idx)

        # Find the two bounding hours
        idx = 0
        for i in range(len(times) - 1):
            if times[i] <= eta_utc <= times[i + 1]:
                idx = i
                break

        t1 = times[idx]
        t2 = times[idx + 1]
        span_seconds = (t2 - t1).total_seconds()
        alpha = (eta_utc - t1).total_seconds() / span_seconds if span_seconds > 0 else 0.0
        alpha = max(0.0, min(1.0, alpha))

        w1 = self._extract_at_index(series, idx)
        w2 = self._extract_at_index(series, idx + 1)

        interp_wind = round((1.0 - alpha) * w1.wind_mph + alpha * w2.wind_mph, 1)
        interp_gust = round((1.0 - alpha) * w1.gust_mph + alpha * w2.gust_mph, 1)
        interp_rain = round((1.0 - alpha) * w1.rain_in_hr + alpha * w2.rain_in_hr, 2)
        interp_snow = round((1.0 - alpha) * w1.snow_in_hr + alpha * w2.snow_in_hr, 2)

        return CheckpointWeather(
            wind_mph=max(0.0, interp_wind),
            gust_mph=max(0.0, interp_gust),
            rain_in_hr=max(0.0, interp_rain),
            snow_in_hr=max(0.0, interp_snow),
        )

    def _extract_at_index(self, series: dict[str, list], idx: int) -> CheckpointWeather:
        wind = series["wind"][idx] if idx < len(series.get("wind", [])) else 0.0
        gusts = series["gusts"][idx] if idx < len(series.get("gusts", [])) else 0.0
        rain = series["rain"][idx] if idx < len(series.get("rain", [])) else 0.0
        showers = series["showers"][idx] if idx < len(series.get("showers", [])) else 0.0
        snow = series["snow"][idx] if idx < len(series.get("snow", [])) else 0.0

        return CheckpointWeather(
            wind_mph=round(wind, 1),
            gust_mph=round(gusts, 1),
            rain_in_hr=round(rain + showers, 2),  # rain rate = rain + showers
            snow_in_hr=round(snow, 2),
        )
