# 🚛 Weather-Aware Commercial Truck Routing

A commercial navigation and risk classification platform that helps truck drivers and fleet dispatchers select the safest highway route based on live weather forecasts, vehicle load physics, and travel time.

Built for the **Spotter.AI Full Stack Take-Home Assessment**.

---

## 🚀 Live Demo & Links

- **Hosted Application:** [https://weather-aware-truck-routing-4rtp.onrender.com](https://weather-aware-truck-routing-4rtp.onrender.com)
- **Loom Video Walkthrough:** [Watch the Loom Demo](https://www.loom.com/share/c40b1933cb9848278b6132f4a9096c90)
- **Architecture & Technical Decisions:** [docs/DECISIONS.md](docs/DECISIONS.md)

---

## ✨ Key Features

- **3 Distinct Commercial Highway Corridors:** Generates non-overlapping routes (not minor variations) with turn-by-turn geometry.
- **Dynamic Arrival ETAs:** Computes the exact timestamp a truck reaches each checkpoint along the 800+ mile corridor, fetching weather forecasted for that exact arrival hour.
- **Official Weather Risk Matrix:** Classifies sustained wind, rain rate, and snowfall into 5 safety tiers:
  - `0 - Low (Clear Skies)` · `1 - Moderate` · `2 - High` · `3 - Severe` · `4 - No Travel`
- **Heavy Vehicle Load Physics:** Automatically escalates risk under high crosswinds when gross vehicle load exceeds `30,000 lb` and `40,000 lb`.
- **Lexicographic Route Recommendation:** Deterministic 4-level safety hierarchy:
  1. Fewest Severe miles $\rightarrow$ 2. Fewest High miles $\rightarrow$ 3. Lowest average risk $\rightarrow$ 4. Shortest travel time.
- **48-Hour Corridor Weather Radar:** Hardware-accelerated 60fps HTML5 canvas radar layer with Doppler reflectivity bands and an interactive scrubbing slider with a moving truck marker.
- **Zero-Config Fallback:** Fully operational out-of-the-box using Open-Meteo and OSRM (zero paid API keys required).

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Material UI (MUI), Emotion, Leaflet & React-Leaflet, Day.js, Vitest
- **Backend:** Python 3.12, Django 5.2 LTS, Django REST Framework, Gunicorn, WhiteNoise, Pytest
- **Routing & Weather:** Open-Meteo API (batched, hourly forecasts), OSRM & OpenRouteService (driving-hgv profile)
- **Deployment & Containers:** Multi-stage Dockerfile, Docker Compose

---

## ⚡ Quick Start

### Option 1: Docker (Recommended)

Run the full stack with a single command:

```bash
docker-compose up --build
```

- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **Django API:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option 2: Run Locally (Without Docker)

#### Prerequisites
- Python 3.11+
- Node.js 18+

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Automated Tests

The test suite covers every weather threshold, load escalation rule, ETA calculation, and recommendation ranking logic.

### Backend Tests (174 tests)
```bash
cd backend
pytest
```

### Frontend Tests (14 tests)
```bash
cd frontend
npm test
```

---

## 📐 Architecture & Decision Log

Comprehensive documentation covering corridor sampling geometry, midpoint attribution formula, zero-drift floating point accounting, and API contracts is available in **[docs/DECISIONS.md](docs/DECISIONS.md)**.
