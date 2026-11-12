"""Recommendation tests: strict lexicographic order, tolerances, ties, explanations."""

import pytest

from planner.services.recommend import RouteScore, Tolerances, rank_routes


def route(
    route_id,
    *,
    severe=0.0,
    no_travel=0.0,
    high=0.0,
    avg=0.5,
    duration_s=3600.0,
    label=None,
):
    return RouteScore(
        route_id=route_id,
        label=label or f"Route {route_id}",
        miles_by_risk={
            "low": 100.0,
            "moderate": 0.0,
            "high": high,
            "severe": severe,
            "no_travel": no_travel,
        },
        avg_risk=avg,
        duration_s=duration_s,
    )


def winner(*routes, **kwargs):
    return rank_routes(list(routes), **kwargs).route_id


def order(*routes, **kwargs):
    return [r.route_id for r in rank_routes(list(routes), **kwargs).ranking]


# ----------------------------------------------------------------- lexicographic order


def test_fewest_severe_miles_wins_even_if_slower_and_riskier_elsewhere():
    a = route("A", severe=12, high=0, avg=0.1, duration_s=3000)
    b = route("B", severe=0, high=90, avg=1.9, duration_s=9000)
    assert winner(a, b) == "B"


def test_high_miles_break_a_severe_tie():
    a = route("A", severe=5, high=30, avg=0.1, duration_s=3000)
    b = route("B", severe=5, high=10, avg=1.5, duration_s=9000)
    assert winner(a, b) == "B"


def test_average_risk_breaks_a_severe_and_high_tie():
    a = route("A", severe=5, high=10, avg=1.20, duration_s=3000)
    b = route("B", severe=5, high=10, avg=0.80, duration_s=9000)
    assert winner(a, b) == "B"


def test_travel_time_breaks_a_full_weather_tie():
    a = route("A", severe=5, high=10, avg=1.0, duration_s=5000)
    b = route("B", severe=5, high=10, avg=1.0, duration_s=4000)
    assert winner(a, b) == "B"


def test_full_ranking_of_three_routes():
    a = route("A", severe=10)
    b = route("B", severe=0, high=20)
    c = route("C", severe=0, high=5)
    assert order(a, b, c) == ["C", "B", "A"]
    ranks = {r.route_id: r.rank for r in rank_routes([a, b, c]).ranking}
    assert ranks == {"C": 1, "B": 2, "A": 3}


# ----------------------------------------------------------- Severe means Severe-or-worse


def test_no_travel_miles_count_as_severe_miles():
    # Literal "Severe only" would rank A first (0 severe). Severe-or-worse ranks B first.
    a = route("A", severe=0, no_travel=5)
    b = route("B", severe=3, no_travel=0)
    assert winner(a, b) == "B"


def test_a_route_that_is_all_no_travel_loses_to_a_route_with_some_severe():
    a = route("A", severe=0, no_travel=100)
    b = route("B", severe=10)
    assert winner(a, b) == "B"


def test_severe_and_no_travel_split_does_not_matter_for_the_same_total():
    a = route("A", severe=2, no_travel=3, duration_s=5000)
    b = route("B", severe=5, no_travel=0, duration_s=4000)
    assert winner(a, b) == "B"  # equal severe-or-worse, so time decides


# -------------------------------------------------------------------------- tolerances


def test_tiny_severe_difference_is_ignored_and_falls_to_the_next_criterion():
    a = route("A", severe=10.003, high=20)
    b = route("B", severe=10.000, high=5)
    assert winner(a, b) == "B"


def test_real_severe_difference_is_not_ignored():
    a = route("A", severe=10.1, high=0)
    b = route("B", severe=10.0, high=50)
    assert winner(a, b) == "B"


def test_tiny_average_risk_difference_falls_through_to_duration():
    a = route("A", avg=1.2004, duration_s=5000)
    b = route("B", avg=1.2000, duration_s=4000)
    assert winner(a, b) == "B"


def test_sub_second_duration_difference_is_a_full_tie_and_keeps_input_order():
    a = route("A", duration_s=3600.4)
    b = route("B", duration_s=3600.0)
    assert order(a, b) == ["A", "B"]
    assert order(b, a) == ["B", "A"]


def test_tolerances_are_configurable():
    a = route("A", severe=10.5, high=0)
    b = route("B", severe=10.0, high=50)
    assert winner(a, b) == "B"
    assert winner(a, b, tolerances=Tolerances(miles=1.0)) == "A"


@pytest.mark.parametrize("field", ["miles", "avg_risk", "duration_s"])
def test_tolerances_must_be_positive(field):
    with pytest.raises(ValueError):
        Tolerances(**{field: 0})


# ------------------------------------------------------------------------------- ties


def test_full_tie_keeps_the_first_route_as_recommended():
    a, b, c = route("A"), route("B"), route("C")
    assert order(a, b, c) == ["A", "B", "C"]


