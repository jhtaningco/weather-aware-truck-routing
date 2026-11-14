# Loom Walkthrough: The Charismatic Product Pitch Edition (8–10 Minutes)

* **Presenter:** Gian Adoc
* **Company:** Spotter.AI
* **Role:** Remote Full Stack Engineer (React + Django, AI Systems)
* **Tone:** Charismatic, energetic, confident, conversational — like a world-class founding engineer / sales engineer demoing a flagship product!
* **Target Duration:** 8 to 10 minutes
* **Live App URL:** `http://localhost:5173`

---

## 🎯 The Secret to Nailing This Pitch
- **Don't recite code—tell a story!** You're pitching a safety-critical commercial platform that saves trucking companies hundreds of thousands of dollars in rollover damages.
- **Use the transitions!** Notice how each section naturally hands off to the next with phrases like *"Now, here’s where it gets really interesting..."*, *"Watch what happens when..."*, and *"Now you might be wondering..."*.
- **Keep your mouse active:** Hover over buttons, highlight cards, and click markers right as you speak about them.

---

## 🎬 The Master Script

---

### ACT 1: The Hook & The Problem (0:00 – 1:15)
*Seamless transition into: The Solution & Tech Stack*

| 🖥️ Screen Action | 🗣️ What You Say (High-Energy, Conversational Pitch) |
| :--- | :--- |
| **Start on the live dashboard at `http://localhost:5173`.**<br/><br/>Keep the mouse centered. Have the clean, beautiful map and sidebar ready. | *"Hey everyone at Spotter.AI! My name is Gian, and I’m thrilled to take you inside my **Weather-Aware Truck Routing** platform.*<br/><br/>*Now, we all use consumer GPS apps like Google Maps or Waze every day. They have one simple job: get your car to the destination in the fewest minutes possible.*<br/><br/>*But when you're a commercial fleet dispatcher managing an 80,000-pound heavy semi-truck, drive time is only half the equation. Out on the open highway, a 45-mile-per-hour crosswind, sudden freezing rain, or unexpected mountain snowfall isn't just an inconvenience—it's a catastrophic rollover, loss of cargo, and a multi-million-dollar liability.*<br/><br/>*So the challenge was clear: **How do we empower drivers and dispatchers to pick the safest possible heavy-vehicle route before they even leave the depot?***<br/><br/>*Let me show you how we solved it."* |

---

### ACT 2: Core Demo & The 3 Highway Corridors (1:15 – 2:30)
*Seamless transition into: The Decision Engine*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Click into **Origin** $\rightarrow$ type `Dallas` $\rightarrow$ select `Dallas, TX, United States`.<br/>2. Click into **Destination** $\rightarrow$ type `Denver` $\rightarrow$ select `Denver, CO, United States`.<br/>3. Point to the local departure time picker.<br/>4. Keep load at `35,000 lb`, interval at `25 miles`.<br/>5. Click **Find Safest Route**! | *"Let’s dive straight into the product. Imagine a fleet dispatcher in Dallas who needs to send freight up to Denver.*<br/><br/>*Notice how fast the autocomplete responds—we built a debounced geocoding service backed by 24-hour caching to keep the interface snappy.*<br/><br/>*Now, let’s hit **'Find Safest Route'**... and boom! Just like that, our backend layered route engine generates 3 completely distinct highway options.*<br/><br/>*Notice I said **distinct**: we don't just ask an API for 3 routes and take whatever it gives us. Our pipeline runs a spatial deduplication filter that checks coordinate overlap. If two routes share more than 90% of the same road, we discard the duplicate and find an alternative. Drivers see three genuinely different options—Route A in solid brand blue, Route B in slate, and Route C in dashed sky blue."* |

---

### ACT 3: The 4-Step Safety Ranking (2:30 – 3:45)
*Seamless transition into: Micro-Level Checkpoints*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Hover your mouse over the blue recommendation banner at the top of the route list.**<br/><br/>Toggle between Route A and Route B cards to show the interactive focus rings. | *"Now, generating three lines on a map is great. But here’s the million-dollar question: **How does a dispatcher know which route is actually the safest?***<br/><br/>*Look at our top recommendation banner: it selected **Route A**.*<br/><br/>*You might ask: why didn't we just use a simple 'average weather score'? Well, think about it: imagine Route 1 has 700 miles of clear sunshine, but 10 miles of a deadly blizzard. A naive average would say that route is 'mostly sunny'—but that 10-mile stretch could kill the driver!*<br/><br/>*That’s why we engineered a strict **4-step lexicographic safety ladder**:*<br/>*1. **Rule 1 is Catastrophe Avoidance:** The route with the fewest Severe and No-Travel miles wins immediately, period.*<br/>*2. **Rule 2 is High-Risk Mitigation:** If Severe miles are tied, look at fewest High-risk miles.*<br/>*3. **Rule 3 is Overall Smoothness:** Lowest mileage-weighted average risk.*<br/>*4. **And Rule 4 is Efficiency:** Shortest travel duration.*<br/><br/>*And look at what happened here: Route A and Route B were 100% tied on zero severe miles, and tied on average risk. So the engine dropped to Rule 4 and recommended Route A because it saves the driver **51 minutes** of driving time! Safety first, speed last."* |

