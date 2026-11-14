# Loom Walkthrough Script: Conversational Demo Edition

* **Presenter:** Gian Adoc
* **Company:** Spotter.AI
* **Role:** Remote Full Stack Engineer (React + Django, AI Systems)
* **Target Duration:** 5 to 6 minutes
* **Live App URL:** `http://localhost:5173`

---

## Quick Recording Checklist Before You Hit Record
1. Have `http://localhost:5173` open in your browser (clean state, refreshed).
2. Have your terminal open in another tab with the virtual environment activated (`cd backend`).
3. Take a breath, speak naturally with good energy, and treat it like a friendly product demo for fellow engineers!

---

## The Walkthrough

### Part 1: The Hook & Introduction (0:00 – 0:50)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| Start directly on the live web app at `http://localhost:5173`. Move your mouse slightly over the clean dashboard. | *"Hey Spotter.AI team! I’m Gian, and I’m excited to show you my **Weather-Aware Truck Routing** platform.*<br/><br/>*Standard consumer navigation like Google Maps optimizes for the shortest drive time. But for commercial freight dispatchers and heavy trucks, a 45 mph crosswind or an unexpected ice storm isn't just an inconvenience—it's a catastrophic rollover risk.*<br/><br/>*This application solves that by finding 3 distinct heavy-vehicle routes, calculating exact weather along the highway at each checkpoint's arrival time, applying vehicle load safety rules, and giving dispatchers an interactive 48-hour corridor weather radar."* |

---

### Part 2: Generating Routes & The 4-Step Safety Ranking (0:50 – 2:10)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| 1. Type `Dallas` in Origin $\rightarrow$ click `Dallas, TX`.<br/>2. Type `Denver` in Destination $\rightarrow$ click `Denver, CO`.<br/>3. Leave Load at `35,000 lb`, interval at `25 miles`.<br/>4. Click **Find Safest Route**. | *"Let’s plan a run from Dallas to Denver. Notice the debounced autocomplete with 24-hour geocoding caching.*<br/><br/>*When I click 'Find Safest Route', the backend queries our routing engine and generates 3 distinct highway paths. We run a spatial deduplication filter so drivers see 3 genuinely distinct options across Texas and Colorado, not identical routes with minor street detours.*<br/><br/>*On the map, Route A is rendered as our thick brand-blue polyline, Route B in solid slate, and Route C in dashed sky blue."* |
| Point to the **Recommendation Banner** above the route cards. | *"Notice our top recommendation banner: **Why did Route A win?***<br/><br/>*In trucking, you can't just use a simple 'average weather' score, because a route with 700 miles of sunshine and 10 miles of a deadly blizzard has a great average, but it could kill the driver.*<br/><br/>*Instead, our recommendation engine uses a strict 4-step hierarchy:*<br/>*1. Fewest Severe miles first (avoid rollovers).*<br/>*2. Fewest High-risk miles second.*<br/>*3. Lowest overall average risk third.*<br/>*4. And travel time last!*<br/><br/>*Since Route A and Route B were tied with zero severe miles and identical low risk, the engine dropped to Step 4 and chose Route A because it saves 51 minutes of driving time."* |

---

### Part 3: Inspecting Checkpoints & Weather at ETA (2:10 – 3:15)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| Click on a circular checkpoint marker along Route A (e.g. around Mile 250 or 400). | *"Let’s inspect a checkpoint right on the highway.*<br/><br/>*Notice what’s happening here: We don't just look up today's weather. We calculate the truck's cumulative driving time along the actual road segments to find the estimated arrival ETA at this specific milestone.*<br/><br/>*Then we fetch batched forecasts from Open-Meteo and linearly interpolate the exact sustained wind, gusts, and precipitation expected when the truck arrives at that hour."* |
| Hover over the **Stacked Risk Bar** on the Route Cards in the left sidebar. | *"Over in the sidebar, every route card has a stacked risk bar showing the exact mileage distribution across all 5 risk tiers. Drivers also get immediate weather highlights right on the card—like maximum sustained wind and road surface conditions."* |

---

