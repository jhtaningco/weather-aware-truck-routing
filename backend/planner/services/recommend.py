"""Pure recommendation service: lexicographic ranking and explanation generation."""

import math
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cmp_to_key


@dataclass
class RouteScore:
    """Input representation of a route's risk and duration metrics."""

    route_id: str
    label: str
    miles_by_risk: dict[str, float]
    avg_risk: float
    duration_s: float


@dataclass(frozen=True)
class Tolerances:
    """Tolerances to avoid sorting on negligible floating-point differences."""

    miles: float = 0.01
    avg_risk: float = 0.001
    duration_s: float = 1.0

    def __post_init__(self) -> None:
        if math.isnan(self.miles) or self.miles <= 0:
            raise ValueError("miles tolerance must be a positive number")
        if math.isnan(self.avg_risk) or self.avg_risk <= 0:
            raise ValueError("avg_risk tolerance must be a positive number")
        if math.isnan(self.duration_s) or self.duration_s <= 0:
            raise ValueError("duration_s tolerance must be a positive number")


@dataclass
class RankedRoute:
    """Route enriched with rank and explanation reasons."""

    route_id: str
    label: str
    miles_by_risk: dict[str, float]
    avg_risk: float
    duration_s: float
    rank: int
    reasons: tuple[str, ...]


@dataclass
class RecommendationResult:
    """Final recommendation output."""

    route_id: str
    recommended_route: RankedRoute
    ranking: list[RankedRoute]
    explanation: str
    recommended_blocked: bool
    all_blocked: bool


def _fmt_miles(val: float) -> str:
    rounded = round(val)
    if abs(val - rounded) < 1e-4:
        return str(int(rounded))
    return f"{val:.2f}".rstrip("0").rstrip(".")


