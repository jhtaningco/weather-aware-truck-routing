"""Risk engine tests: every band boundary, every load rule, and the invariants."""

import itertools
import math

import pytest

from planner.services.risk import (
    RiskLevel,
    apply_load_rules,
    assess_checkpoint,
    classify_rain,
    classify_snow,
    classify_wind,
)

L, M, H, S, N = (
    RiskLevel.LOW,
    RiskLevel.MODERATE,
    RiskLevel.HIGH,
    RiskLevel.SEVERE,
    RiskLevel.NO_TRAVEL,
)


def assess(wind=0.0, rain=0.0, snow=0.0, load=0):
    return assess_checkpoint(wind_mph=wind, rain_in_hr=rain, snow_in_hr=snow, load_lb=load)


# --------------------------------------------------------------------------- levels


def test_levels_are_ordinal_0_to_4():
    assert [int(level) for level in (L, M, H, S, N)] == [0, 1, 2, 3, 4]


def test_level_labels_and_keys():
    assert N.label == "No Travel"
    assert N.key == "no_travel"
    assert L.label == "Low"
    assert S.key == "severe"


# ------------------------------------------------------------------------ wind bands

WIND_CASES = [
    (0, L),
    (24.9, L),
    (25, M),  # lower bound inclusive
    (25.1, M),
    (34.9, M),
    (35, H),
    (35.1, H),
    (44.9, H),
    (45, S),
    (45.1, S),
    (54.9, S),
    (55, N),  # >= 55 is No Travel
    (55.1, N),
    (120, N),
]


@pytest.mark.parametrize(("mph", "expected"), WIND_CASES)
def test_wind_bands(mph, expected):
    assert classify_wind(mph) == expected


# ------------------------------------------------------------------------ rain bands

RAIN_CASES = [
    (0, L),
    (0.09, L),
    (0.10, M),  # lower bound inclusive
    (0.11, M),
    (0.24, M),
    (0.25, H),
    (0.26, H),
    (0.49, H),
    (0.50, S),
    (0.51, S),
    (0.99, S),
    (1.00, S),  # exactly 1.00 is Severe, not No Travel
    (1.01, N),  # strictly greater than 1.00 is No Travel
    (3.0, N),
]


@pytest.mark.parametrize(("in_hr", "expected"), RAIN_CASES)
def test_rain_bands(in_hr, expected):
    assert classify_rain(in_hr) == expected


# ------------------------------------------------------------------------ snow bands

SNOW_CASES = [
    (0, L),
    (0.4, L),
    (0.5, M),  # lower bound inclusive
    (0.6, M),
    (0.9, M),
    (1.0, H),
    (1.1, H),
    (1.9, H),
    (2.0, S),
    (2.1, S),
    (2.9, S),
    (3.0, S),  # exactly 3.0 is Severe, not No Travel
    (3.01, N),  # strictly greater than 3.0 is No Travel
    (8.0, N),
]


@pytest.mark.parametrize(("in_hr", "expected"), SNOW_CASES)
def test_snow_bands(in_hr, expected):
    assert classify_snow(in_hr) == expected


# ------------------------------------------------------- float noise and bad inputs


def test_float_summation_noise_does_not_flip_a_boundary():
    # rain is rain + showers, so a sum can land a hair off the boundary it should hit
    assert classify_rain(0.5 - 1e-9) == S
    assert classify_rain(1.0 + 1e-9) == S
    assert classify_snow(3.0 + 1e-9) == S
    assert classify_wind(55 - 1e-9) == N


@pytest.mark.parametrize("fn", [classify_wind, classify_rain, classify_snow])
@pytest.mark.parametrize("bad", [-0.1, math.nan, math.inf, -math.inf])
def test_classifiers_reject_invalid_values(fn, bad):
    with pytest.raises(ValueError):
        fn(bad)


@pytest.mark.parametrize("bad", [-1, math.nan, math.inf])
def test_negative_or_non_finite_load_is_rejected(bad):
    with pytest.raises(ValueError):
        assess(wind=40, load=bad)


# ------------------------------------------------------------------------ load rules


def test_wind_55_or_more_is_no_travel_for_any_load():
    for load in (0, 1_000, 30_000, 80_000):
        result = assess(wind=55, load=load)
        assert result.level == N
        assert result.load_escalated is False  # the base level already says No Travel


def test_wind_45_to_55_with_load_over_30000_is_no_travel():
    heavy = assess(wind=50, load=30_001)
    assert heavy.level == N
    assert heavy.base_level == S
    assert heavy.load_escalated is True


def test_30000_lb_exactly_does_not_trigger_the_no_travel_rule():
    result = assess(wind=50, load=30_000)
    assert result.level == S
    assert result.load_escalated is False


