"""Abstract weather provider and checkpoint weather models."""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from ..geometry import Coordinate


@dataclass(frozen=True)
class CheckpointWeather:
    """Weather conditions at a checkpoint ETA."""

    wind_mph: float
    gust_mph: float
    rain_in_hr: float
    snow_in_hr: float


class WeatherProvider(ABC):
    """Abstract interface for weather forecasting providers."""

    @abstractmethod
    def get_weather_at_etas(
        self,
        points_with_etas: Sequence[tuple[Coordinate, datetime]],
    ) -> list[CheckpointWeather]:
        """Fetch or interpolate weather conditions for each (coordinate, ETA) pair."""
        pass