---

### ACT 4: Checkpoints, Weather at ETA & Segment Math (3:45 – 5:00)
*Seamless transition into: Heavy Load Physics*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Click on a circular checkpoint marker on Route A (around Mile 250 or Mile 400).**<br/><br/>Let the clean popup open smoothly. Point out the wind speed, gusts, and ETA. | *"Now let’s zoom in, because the real secret sauce is what's happening at every single mile marker along the highway.*<br/><br/>*Let's click on this checkpoint right around Mile 250. Look at this popup:*<br/><br/>*A common rookie mistake in weather apps is looking up 'current' weather along the entire 800-mile corridor. But a truck isn't a teleporting plane—it takes 14 hours to get to Denver!*<br/><br/>*So what our backend does is calculate the truck's cumulative driving time along the actual road steps to derive its **exact estimated arrival ETA** at this specific mile. Then it queries Open-Meteo and linearly interpolates the forecasted wind speed, wind gusts, rain rate, and snowfall expected **at the exact hour the truck rolls through this spot**.*<br/><br/>*And over in the sidebar, look at our stacked risk bars and weather badges: each checkpoint covers a road segment using a midpoint formula that sums up mathematically to the exact total trip mileage with zero rounding drift."* |

---

### ACT 5: The "Wow" Factor: 42,000 lb Load Escalation (5:00 – 6:15)
*Seamless transition into: The 48-Hour Radar*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Scroll up slightly in the sidebar to `TripForm`.<br/>2. Change **Gross Vehicle / Load Weight** from `35,000 lb` to `42,000 lb`.<br/>3. Click **Find Safest Route**.<br/>4. Click on a checkpoint in Colorado or New Mexico that experiences 35–45 mph winds.<br/>5. Highlight the red **Load Rule** banner! | *"Now, you might say: 'Gian, that looks great for a standard truck. But what if we’re hauling serious heavy steel?'*<br/><br/>*Let me show you what happens when real physics takes over.*<br/><br/>*Watch this: I’m going to change the load weight from 35,000 pounds up to **42,000 pounds**. Let’s recalculate.*<br/><br/>*Look at this checkpoint popup right here in the Colorado foothills. Under normal conditions, a 38 mph sustained wind is classified as High risk. An empty truck could handle it with extra caution.*<br/><br/>*But because our truck is hauling 42,000 pounds, our vehicle load escalation rules kicked in! The risk engine automatically escalated this checkpoint directly to **Severe**, and placed a bright red warning badge right here: '⚠️ Load Rule Escalation: Vehicle load (42,000 lb) plus sustained wind escalated risk to Severe.'*<br/><br/>*The dispatcher sees this before the truck ever leaves the dock, preventing a rollover before it even has a chance to happen."* |

---

### ACT 6: The 48-Hour Doppler Weather Radar (6:15 – 7:30)
*Seamless transition into: Edge Cases & Resilience*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Point your mouse at the floating **48-Hour Forecast Timeline Slider** at the bottom.<br/>2. Hover over the multi-colored mini sparkline strip above the slider.<br/>3. Click the **Play ▶️** button and watch the animation.<br/>4. Drag the slider back and forth smoothly with your mouse.<br/>5. Click **Full Map** in the top header. | *"Now, routing for right now is only half the battle. On long-haul freight, a storm could be brewing tomorrow afternoon while your driver is still mid-trip. And that brings us to our visual centerpiece: the **48-Hour Corridor Weather Radar**.*<br/><br/>*First, look right above the slider at this mini colored sparkline strip. In one second, without clicking anything, a dispatcher can glance at this strip and immediately see which future hours have storm or wind activity.*<br/><br/>*Clear, safe weather is kept completely transparent so roads stay crisp. But when hazardous weather develops, look at how it glows on the map as an authentic, smooth Doppler radar front!*<br/><br/>*Now watch what happens when I click **Play**—or drag the slider manually with my mouse.*<br/><br/>*Notice how smooth that is? That is running at a rock-solid **60 frames per second**. Why? Because we didn't use heavy SVG DOM nodes that choke the browser. We wrote a custom HTML5 canvas layer that re-renders the entire corridor in under 5 milliseconds with **zero network requests** while scrubbing.*<br/><br/>*And if you're on a dispatch floor with dual monitors, just hit **'Full Map'** right here in the header—the sidebar tucks away, the map expands full-screen, and you have a dedicated command center."* |