def _fmt_duration(seconds: float) -> str:
    total_secs = max(0.0, seconds)
    hours = int(total_secs // 3600)
    mins = int(round((total_secs % 3600) / 60))
    if mins == 60:
        hours += 1
        mins = 0
    if hours > 0 and mins > 0:
        return f"{hours} h {mins} min"
    if hours > 0:
        return f"{hours} h"
    return f"{mins} min"


def _severe_or_worse(r: RouteScore) -> float:
    return r.miles_by_risk.get("severe", 0.0) + r.miles_by_risk.get("no_travel", 0.0)


def _compare_two_routes(r1: RouteScore, r2: RouteScore, tol: Tolerances) -> tuple[int, str]:
    """Compare r1 and r2.

    Returns:
        (diff_flag, decided_by)
        diff_flag: -1 if r1 < r2 (r1 preferred), 1 if r1 > r2, 0 if tied
    """
    # 1. Severe-or-worse miles
    s1 = _severe_or_worse(r1)
    s2 = _severe_or_worse(r2)
    if abs(s1 - s2) > tol.miles:
        return (-1 if s1 < s2 else 1), "severe"

    # 2. High miles
    h1 = r1.miles_by_risk.get("high", 0.0)
    h2 = r2.miles_by_risk.get("high", 0.0)
    if abs(h1 - h2) > tol.miles:
        return (-1 if h1 < h2 else 1), "high"

    # 3. Average risk
    a1 = r1.avg_risk
    a2 = r2.avg_risk
    if abs(a1 - a2) > tol.avg_risk:
        return (-1 if a1 < a2 else 1), "avg_risk"

    # 4. Travel duration
    d1 = r1.duration_s
    d2 = r2.duration_s
    if abs(d1 - d2) > tol.duration_s:
        return (-1 if d1 < d2 else 1), "duration"

    return 0, "equal"


def rank_routes(
    routes: Sequence[RouteScore], tolerances: Tolerances | None = None
) -> RecommendationResult:
    """Rank routes lexicographically and produce human-readable explanations.

    Lexicographic order:
    1. Severe-or-worse miles (fewest)
    2. High miles (fewest)
    3. Average risk (lowest)
    4. Duration (shortest)
    """
    if not routes:
        raise ValueError("routes list cannot be empty")

    tol = tolerances or Tolerances()

    # Stable sort preserving original input order on ties
    def cmp_func(a: RouteScore, b: RouteScore) -> int:
        res, _ = _compare_two_routes(a, b, tol)
        return res

    sorted_routes = sorted(routes, key=cmp_to_key(cmp_func))
    winner = sorted_routes[0]

    all_blocked = all(r.miles_by_risk.get("no_travel", 0.0) > tol.miles for r in routes)
    recommended_blocked = winner.miles_by_risk.get("no_travel", 0.0) > tol.miles

    # 1. Generate explanation
    if len(routes) == 1:
        w_sev = _severe_or_worse(winner)
        w_high = winner.miles_by_risk.get("high", 0.0)
        base_explanation = (
            f"{winner.label} is the only available route: "
            f"{_fmt_miles(w_sev)} Severe miles, {_fmt_miles(w_high)} High miles."
        )
    else:
        runner_up = sorted_routes[1]
        _, decided_by = _compare_two_routes(winner, runner_up, tol)

        w_sev = _severe_or_worse(winner)
        u_sev = _severe_or_worse(runner_up)
        w_nt = winner.miles_by_risk.get("no_travel", 0.0)
        u_nt = runner_up.miles_by_risk.get("no_travel", 0.0)
        sev_term = "Severe-or-worse" if (w_nt > tol.miles or u_nt > tol.miles) else "Severe"

        w_high = winner.miles_by_risk.get("high", 0.0)
        u_high = runner_up.miles_by_risk.get("high", 0.0)

        if decided_by == "severe":
            part1 = (
                f"{winner.label} has {_fmt_miles(w_sev)} {sev_term} miles "
                f"versus {_fmt_miles(u_sev)} on {runner_up.label}"
            )
        elif decided_by == "high":
            part1 = (
                f"With Severe miles tied, {winner.label} has {_fmt_miles(w_high)} High miles "
                f"versus {_fmt_miles(u_high)} on {runner_up.label}"
            )
        elif decided_by == "avg_risk":
            part1 = (
                f"With Severe and High miles tied, {winner.label} has an average risk of "
                f"{winner.avg_risk:.2f} versus {runner_up.avg_risk:.2f} on {runner_up.label}"
            )
        elif decided_by == "duration":
            part1 = (
                f"With weather risk tied, {winner.label} takes "
                f"{_fmt_duration(winner.duration_s)} versus "
                f"{_fmt_duration(runner_up.duration_s)} on {runner_up.label}"
            )
        else:
            part1 = f"{winner.label} is equivalent to {runner_up.label}"

        if decided_by == "duration":
            base_explanation = f"{part1}."
        else:
            fastest_dur = min(r.duration_s for r in routes)
            if winner.duration_s <= fastest_dur + tol.duration_s:
                time_clause = "also the fastest route"
            else:
                diff = winner.duration_s - fastest_dur
                time_clause = f"{_fmt_duration(diff)} slower than the fastest route"
            base_explanation = f"{part1}; {time_clause}."

    if all_blocked:
        explanation = (
            f"Do not depart / consider delaying: every route includes No Travel conditions. "
            f"{base_explanation}"
        )
    elif recommended_blocked:
        w_nt = winner.miles_by_risk.get("no_travel", 0.0)
        explanation = (
            f"{base_explanation} "
            f"Warning: {winner.label} still includes {_fmt_miles(w_nt)} miles of "
            f"No Travel conditions."
        )
    else:
        explanation = base_explanation

    # 2. Build RankedRoute items with reasons
    ranking: list[RankedRoute] = []
    for rank_idx, r in enumerate(sorted_routes, start=1):
        if rank_idx == 1:
            reasons = ("Recommended route: lowest weather risk",)
        else:
            # Compare r to winner
            _, sep = _compare_two_routes(winner, r, tol)
            r_sev = _severe_or_worse(r)
            w_sev = _severe_or_worse(winner)
            r_nt = r.miles_by_risk.get("no_travel", 0.0)
            w_nt = winner.miles_by_risk.get("no_travel", 0.0)
            term = "Severe-or-worse" if (r_nt > tol.miles or w_nt > tol.miles) else "Severe"

            r_high = r.miles_by_risk.get("high", 0.0)
            w_high = winner.miles_by_risk.get("high", 0.0)

            if sep == "severe":
                reason_text = (
                    f"{r.label} has {_fmt_miles(r_sev)} {term} miles "
                    f"versus {_fmt_miles(w_sev)} on {winner.label}"
                )
            elif sep == "high":
                reason_text = (
                    f"{r.label} has {_fmt_miles(r_high)} High miles "
                    f"versus {_fmt_miles(w_high)} on {winner.label}"
                )
            elif sep == "avg_risk":
                reason_text = (
                    f"{r.label} has an average risk of {r.avg_risk:.2f} "
                    f"versus {winner.avg_risk:.2f} on {winner.label}"
                )
            elif sep == "duration":
                reason_text = (
                    f"{r.label} takes {_fmt_duration(r.duration_s)} "
                    f"versus {_fmt_duration(winner.duration_s)} on {winner.label}"
                )
            else:
                reason_text = f"{r.label} is equivalent to {winner.label} and listed after it"
            reasons = (reason_text,)

        ranking.append(
            RankedRoute(
                route_id=r.route_id,
                label=r.label,
                miles_by_risk=dict(r.miles_by_risk),
                avg_risk=r.avg_risk,
                duration_s=r.duration_s,
                rank=rank_idx,
                reasons=reasons,
            )
        )

    return RecommendationResult(
        route_id=winner.route_id,
        recommended_route=ranking[0],
        ranking=ranking,
        explanation=explanation,
        recommended_blocked=recommended_blocked,
        all_blocked=all_blocked,
    )