def test_inputs_are_not_mutated():
    routes = [route("B", severe=5), route("A", severe=0)]
    rank_routes(routes)
    assert [r.route_id for r in routes] == ["B", "A"]


def test_empty_input_raises():
    with pytest.raises(ValueError):
        rank_routes([])


# ------------------------------------------------------------------------ explanations


def test_explanation_matches_the_assessment_style_example():
    a = route("A", severe=12, duration_s=3600)
    b = route("B", severe=0, duration_s=3600 + 18 * 60)
    result = rank_routes([a, b])
    assert result.route_id == "B"
    assert result.explanation == (
        "Route B has 0 Severe miles versus 12 on Route A; 18 min slower than the fastest route."
    )


def test_explanation_says_when_the_winner_is_also_the_fastest():
    a = route("A", severe=12, duration_s=5000)
    b = route("B", severe=0, duration_s=4000)
    assert rank_routes([a, b]).explanation == (
        "Route B has 0 Severe miles versus 12 on Route A; also the fastest route."
    )


def test_explanation_for_a_high_miles_decision_names_the_tie():
    a = route("A", severe=4, high=30)
    b = route("B", severe=4, high=10)
    text = rank_routes([a, b]).explanation
    assert text.startswith("With Severe miles tied, Route B has 10 High miles versus 30 on Route A")


def test_explanation_for_an_average_risk_decision():
    a = route("A", high=10, avg=1.234)
    b = route("B", high=10, avg=0.8)
    text = rank_routes([a, b]).explanation
    assert text.startswith(
        "With Severe and High miles tied, Route B has an average risk of 0.80 versus 1.23"
        " on Route A"
    )


def test_explanation_for_a_duration_decision():
    a = route("A", duration_s=5400)
    b = route("B", duration_s=3600)
    text = rank_routes([a, b]).explanation
    assert text.startswith("With weather risk tied, Route B takes 1 h versus 1 h 30 min on Route A")


def test_explanation_uses_severe_or_worse_wording_when_no_travel_is_involved():
    a = route("A", severe=0, no_travel=5)
    b = route("B", severe=3)
    text = rank_routes([a, b]).explanation
    assert text.startswith("Route B has 3 Severe-or-worse miles versus 5 on Route A")


def test_explanation_for_a_single_route():
    result = rank_routes([route("A", severe=2, high=7.5)])
    assert result.route_id == "A"
    assert (
        result.explanation == "Route A is the only available route: 2 Severe miles, 7.5 High miles."
    )
    assert result.ranking[0].rank == 1


def test_duration_formatting_in_the_slower_than_fastest_clause():
    a = route("A", severe=9, duration_s=3600)
    b = route("B", severe=0, duration_s=3600 + 75 * 60)
    assert rank_routes([a, b]).explanation.endswith("1 h 15 min slower than the fastest route.")


def test_every_route_gets_a_reason():
    a = route("A", severe=12)
    b = route("B", severe=0)
    c = route("C", severe=0, high=9)
    result = rank_routes([a, b, c])
    by_id = {r.route_id: r for r in result.ranking}
    assert all(r.reasons for r in result.ranking)
    assert by_id["A"].reasons == ("Route A has 12 Severe miles versus 0 on Route B",)
    assert by_id["C"].reasons == ("Route C has 9 High miles versus 0 on Route B",)


def test_fully_tied_routes_say_so_in_their_reason():
    result = rank_routes([route("A"), route("B")])
    assert result.ranking[1].reasons == ("Route B is equivalent to Route A and listed after it",)


# ------------------------------------------------------------------- No Travel handling


def test_recommended_route_with_no_travel_is_flagged_but_not_reranked():
    a = route("A", severe=20)  # no No Travel, but 20 severe-or-worse miles
    b = route("B", no_travel=4)  # 4 severe-or-worse miles, all No Travel
    result = rank_routes([a, b])
    assert result.route_id == "B"
    assert result.recommended_blocked is True
    assert result.all_blocked is False
    assert "Warning: Route B still includes 4 miles of No Travel conditions." in result.explanation


def test_when_every_route_is_blocked_a_result_is_still_returned_and_flagged():
    a = route("A", no_travel=30)
    b = route("B", no_travel=10)
    result = rank_routes([a, b])
    assert result.route_id == "B"
    assert result.all_blocked is True
    assert result.recommended_blocked is True
    assert result.explanation.startswith(
        "Do not depart / consider delaying: every route includes No Travel conditions."
    )
    assert [r.route_id for r in result.ranking] == ["B", "A"]


def test_clear_weather_is_not_flagged():
    result = rank_routes([route("A"), route("B", severe=3)])
    assert result.recommended_blocked is False
    assert result.all_blocked is False
    assert "Warning" not in result.explanation
