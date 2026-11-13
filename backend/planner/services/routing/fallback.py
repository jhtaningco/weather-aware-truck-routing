"""Fallback routing provider combining primary and secondary backends."""

import logging

from ..geometry import Coordinate
from .base import RawRoute, RoutingProvider

logger = logging.getLogger(__name__)


class FallbackRoutingProvider(RoutingProvider):
    """Attempts to use the primary provider; on missing configuration or failure, falls back."""

    def __init__(self, primary: RoutingProvider, fallback: RoutingProvider):
        self.primary = primary
        self.fallback = fallback

    def get_routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        load_lb: float = 0.0,
        preference: str = "recommended",
        via: Coordinate | None = None,
        alternatives: int = 0,
    ) -> list[RawRoute]:
        """Attempt primary provider first, falling back to secondary on failure."""
        try:
            routes = self.primary.get_routes(
                origin=origin,
                destination=destination,
                load_lb=load_lb,
                preference=preference,
                via=via,
                alternatives=alternatives,
            )
            if routes:
                return routes
        except Exception as exc:
            logger.info(
                "Primary routing provider unavailable (%s); falling back to secondary provider.",
                exc,
            )

        return self.fallback.get_routes(
            origin=origin,
            destination=destination,
            load_lb=load_lb,
            preference=preference,
            via=via,
            alternatives=alternatives,
        )
