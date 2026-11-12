# Loom Walkthrough Script: Weather-Aware Truck Routing

**Presenter:** Gian Adoc  
**Role:** Remote Full Stack Engineer (React + Django, AI Systems) Take-Home Assessment  
**Company:** Spotter.AI  
**Target Duration:** 7–9 minutes  

---

## Part 1: Introduction & System Architecture (0:00 – 1:15)

### Visual
- Start on the running web application (`http://localhost:5173`) showing the clean dashboard layout.
- Briefly flip to the architecture diagram in `README.md`.

### Speaking Points
> "Hello Spotter.AI team! I’m excited to present my take-home project: **Weather-Aware Truck Routing**."  
>  
> "Commercial truck drivers face severe safety risks from high crosswinds, heavy rain, and snowfall, especially when hauling heavy freight. This system helps drivers and fleet dispatchers make data-driven routing decisions by generating 3 distinct heavy-goods-vehicle routes, sampling weather along the corridor at each checkpoint's estimated arrival time, classifying risk with load-weight escalation rules, and visualizing a 48-hour corridor weather heatmap."  
>  
> **Key Architecture Decisions:**  
> - **Frontend:** React 18, Vite, TypeScript with strict types, Material UI (theming matching the Section 9 specification and TailAdmin reference), Leaflet with imperative layer management, and TanStack Query.  
> - **Backend:** Django 5.2 LTS with Django REST Framework, Python 3.12, SQLite database with JSONField, Redis cache fallback to local memory, and WhiteNoise for single-container production deployment.  
> - **Providers:** OpenRouteService for HGV truck routing and Open-Meteo for batched hourly weather forecasts.  
> - **Guiding Principle:** Correctness and clarity prioritized over frivolous extra features.

---

## Part 2: Core User Flow & Normal Trip Planning (1:15 – 3:00)

### Visual
- In the left sidebar `TripForm`, type `Dallas` (select `Dallas, TX, United States`), then `Denver` (select `Denver, CO, United States`).
- Point to the **Departure Time** picker (showing local timezone offset).
- Point to the **Load Weight** input (e.g. `35,000 lb`) and the wind sensitivity guidance badge.
- Select `25 mi` interval. Click **Plan Safe Route**.

### Speaking Points
> "Let’s plan a trip from Dallas to Denver. Notice how the origin and destination inputs provide debounced autocomplete through our geocoding endpoint, which caches coordinates for 24 hours."  
>  
> "When I click 'Plan Safe Route', the backend executes our layered route generation pipeline:  
> 1. It requests native alternatives from OpenRouteService using the `driving-hgv` profile with vehicle load restrictions.  
> 2. It queries alternate preference profiles (`fastest`, `recommended`).  
> 3. It generates detour waypoints perpendicular to the corridor midpoint if needed.  
> 4. Crucially, it runs a spatial deduplication filter: discarding any route whose sampled points have over 90% overlap with an existing route. This guarantees that drivers see **3 genuinely distinct highway options**, not artificial duplicates."  
>  
> "Now looking at the map:  
> - We use Carto Positron light tiles with crisp styling.  
> - The **Recommended Route** is rendered as a thick solid blue line (`#465FFF`), brought forward.  
> - **Alternative 1** is solid slate (`#475467`).  
> - **Alternative 2** is dashed sky blue (`#0BA5EC`)."

---

## Part 3: Checkpoint Sampling, Weather at ETA & Risk Classification (3:00 – 4:45)

### Visual
- Click on several checkpoint circle markers along the route.
- Open the popup, point to the milestone, ETA, wind/rain/snow metrics, and drivers.
- In the sidebar, show the **Route Cards** and hover over the **Stacked Risk Bar**.

### Speaking Points
> "Let's inspect how weather and risk are calculated—this is the core 40% correctness criteria:  
>  
> 1. **Accurate ETAs:** We walk the polyline using haversine distances and place checkpoints at mile 0, every 25 miles, and at the destination. The ETA at each checkpoint is calculated using the routing engine's step durations, interpolating driving time within individual steps. We do **not** use a naive single average speed, ensuring traffic slowdowns and highway sections are realistically represented."  
>  
> 2. **Weather at ETA:** Open-Meteo coordinates are fetched in batched chunks. For each checkpoint, we linearly interpolate between the bounding hourly forecasts for sustained wind, gusts, and precipitation (`rain + showers`)."  
>  
> 3. **Segment Mileage Attribution:** Each checkpoint covers a segment defined from the midpoint to the previous checkpoint to the midpoint to the next. This forms a mathematical telescoping sum that strictly equals the exact total route distance—no arbitrary rounding drift."  
>  
> 4. **Route Stat Cards:** Notice our stacked risk bar below each card. It displays the exact mileage distribution across all 5 risk tiers (Low, Moderate, High, Severe, No Travel). Route A has zero Severe miles and a mileage-weighted average risk of 0.85, earning our top recommendation."