---

### ACT 7: Senior "What-If" Scenarios (7:30 – 8:45)
*Seamless transition into: Tech Stack & Architecture*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| Stay on the full map view. Click the **Recenter** button below the zoom controls to smoothly reframe the view. | *"Now, as any senior engineer knows, building a happy path is easy. True production engineering is all about handling the **'What-Ifs'**. Let me highlight four real-world edge cases we designed for:*<br/><br/>*1. **What if the trip is super short?** Say, Dallas to Fort Worth—only 32 miles, which is shorter than a 50-mile sampling interval. A naive loop would drop the destination. Our algorithm guarantees both Origin Mile 0 and Destination Mile End are strictly included with proportional segment coverage.*<br/><br/>*2. **What if an external routing API goes down or hits rate limits?** We built a `FallbackRoutingProvider`. If OpenRouteService is throttled or has no API key, it seamlessly falls back to the Open Source Routing Machine (OSRM). The user never sees a broken screen, and evaluators don't need to configure a single key.*<br/><br/>*3. **What if sustained wind is 38 mph, but gusts hit 55 mph?** In our decision log, sustained wind governs risk classification and load rules to prevent false-alarm route diversions, while peak gusts are displayed transparently in the popup so the driver stays alert.*<br/><br/>*4. **What if an arrival ETA lands at 2:37 PM between two forecast hours?** Our weather service performs linear interpolation between bounding hourly forecasts so weather transitions are continuous and natural."* |

---

### ACT 8: Tech Stack, Test Suite & Docker Packaging (8:45 – 9:45)
*Seamless transition into: The Closing Sign-Off*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Switch smoothly to your open terminal window.<br/>2. Run: `pytest` (show 174 passed in 3 seconds!).<br/>3. Run: `npm test` (show 14 passed in 1 second!).<br/>4. Run: `npm run lint` (0 errors). | *"To make this all happen effortlessly, we backed it up with a bulletproof technical foundation:*<br/><br/>*On the **backend**, it's **Python 3.12, Django 5.2 LTS, and Django REST Framework**, using SQLite with JSONField for nested geometries and dual Redis / Local-Memory caching.*<br/><br/>*On the **frontend**, it's **React 18 with TypeScript in strict mode, Vite, and Material UI** themed to the Section 9 specification.*<br/><br/>*And look at our test suite:*<br/>*- On the backend, we have **174 automated tests** passing in ~3 seconds, covering every single float boundary condition and load escalation rule.*<br/>*- On the frontend, **14 Vitest unit tests** with 100% clean TypeScript and ESLint.*<br/><br/>*For deployment, the entire app is packaged into a **production multi-stage Dockerfile**: Stage 1 builds the Vite React SPA, and Stage 2 runs Django with Gunicorn where WhiteNoise serves the static assets directly. It runs as an unprivileged non-root user with an automated `/api/health` probe ready for one-click deploy to Render, Railway, or Fly.io."* |

---

### ACT 9: The Confident Pitch Close (9:45 – 10:15)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Switch back to the running web app. Frame the full map with the blue route and the subtle orange radar glow. Smile at the camera.** | *"If we were taking this to commercial production at Spotter.AI, the natural roadmap would be hooking in live telematics for dynamic in-transit rerouting, analyzing steep mountain road grades, and factoring in mandatory Hours of Service driver rest breaks.*<br/><br/>*Every architectural assumption, trade-off, and design decision is documented in `README.md` and `docs/DECISIONS.md`.*<br/><br/>*I had a fantastic time building this system, and I would love the opportunity to discuss the architecture and dive deeper with the Spotter.AI engineering team.*<br/><br/>*Thank you so much for your time, and have a wonderful day!"* |

---

## 🎙️ Golden Rules for Presenting Like a Pro
1. **Energy is contagious:** Speak with enthusiasm—you built something genuinely cool that works smoothly, so let that pride come through!
2. **Hit the transitions:** Phrases like *"Now, generating three lines on a map is easy, but here's the million-dollar question..."* keep the viewer hooked and make the 8–10 minutes fly by.
3. **If you stumble, smile and keep going:** Don't stop and restart the recording! A tiny pause or self-correction shows natural human confidence.