@pytest.mark.parametrize("wind", [45, 54.9])
def test_no_travel_rule_covers_the_whole_45_to_55_band(wind):
    assert assess(wind=wind, load=30_001).level == N
    assert assess(wind=wind, load=30_000).level == S


def test_wind_35_to_45_with_load_over_40000_is_at_least_severe():
    heavy = assess(wind=40, load=40_001)
    assert heavy.level == S
    assert heavy.base_level == H
    assert heavy.load_escalated is True


def test_40000_lb_exactly_does_not_trigger_the_severe_rule():
    result = assess(wind=40, load=40_000)
    assert result.level == H
    assert result.load_escalated is False


def test_severe_rule_does_not_apply_between_30000_and_40000_lb_below_45_mph():
    assert assess(wind=44.9, load=35_000).level == H


def test_severe_rule_starts_at_exactly_35_mph():
    assert assess(wind=35, load=40_001).level == S
    assert assess(wind=34.9, load=40_001).level == M  # no escalation below 35


def test_heavy_load_in_calm_weather_stays_low():
    result = assess(wind=10, load=80_000)
    assert result.level == L
    assert result.load_escalated is False


def test_load_rule_does_not_lower_or_double_count_when_already_severe():
    # base is already Severe from rain, so "at least Severe" changes nothing
    result = assess(wind=40, rain=0.6, load=45_000)
    assert result.base_level == S
    assert result.level == S
    assert result.load_escalated is False


@pytest.mark.parametrize(
    ("wind", "load", "base", "expected"),
    [
        (40, 45_000, H, S),
        (40, 45_000, N, N),
        (50, 31_000, S, N),
        (50, 31_000, N, N),
        (20, 90_000, L, L),
        (40, 10_000, M, M),
    ],
)
def test_apply_load_rules_directly(wind, load, base, expected):
    assert apply_load_rules(wind_mph=wind, load_lb=load, base=base) == expected


# ---------------------------------------------------------------- combined conditions


def test_base_risk_is_the_maximum_of_the_three_conditions():
    result = assess(wind=30, rain=0.30, snow=0.6)  # Moderate, High, Moderate
    assert (result.wind, result.rain, result.snow) == (M, H, M)
    assert result.level == H


def test_high_wind_plus_snow():
    result = assess(wind=40, snow=2.5, load=20_000)  # High wind, Severe snow
    assert result.level == S
    assert result.drivers == ("snow",)


def test_snow_can_push_a_calm_wind_trip_to_no_travel():
    result = assess(wind=5, snow=3.5)
    assert result.level == N
    assert result.drivers == ("snow",)


# -------------------------------------------------------------------------- drivers


def test_no_weather_has_no_drivers():
    result = assess()
    assert result.level == L
    assert result.drivers == ()


def test_drivers_list_every_condition_at_the_base_level():
    result = assess(wind=40, rain=0.3, snow=0.1)  # wind High, rain High, snow Low
    assert result.drivers == ("wind", "rain")


def test_load_escalation_is_added_to_drivers():
    result = assess(wind=40, load=45_000)
    assert result.drivers == ("wind", "load")


def test_wind_is_always_a_driver_when_a_load_rule_escalates():
    result = assess(wind=50, rain=0.1, load=35_000)
    assert result.level == N
    assert result.drivers == ("wind", "load")


def test_gusts_are_not_an_input():
    # sustained wind only: assess_checkpoint has no gust parameter
    with pytest.raises(TypeError):
        assess_checkpoint(  # type: ignore[call-arg]
            wind_mph=10, rain_in_hr=0, snow_in_hr=0, load_lb=0, gust_mph=70
        )


# ------------------------------------------------------------------------ invariants

WINDS = [0, 20, 25, 34.9, 35, 40, 44.9, 45, 50, 54.9, 55, 70]
RAINS = [0, 0.1, 0.3, 0.5, 1.0, 1.5]
SNOWS = [0, 0.5, 1.5, 2.5, 3.5]
LOADS = [0, 20_000, 30_000, 30_001, 40_000, 40_001, 80_000]


def test_load_rules_never_lower_risk():
    for wind, rain, snow, load in itertools.product(WINDS, RAINS, SNOWS, LOADS):
        result = assess(wind=wind, rain=rain, snow=snow, load=load)
        assert result.level >= result.base_level
        assert result.level >= max(result.wind, result.rain, result.snow)
        assert result.load_escalated == (result.level > result.base_level)


def test_more_load_never_means_less_risk():
    for wind, rain, snow in itertools.product(WINDS, RAINS, SNOWS):
        levels = [assess(wind=wind, rain=rain, snow=snow, load=load).level for load in LOADS]
        assert levels == sorted(levels)