### Part 4: Vehicle Load Escalation Rules in Action (3:15 – 4:15)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| 1. In `TripForm`, change the **Load Weight** from `35,000 lb` to `42,000 lb`.<br/>2. Click **Find Safest Route** again.<br/>3. Click a checkpoint that has high wind (e.g. in Colorado/New Mexico). | *"Now let's see one of the most critical safety features: **Vehicle Load Escalation Rules**.*<br/><br/>*High crosswinds affect loaded trucks differently. When wind speeds are between 35 and 45 mph, an empty truck might only be at High risk, but a truck hauling over 40,000 pounds is at severe risk of tipping.*<br/><br/>*I just re-calculated with 42,000 pounds. Notice this checkpoint popup: it explicitly alerts the driver with a red banner that vehicle load plus sustained wind escalated this segment directly to Severe risk. The system protects drivers before they even leave the depot."* |

---

### Part 5: The 48-Hour Weather Radar & Timeline Slider (4:15 – 5:15)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| 1. Point to the floating **48-Hour Forecast Timeline Slider** at the bottom.<br/>2. Point to the multi-colored mini sparkline strip right above the slider. | *"Now let's look at the corridor weather heatmap.*<br/><br/>*Notice this mini risk sparkline directly above the slider. At a single glance, a fleet dispatcher can see which future hours have storm or wind activity along the corridor without having to manually scrub through all 48 hours.*<br/><br/>*Clear, safe weather is kept completely transparent so roads remain clean, while active storm and wind hazards glow as soft Doppler radar bands."* |
| Click the **Play ▶️** button on the slider. Watch it advance through the hours. Drag it manually with your mouse. | *"When I click Play, the timeline advances through the next 48 hours at a butter-smooth 60 frames per second. Because this is drawn on a high-performance HTML5 canvas layer, scrubbing happens in under 5 milliseconds with zero network requests and zero Leaflet DOM lag."* |
| Click the **Full Map** button in the top navigation bar. | *"Dispatchers on dual monitors can also click 'Full Map' to collapse the sidebar and view the entire corridor in full-screen mode, with a floating recenter button to reframe the routes anytime."* |

---

### Part 6: Architecture, Zero-Config & Test Suite (5:15 – 6:00)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| Switch to your terminal window. | *"Under the hood, this was built with zero third-party API dependencies:*<br/>*- If an OpenRouteService API key is present, it uses full HGV truck profiling.*<br/>*- If no key is set, it automatically falls back to OSRM with zero configuration, so anyone can clone the repo and run it instantly.*<br/>*- Weather is batched and cached with smart 1-hour TTLs.*" |
| Run: `pytest` in terminal (shows 174 passed).<br/>Run: `npm test` in `frontend` (shows 14 passed). | *"Testing was central from Day 1:*<br/>*- Our backend test suite has **174 unit and integration tests** passing in ~3 seconds, covering every single float boundary and load rule condition.*<br/>*- Our frontend has **14 Vitest unit tests** with 100% clean TypeScript and ESLint.*<br/>*- The entire stack is packaged into a production multi-stage Dockerfile where WhiteNoise serves the compiled React SPA directly alongside Django."* |

---

### Part 7: Conclusion & Sign-Off (6:00 – 6:15)

| 🖥️ On Screen | 🗣️ What You Say |
| :--- | :--- |
| Flip back to the browser on the beautiful map view with a smile. | *"Every architectural decision and trade-off is documented in `README.md` and `docs/DECISIONS.md`.*<br/><br/>*Thank you for your time and for reviewing my project. I really enjoyed building this, and I look forward to speaking with the Spotter.AI engineering team!*<br/><br/>*Have a great day!"* |

---

## 💡 Quick Tips for a Great Recording
- **Don't restart if you make a tiny slip of the tongue**—just pause for half a second, correct yourself, and keep going naturally! Real engineers appreciate authenticity over robotic perfection.
- **Keep your mouse movements steady**: when pointing to a checkpoint or button, hover over it for a second so the reviewer's eyes can follow.
- **Smile when you say your intro and sign-off**—it instantly comes through in your voice tone.
