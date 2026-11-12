# Decisions

One short entry per decision. Newest at the bottom.

## D-001: The assessment is the source of truth
The assessment document (`fs-assessment-spotter.docx`) wins over the build plan wherever the two differ. Conflicts are flagged and resolved with the project owner, then recorded here.

## D-002: Ranking order and the meaning of "Severe miles"
The assessment ranks routes by fewest Severe miles, then fewest High miles, then lowest average risk, then shortest travel time. It never says how No Travel miles count.

- **Decision:** "Severe miles" means Severe plus No Travel miles (Severe or worse). Without this, a route that is entirely No Travel would have 0 Severe miles and could win.
- The order is otherwise exactly the assessment's. There is no separate No Travel sort key.
- Tie tolerances are floating-point only (about 0.01 mile and 0.001 risk points), so real differences are never ignored.
- A route with No Travel segments is flagged prominently in the UI. The flag does not change its rank.
- Status: this is our interpretation, not stated in the assessment.

## D-003: Stack
React 18 + Vite + TypeScript + MUI on the frontend. Django 5.2 LTS + DRF on the backend. SQLite for storage. Redis cache when `REDIS_URL` is set, otherwise local-memory cache. Docker Compose for dev, one multi-stage image for production.

- Django's built-in `RedisCache` is used, so only the `redis` client package is needed. No `django-redis`.
- Settings are read from environment variables through a small helper. No `django-environ`.
- UI is MUI only, themed through `createTheme`. No Tailwind, no copied template code.

## D-004: Departure time zone
The date picker uses the browser's time zone. The API receives ISO-8601 with an offset, and the UI always shows a time zone label.

## D-005: Heatmap rendering
A custom canvas layer in the exact risk palette, with no `leaflet.heat`. `leaflet.heat` blends by density, which cannot represent categorical risk colors faithfully. To be confirmed again in Phase 6.

## D-006: Library versions pinned in Phase 0
- MUI `@mui/material` 9.x. Its peer dependencies allow React 17, 18 and 19, so React 18 stays as specified. MUI 9 no longer accepts system props such as `fontWeight` on `Typography`, so weights are set once in `theme.typography` and other styling goes through `sx`.
- Vite 8, TypeScript 6, ESLint 10, Vitest 5. `npm ci` from the committed lockfile reproduces these.
- Backend uses version ranges in `requirements.txt` (Django 5.2 LTS, DRF 3.x).
- MUI X Date Pickers (Phase 4) must be checked for compatibility with MUI 9 before installing.

## D-007: Backend app list
`django.contrib.auth` is in `INSTALLED_APPS` only because DRF imports its models. There are no users, sessions or auth endpoints.

## D-008: Weather threshold boundary semantics and float snapping
- Continuous float boundaries use lower bound inclusive, upper bound exclusive:
  - Wind (mph): Low < 25, Moderate [25, 35), High [35, 45), Severe [45, 55), No Travel >= 55.
  - Rain (in/hr): Low < 0.10, Moderate [0.10, 0.25), High [0.25, 0.50), Severe [0.50, 1.00], No Travel > 1.00.
  - Snow (in/hr): Low < 0.5, Moderate [0.5, 1.0), High [1.0, 2.0), Severe [2.0, 3.0], No Travel > 3.0.
- Exactly 1.00 in/hr rain and 3.0 in/hr snow are Severe, matching the assessment table.
- A float snap tolerance of `1e-7` is used at boundaries so precision noise from summation (e.g. `rain + showers` yielding `0.5 - 1e-9`) snaps to the intended threshold.

## D-009: Sustained wind vs. gusts for risk classification
Risk classification and load rules evaluate sustained 10-meter wind speed (`wind_speed_10m`). Wind gusts (`wind_gusts_10m`) are informational and displayed in checkpoint popups, but do not alter the risk classification or trigger load escalations.

## D-010: Vehicle load rule escalation
- Load rules only raise risk, never lower it.
- Wind >= 55 mph -> No Travel for all loads.
- Wind in [45, 55) mph and load > 30,000 lb -> No Travel (escalated from Severe). Exactly 30,000 lb does not trigger.
- Wind in [35, 45) mph and load > 40,000 lb -> at least Severe (escalated from High). Exactly 40,000 lb does not trigger.
- Checkpoint risk drivers explicitly include `"load"` when a rule escalates the final risk beyond base weather risk.

## D-011: Recommendation ranking tolerances
Tolerances for lexicographic tie-breaking:
- Route distance differences under 0.01 miles are treated as tied.
- Average risk differences under 0.001 are treated as tied.
- Travel duration differences under 1.0 second are treated as tied.
On full ties, the original provider ordering is preserved.

