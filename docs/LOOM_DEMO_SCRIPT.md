# Loom Walkthrough Script: Comprehensive 8–10 Minute Demo & Deep-Dive

* **Presenter:** Gian Adoc
* **Company:** Spotter.AI
* **Role:** Remote Full Stack Engineer (React + Django, AI Systems) Take-Home Assessment
* **Target Duration:** 8 to 10 minutes
* **Live App URL:** `http://localhost:5173`

---

## ⏱️ Video Pacing & Roadmap (8–10 Minutes)

```
0:00 – 1:15  | Part 1: The Commercial Freight Problem & Tech Stack Overview
1:15 – 3:00  | Part 2: Live Core Demo (Dallas → Denver, 3 Routes & 4-Step Safety Ranking)
3:00 – 4:30  | Part 3: Checkpoint Sampling, Weather at ETA & Midpoint Segment Math
4:30 – 5:45  | Part 4: The 42,000 lb Vehicle Load Escalation in Action
5:45 – 7:15  | Part 5: 48-Hour Doppler Weather Radar & 60 FPS Canvas Performance
7:15 – 8:45  | Part 6: Senior "What-If" Scenarios & Edge-Case Resilience
8:45 – 9:45  | Part 7: Test Suite, Code Quality & Production Deployment
9:45 – 10:15 | Part 8: Future Production Roadmap & Confident Sign-Off
```

---

## 🎬 Step-by-Step Script

### Part 1: The Freight Problem & Tech Stack Overview (0:00 – 1:15)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Start directly on the live web app at `http://localhost:5173`. Move your mouse slightly over the clean dashboard. | *"Hey Spotter.AI team! I’m Gian, and I’m excited to walk you through my **Weather-Aware Truck Routing** platform.*<br/><br/>*Standard consumer navigation like Google Maps optimizes for the shortest drive time. But in commercial freight, an 80,000-pound semi-truck faces life-or-death physics: a 45 mph crosswind or an unexpected ice storm isn't just an inconvenience—it's a catastrophic rollover, loss of freight, or fatal highway crash.*<br/><br/>*This application solves that by finding 3 distinct heavy-vehicle routes, calculating weather along the highway at each checkpoint's exact arrival time, applying vehicle load safety rules, and giving dispatchers an interactive 48-hour corridor weather radar."* |
| Briefly show the clean UI header with the chips (`HGV Driving Profile`, `Live Weather v1`). | *"Under the hood, I built this with a high-performance, enterprise-grade stack:*<br/>*- **Frontend:** React 18, Vite, TypeScript in strict mode, Material UI customized to the Section 9 specification, and Leaflet with a custom HTML5 canvas.*<br/>*- **Backend:** Python 3.12, Django 5.2 LTS, Django REST Framework, SQLite with JSONField, and dual Redis / Local-Memory caching.*<br/>*- **Key Philosophy:** Zero paid API dependencies—anyone can clone the repository and run it immediately out of the box with zero configuration."* |

---

### Part 2: Core User Flow & The 4-Step Safety Ranking (1:15 – 3:00)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. In Origin, type `Dallas` $\rightarrow$ click `Dallas, TX`.<br/>2. In Destination, type `Denver` $\rightarrow$ click `Denver, CO`.<br/>3. Leave Load at `35,000 lb`, interval at `25 miles`.<br/>4. Click **Find Safest Route**. | *"Let’s plan a run from Dallas to Denver. Notice the debounced autocomplete with 24-hour geocoding caching.*<br/><br/>*When I click 'Find Safest Route', the backend executes our layered route generation pipeline. Crucially, we run a **spatial deduplication filter**: discarding any candidate route whose sampled points have over 90% overlap with an existing route. This guarantees drivers see **3 genuinely distinct highway corridors**, not artificial duplicates.*<br/><br/>*On the map, Route A is our thick brand-blue polyline, Route B is solid slate, and Route C is dashed sky blue."* |
| Point to the **Recommendation Banner** above the route cards in the left panel. | *"Notice our top recommendation banner: **Why did Route A win?***<br/><br/>*In trucking, you can't just use a simple 'average weather' score. Imagine a route with 700 miles of clear sunshine, but 10 miles of a deadly blizzard. A naive average score would look great, but that 10-mile stretch could roll the truck over!*<br/><br/>*That's why the system applies a strict **4-step lexicographic safety ladder**:*<br/>*1. **Fewest Severe miles first** (eliminate rollovers and road closures).*<br/>*2. **Fewest High-risk miles second** (minimize heavy downpours and crosswinds).*<br/>*3. **Lowest average risk third** (smoothest overall drive).*<br/>*4. **Shortest duration last!***<br/><br/>*Since Route A and Route B were tied with zero severe miles and identical low risk, the engine dropped to Step 4 and chose Route A because it saves **51 minutes** of driving time."* |

