# Weather-Aware Truck Routing

A React + Django app that helps a truck driver pick the safest route based on weather, load weight and travel time.

> Status: Phase 0 (scaffolding). Full documentation arrives in Phase 8. Design decisions are logged in [docs/DECISIONS.md](docs/DECISIONS.md).

## Quick start

### Option A: Docker (recommended)

```bash
cp .env.example .env        # optional for now; ORS key is needed from Phase 2
docker compose up --build
```

- App (Vite dev server, proxies `/api`): http://localhost:5173
- API: http://localhost:8000/api/health

Code changes hot-reload in both containers.

### Option B: without Docker

Requires Python 3.12 and Node 22+.

```bash
# Backend (terminal 1)
python -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt      # Windows: .venv\Scripts\pip
cd backend
DEBUG=true python manage.py runserver                       # Windows PowerShell: $env:DEBUG="true"

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Without `REDIS_URL` the API uses an in-memory cache.

## Checks

```bash
cd backend  && pytest && ruff check . && ruff format --check .
cd frontend && npm run lint && npm test && npm run build
```

## Environment variables

See [.env.example](.env.example). No secrets are committed.