## D-012: Layered 3-route generation and deduplication
- OpenRouteService `driving-hgv` profile is queried behind a `RoutingProvider` abstraction.
- Multi-layer generation strategy:
  1. Provider native alternatives (`alternative_routes: { target_count: 3 }`).
  2. Distinct request preferences (`fastest`, `shortest`, `recommended`).
  3. Perpendicular detour waypoints at corridor midpoint (left and right offsets of 25 miles).
- Deduplication: routes with >20% distance difference are automatically considered distinct; routes within 20% distance difference are deduplicated by checking whether >90% of sampled points lie within 1.0 km (~0.62 miles) of an existing route.
- If fewer than 3 distinct routes physically exist (e.g. single-highway or short trips), the system returns the distinct routes found with an explanatory note rather than hallucinating artificial routes.

## D-013: Checkpoint sampling and boundary guarantees
- Routes are sampled along cumulative haversine distance at user-specified intervals (10, 25, or 50 miles).
- Mile 0 (origin) is always the first checkpoint.
- The destination is always included. If the last intermediate checkpoint is within 0.5 miles of the destination, it is snapped directly to the destination point to avoid redundant adjacent checkpoints.

## D-014: Checkpoint ETA interpolation via step durations
- Checkpoint ETAs are derived from provider step/segment durations and distances, interpolating driving time within individual steps.
- This preserves realistic travel times (e.g. 70 mph interstate vs. 25 mph city traffic) instead of using a naive single average speed.
- Monotonicity is guaranteed, and final arrival ETA matches total route duration exactly.

## D-015: Geocoding caching and offline resilience
- Geocoding results are cached for 24 hours (`86400s`).
- When `ORS_API_KEY` is unavailable or throttled, curated coordinates for major logistics hubs (Dallas, Denver, Chicago, Atlanta, etc.) provide offline resilience during development and testing.

## D-016: Open-Meteo weather batching and linear interpolation
- Forecasts are fetched in batched coordinate requests using `wind_speed_unit=mph`, `precipitation_unit=inch`, and `timezone=UTC`.
- Rain precipitation rate is calculated as `rain + showers` (in/hr). Snow rate is `snowfall` (in/hr).
- Values at intermediate ETAs are linearly interpolated between bounding hourly forecasts. If an arrival ETA precedes the first hour or exceeds the forecast horizon, values are clamped to the nearest valid bounding hour.
- Forecast series are cached for 1 hour (`3600s`) keyed by coordinate rounded to 2 decimal places (`~1.1 km`).

## D-017: Midpoint segment-mile attribution
- Each checkpoint covers a segment of the route defined from the midpoint to the previous checkpoint to the midpoint to the next (mile 0 to first midpoint, and last midpoint to destination).
- This yields a telescoping sum where the segment miles strictly and mathematically sum to the route's total distance.
- Mileage-weighted average risk is calculated as `sum(segment_length * risk_ordinal) / total_distance`.

## D-018: DRF error response envelope
- In accordance with the Section 5 API contract, all client-facing API errors return consistent JSON objects of the shape:
  `{"error": {"code": "<string_code>", "message": "<human_message>", "details": ...}}`

## D-019: Frontend MUI 9 theme tokens and TypeScript verbatimModuleSyntax
- The UI palette precisely mirrors Section 9 and the TailAdmin reference: Primary `#465FFF`, Card radius 16px, Control radius 10px, Input height 44px, and categorical risk palette (`#12B76A`, `#FDB022`, `#F97316`, `#D92D20`, `#7A1F1F`).
- In MUI 9, direct system props on `Typography` (such as `fontWeight`) and `Stack` (`alignItems`) are handled via `sx` or theme definitions; `TextField` and `Autocomplete` use `slotProps.input`.
- In TypeScript 6 with `verbatimModuleSyntax: true`, all type-only imports require the explicit `import type` syntax to guarantee zero JS runtime emission.

## D-020: Imperative Leaflet layer management and React 18 compatibility
- Pinned `react-leaflet` to `^4.2.1` and `leaflet` to `^1.9.4` (react-leaflet v5 requires React 19; v4 maintains exact peer compatibility with React 18).
- Base tiles use Carto Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`).
- Route polylines and checkpoint markers are managed imperatively via `L.layerGroup` instances inside specialized controller components (`RouteLayers`, `CheckpointMarkers`, `WaypointMarkers`) rather than declarative React wrapper components. This avoids tearing down and rebuilding hundreds of SVG DOM nodes on user interaction or timeline changes, guaranteeing smooth 60fps interaction.
- Routes are visually distinct: Recommended (solid `#465FFF`, weight 6.5), Alternative 1 (solid slate `#475467`, weight 4), Alternative 2 (dashed sky `#0BA5EC`, weight 4, dash '8, 8').
- Checkpoint circle markers are colored by risk ordinal with rich popups exposing checkpoint mile, arrival ETA, weather variables, risk breakdown, and vehicle load rule escalation notices.