---

### Part 3: Checkpoints, Weather at ETA & Segment Math (3:00 – 4:30)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Click on a circular checkpoint marker along Route A (around Mile 250 or 400). | *"Let’s click on a checkpoint right on the highway.*<br/><br/>*Notice what’s happening here: We don't just look up today's weather. We calculate the truck's cumulative driving time along the actual road segments to find the estimated arrival ETA at this specific milestone.*<br/><br/>*Then we fetch batched forecasts from Open-Meteo and linearly interpolate the exact sustained wind, gusts, and precipitation expected when the truck actually arrives at that hour."* |
| Hover over the **Stacked Risk Bar** and point out the **Weather Highlights** on the route cards. | *"Over in the sidebar, every route card features our stacked risk bar showing the exact mileage distribution across all 5 risk tiers.*<br/><br/>*To calculate those miles accurately, we use a **midpoint segment-mile attribution**: each checkpoint covers the road segment from the midpoint of the previous checkpoint to the midpoint of the next. This forms a mathematical telescoping sum that strictly equals the exact total route mileage—zero rounding drift.*<br/><br/>*Drivers also get key weather highlights right on the card—like maximum sustained wind and road surface conditions."* |

---

### Part 4: Vehicle Load Escalation Rules in Action (4:30 – 5:45)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. In `TripForm`, change **Gross Vehicle / Load Weight** from `35,000 lb` to `42,000 lb`.<br/>2. Click **Find Safest Route** again.<br/>3. Click a checkpoint in Colorado or New Mexico that encounters high wind. | *"Now let's examine one of the most critical domain safety features: **Vehicle Load Escalation Rules**.*<br/><br/>*Physics tells us that heavy loads amplify crosswind rollover danger:*<br/>*- Sustained wind over 55 mph is No Travel for all vehicles.*<br/>*- Wind between 45 and 55 mph with load over 30,000 lbs escalates risk directly to **No Travel**.*<br/>*- Wind between 35 and 45 mph with load over 40,000 lbs escalates risk to at least **Severe**.*<br/><br/>*I just re-calculated with 42,000 pounds. Notice this checkpoint popup: under normal conditions, a 38 mph wind would classify as High risk. But because this truck is hauling 42,000 lbs, our risk engine automatically escalated it to **Severe**, displaying a clear warning notice explaining the exact trigger."* |

---

### Part 5: 48-Hour Doppler Radar & 60 FPS Canvas (5:45 – 7:15)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Point to the floating **48-Hour Forecast Timeline Slider** at the bottom.<br/>2. Point to the multi-colored mini risk sparkline strip right above the slider. | *"Now let's look at the corridor weather heatmap.*<br/><br/>*Notice this mini risk sparkline directly above the slider. At a single glance, a fleet dispatcher can see which future hours have storm or wind activity along the corridor without having to manually scrub through all 48 hours.*<br/><br/>*Clear, safe weather is kept completely transparent so roads remain clean, while active storm and wind hazards glow as soft Doppler radar bands."* |
| 1. Click the **Play ▶️** button on the slider.<br/>2. Watch it advance through the hours.<br/>3. Drag the slider back and forth manually. | *"When I click Play, the timeline advances through the next 48 hours at a butter-smooth 60 frames per second.*<br/><br/>*Why does it perform so well? Because instead of creating hundreds of heavy SVG DOM nodes that thrash the browser, we built a custom HTML5 canvas layer (`HeatmapLayer.tsx`). As I scrub the slider, the canvas re-draws in under 5 milliseconds with **zero network requests** and zero Leaflet layer churn."* |
| Click the **Full Map** button in the top navigation bar.<br/>Click the **Recenter** button below the zoom controls. | *"Dispatchers on multi-monitor setups can also click 'Full Map' to collapse the sidebar and view the entire corridor full-screen, with a floating recenter button to reframe the routes anytime."* |

