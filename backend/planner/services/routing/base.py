"""Abstract routing provider and domain representations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from ..eta import StepDuration
from ..geometry import Coordinate


@dataclass(frozen=True)
class RawRoute:
    """A raw route returned by a routing provider before checkpoint sampling."""

    route_id: str
    label: str
    distance_miles: float
    duration_seconds: float
    # Sequence of (lat, lon) coordinates
    geometry: tuple[Coordinate, ...]
    steps: tuple[StepDuration, ...]


class RoutingProvider(ABC):
    """Abstract interface for routing backends (e.g. OpenRouteService, Mapbox, Mock)."""

    @abstractmethod
    def get_routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        load_lb: float = 0.0,
        preference: str = "recommended",
        via: Coordinate | None = None,
        alternatives: int = 0,
    ) -> list[RawRoute]:
        """Fetch routes between origin and destination."""
        pass
