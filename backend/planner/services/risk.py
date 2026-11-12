"""Pure risk classification engine: thresholds, load rules, and checkpoint assessment."""

import math
from dataclasses import dataclass
from enum import IntEnum

# Epsilon for float boundary snapping (e.g. 0.5 - 1e-9 -> 0.5)
_SNAP_EPSILON = 1e-7


class RiskLevel(IntEnum):
    """Ordinal risk scale 0 (Low) to 4 (No Travel)."""

    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4

    @property
    def label(self) -> str:
        return {
            RiskLevel.LOW: "Low",
            RiskLevel.MODERATE: "Moderate",
            RiskLevel.HIGH: "High",
            RiskLevel.SEVERE: "Severe",
            RiskLevel.NO_TRAVEL: "No Travel",
        }[self]

    @property
    def key(self) -> str:
        return {
            RiskLevel.LOW: "low",
            RiskLevel.MODERATE: "moderate",
            RiskLevel.HIGH: "high",
            RiskLevel.SEVERE: "severe",
            RiskLevel.NO_TRAVEL: "no_travel",
        }[self]


@dataclass(frozen=True)
class CheckpointRisk:
    """Detailed risk assessment for a single checkpoint."""

    level: RiskLevel
    base_level: RiskLevel
    wind: RiskLevel
    rain: RiskLevel
    snow: RiskLevel
    load_escalated: bool
    drivers: tuple[str, ...]


def _validate_non_negative(name: str, value: float) -> float:
    if math.isnan(value) or math.isinf(value) or value < 0:
        raise ValueError(f"{name} must be a finite non-negative number, got {value}")
    return float(value)


def _snap_to_boundary(value: float, boundaries: tuple[float, ...]) -> float:
    for b in boundaries:
        if abs(value - b) < _SNAP_EPSILON:
            return b
    return value


def classify_wind(wind_mph: float) -> RiskLevel:
    """Classify sustained wind speed in mph.

    Bands (lower-bound inclusive, upper-bound exclusive):
    < 25: Low
    [25, 35): Moderate
    [35, 45): High
    [45, 55): Severe
    >= 55: No Travel
    """
    w = _validate_non_negative("wind_mph", wind_mph)
    w = _snap_to_boundary(w, (25.0, 35.0, 45.0, 55.0))

    if w < 25.0:
        return RiskLevel.LOW
    if w < 35.0:
        return RiskLevel.MODERATE
    if w < 45.0:
        return RiskLevel.HIGH
    if w < 55.0:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_rain(rain_in_hr: float) -> RiskLevel:
    """Classify rain precipitation rate in inches/hour.

    Bands:
    < 0.10: Low
    [0.10, 0.25): Moderate
    [0.25, 0.50): High
    [0.50, 1.00]: Severe (exactly 1.00 is Severe)
    > 1.00: No Travel
    """
    r = _validate_non_negative("rain_in_hr", rain_in_hr)
    r = _snap_to_boundary(r, (0.10, 0.25, 0.50, 1.00))

    if r < 0.10:
        return RiskLevel.LOW
    if r < 0.25:
        return RiskLevel.MODERATE
    if r < 0.50:
        return RiskLevel.HIGH
    if r <= 1.00:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_snow(snow_in_hr: float) -> RiskLevel:
    """Classify snowfall rate in inches/hour.

    Bands:
    < 0.5: Low
    [0.5, 1.0): Moderate
    [1.0, 2.0): High
    [2.0, 3.0]: Severe (exactly 3.0 is Severe)
    > 3.0: No Travel
    """
    s = _validate_non_negative("snow_in_hr", snow_in_hr)
    s = _snap_to_boundary(s, (0.5, 1.0, 2.0, 3.0))

    if s < 0.5:
        return RiskLevel.LOW
    if s < 1.0:
        return RiskLevel.MODERATE
    if s < 2.0:
        return RiskLevel.HIGH
    if s <= 3.0:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def apply_load_rules(*, wind_mph: float, load_lb: float, base: RiskLevel) -> RiskLevel:
    """Apply vehicle load rules. Load rules only ever raise risk, never lower it.

    Rules:
    - Wind >= 55 mph, any load: No Travel
    - Wind in [45, 55) and load > 30,000 lb: No Travel
    - Wind in [35, 45) and load > 40,000 lb: at least Severe
    """
    w = _validate_non_negative("wind_mph", wind_mph)
    load = _validate_non_negative("load_lb", load_lb)
    w = _snap_to_boundary(w, (35.0, 45.0, 55.0))

    escalated = base

    if w >= 55.0:
        escalated = max(escalated, RiskLevel.NO_TRAVEL)
    elif w >= 45.0 and load > 30_000.0:
        escalated = max(escalated, RiskLevel.NO_TRAVEL)
    elif w >= 35.0 and load > 40_000.0:
        escalated = max(escalated, RiskLevel.SEVERE)

    return max(base, escalated)


def assess_checkpoint(
    *,
    wind_mph: float = 0.0,
    rain_in_hr: float = 0.0,
    snow_in_hr: float = 0.0,
    load_lb: float = 0.0,
) -> CheckpointRisk:
    """Assess weather risk at a checkpoint using sustained wind and load rules."""
    wind_risk = classify_wind(wind_mph)
    rain_risk = classify_rain(rain_in_hr)
    snow_risk = classify_snow(snow_in_hr)

    base_risk = max(wind_risk, rain_risk, snow_risk)
    final_risk = apply_load_rules(wind_mph=wind_mph, load_lb=load_lb, base=base_risk)

    load_escalated = final_risk > base_risk

    if load_escalated:
        drivers = ("wind", "load")
    elif base_risk > RiskLevel.LOW:
        active_drivers: list[str] = []
        if wind_risk == base_risk:
            active_drivers.append("wind")
        if rain_risk == base_risk:
            active_drivers.append("rain")
        if snow_risk == base_risk:
            active_drivers.append("snow")
        drivers = tuple(active_drivers)
    else:
        drivers = ()

    return CheckpointRisk(
        level=final_risk,
        base_level=base_risk,
        wind=wind_risk,
        rain=rain_risk,
        snow=snow_risk,
        load_escalated=load_escalated,
        drivers=drivers,
    )