---

### Part 6: Senior "What-If" Scenarios & Edge Cases (7:15 – 8:45)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Stay on the map view while talking through these real-world scenarios. | *"As a senior engineer, building for the happy path is easy—resilience is handling the 'What-Ifs'. Let's walk through four critical edge cases we engineered for:*<br/><br/>*1. **What if the truck trip is very short (< 10 to 50 miles)?**<br/>If a driver plans Dallas to Fort Worth (32 miles) with a 50-mile sampling interval, a naive loop would only place Mile 0 and drop the destination. Our algorithm enforces a **short-trip guarantee**: strictly preserving both Origin (Mile 0) and Destination checkpoints with proportional segment allocation.*<br/><br/>*2. **What if an external routing API fails or rate-limits?**<br/>If an OpenRouteService API key is missing or throttled, our `FallbackRoutingProvider` automatically and transparently delegates to the Open Source Routing Machine (OSRM). The user never sees a broken screen, and evaluators don't need to sign up for paid keys.*<br/><br/>*3. **What if sustained wind is 38 mph, but gusts hit 55 mph?**<br/>In our decision log (D-009), sustained 10-meter wind governs risk classification and load rules to prevent false-alarm route diversions, while peak gusts are prominently surfaced in the checkpoint popup for driver situational awareness.*<br/><br/>*4. **What if an arrival ETA falls between two forecast hours (e.g. 2:37 PM)?**<br/>Rather than rounding to the nearest hour, the weather service performs linear interpolation between the bounding hourly forecasts, ensuring smooth, accurate weather transitions."* |

---

### Part 7: Test Suite, Code Quality & Docker Packaging (8:45 – 9:45)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Switch to your terminal window.<br/>Run: `cd backend; pytest`<br/>(Wait 3 seconds $\rightarrow$ show 174 passed). | *"Code quality and test coverage were treated as first-class citizens from Day 1:*<br/><br/>*On the backend, our risk engine, lexicographic recommender, and geometry services have **174 automated tests** passing in ~3 seconds. Every single float boundary condition—including inclusive lower bounds, exclusive upper bounds, and float snapping—is covered by unit tests."* |
| Run: `cd ../frontend; npm test`<br/>(Wait 2 seconds $\rightarrow$ show 14 passed).<br/>Run: `npm run lint` (0 errors). | *"On the frontend, we have **14 Vitest unit tests** covering formatters, risk token mappings, and popup HTML generation, with 100% clean TypeScript and ESLint.*<br/><br/>*For deployment, the app is packaged into a **multi-stage production Dockerfile**: Stage 1 compiles the Vite React SPA, and Stage 2 runs Django with Gunicorn where WhiteNoise serves the compiled static assets directly. It runs securely as an unprivileged non-root user with an automated `/api/health` probe."* |

---

### Part 8: Future Roadmap & Confident Sign-Off (9:45 – 10:15)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Flip back to the browser on the beautiful map view with a confident smile. | *"If taking this to full commercial production at Spotter.AI, the natural next steps would be integrating live telematics for dynamic in-transit rerouting, factoring in steep mountain grades, and integrating Electronic Logging Device (ELD) mandatory Hours of Service rest breaks.*<br/><br/>*Every architectural assumption, trade-off, and design choice is documented in `README.md` and `docs/DECISIONS.md`.*<br/><br/>*Thank you for your time and for reviewing my assessment. I look forward to speaking with the Spotter.AI engineering team!*<br/><br/>*Have a great day!"* |

---

## 🎯 Rehearsal Tips for Hitting 8–10 Minutes
1. **Pacing:** Don't rush! Speak at a calm, conversational presenter speed. Taking brief 1-second pauses when switching screen actions helps you hit the 8-to-10-minute sweet spot naturally.
2. **Mouse Movements:** Keep the cursor purposeful. Hover over the element you are talking about (e.g. the recommendation banner, the sparkline, the checkpoint popup) so the reviewer's eyes naturally follow.
3. **If You Stumble:** Don't restart the video! Just pause, smile, say *"Let's take a look at that..."*, and keep going. Natural confidence is far more compelling than a sterile, over-rehearsed recording.