---

## Part 4: Vehicle Load Escalation Rules in Action (4:45 – 6:15)

### Visual
- In `TripForm`, increase the load weight to `42,000 lb`. Re-submit the trip or point to a checkpoint with wind between 35–45 mph.
- Show the checkpoint popup displaying the red alert banner: `⚠️ Load Rule Escalation: Vehicle load (42,000 lb) + sustained wind (38.5 mph) escalated risk to Severe`.
- Point out the **Recommendation Banner** at the top.

### Speaking Points
> "Now let's examine the vehicle load escalation rules specified in the assessment:  
> - Sustained wind $\ge 55\text{ mph}$ is No Travel for all vehicles.  
> - Wind between $45\text{--}55\text{ mph}$ with load $> 30,000\text{ lb}$ escalates risk directly to **No Travel**.  
> - Wind between $35\text{--}45\text{ mph}$ with load $> 40,000\text{ lb}$ escalates risk to at least **Severe**."  
>  
> "Look at this checkpoint: under normal conditions, a 38 mph wind would classify as High risk. But because our truck is hauling 42,000 lb, our risk engine escalated the checkpoint to **Severe**. The popup transparently explains the exact trigger to the driver."  
>  
> "Our recommendation engine applies a strict lexicographic ranking:  
> 1. Fewest Severe-or-worse miles (Severe + No Travel).  
> 2. Fewest High miles.  
> 3. Lowest average risk.  
> 4. Shortest duration.  
>  
> We use floating-point epsilon tolerances (0.01 mi, 0.001 risk) so precision noise never masks real differences. And if every route contains No Travel segments, the system displays a prominent 'Do Not Depart' warning banner."

---

## Part 5: 48-Hour Forecast Heatmap & Timeline Slider (6:15 – 7:45)

### Visual
- Click the **Play** button on the floating `ForecastSlider` at the bottom of the map.
- Watch the timeline smoothly advance from 0h to 48h.
- Drag the slider back and forth manually with the mouse.
- Toggle **Heatmap Off / On**.

### Speaking Points
> "Now let's look at the weather heatmap and timeline slider:  
>  
> 1. **Server-Side Corridor Grid:** Along all 3 route corridors, the backend generates perpendicular grid points at $\pm 15\text{ miles}$, deduplicates them onto a coarse grid, and caps the grid at 250 points. It fetches 49 hourly values (hours 0 to 48 from departure) in batched Open-Meteo requests and classifies every point-hour with the same risk engine."  
>  
> 2. **Client-Side Canvas Performance:** Instead of heavy DOM layers or density-blended heatmaps that distort categorical risk colors, we built a custom HTML5 canvas layer (`HeatmapLayer.tsx`). Each cell renders a soft radial gradient disc using our exact risk palette."  
>  
> 3. **Butter-Smooth 60 FPS:** As I scrub through the 48-hour timeline or click Play, the canvas re-draws in under 5 milliseconds. There are **zero network requests** during scrubbing and zero React re-render thrashing on Leaflet DOM nodes."

---

## Part 6: Test Suite & Code Quality (7:45 – 8:45)

### Visual
- Switch to terminal: run `cd backend; pytest` (show 172 passed).
- Run `cd frontend; npm test` (show 14 passed) and `npm run lint` (0 errors).
- Briefly open `docs/DECISIONS.md`.

### Speaking Points
> "Quality and testing were central from Phase 1:  
> - The risk engine was built test-first with unit tests covering every single float boundary condition (inclusive lower bounds, exclusive upper bounds, and float snapping).  
> - Backend test suite has **172 tests** passing in ~3 seconds with mocked API fixtures.  
> - Frontend has **14 vitest unit tests** covering formatters, risk token mappings, and popup generation, with 100% clean ESLint and TypeScript compilation.  
> - Every design assumption and trade-off is recorded in `docs/DECISIONS.md`."

---

## Part 7: Conclusion & Deployment (8:45 – 9:15)

### Visual
- Show the multi-stage `Dockerfile` and `docker-compose.yml`.
- End on the running web app.

### Speaking Points
> "For deployment, the entire application is packaged into a production multi-stage Dockerfile where WhiteNoise serves the compiled React SPA directly from Django with gunicorn, ready for one-click deployment to Render, Railway, or Fly.io."  
>  
> "Thank you for reviewing my assessment. I look forward to discussing the architecture and implementation details with the Spotter.AI engineering team!"
