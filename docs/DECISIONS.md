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
