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

### ACT 3: Route Recommendation & Safety Criteria (2:30 – 3:45)
*Seamless transition into: Micro-Level Checkpoints*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Hover your mouse over the blue recommendation banner at the top of the route list.**<br/><br/>Toggle between Route A and Route B cards to show the interactive focus rings. | *"Now, generating three lines on a map is great. But here’s the million-dollar question: **How does a dispatcher know which route is genuinely the safest?***<br/><br/>*Look at our top recommendation banner: it automatically selected **Route A**.*<br/><br/>*And why did it pick Route A? Because we strictly followed the assessment's recommendation criteria in exact order:*<br/>*1. **First, prefer fewest Severe miles:** Avoiding extreme weather and no-travel zones is rule number one—if a route has severe hazards, it immediately drops down the list.*<br/>*2. **Second, prefer fewest High miles:** If severe miles are tied, it looks for the option with the fewest high-risk miles.*<br/>*3. **Third, prefer lowest average risk:** If those are still tied, it compares overall weather smoothness.*<br/>*4. **And fourth, prefer shortest travel times:** Balancing safety with driver efficiency.*<br/><br/>*And look at how cleanly that worked here: Route A and Route B were tied with zero severe miles and tied on average risk. So following the rules, the system moved to travel time and recommended Route A because it saves the driver **51 minutes** of driving! Perfect balance of safety and speed.*<br/><br/>*Now, you might wonder: where do these risk numbers actually come from? Let’s zoom into the road."* |

---

### ACT 4: Checkpoints, Weather at ETA & Segment Math (3:45 – 5:00)
*Seamless transition into: Heavy Load Physics*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. **Click on a circular checkpoint marker on Route A (around Mile 250 near Wichita Falls).**<br/><br/>2. Let the clean popup open smoothly. Point out the wind speed (18 mph), gusts, and ETA.<br/><br/>3. Point to the departure time: **Saturday 6:00 PM**, arriving **Sunday 8:29 AM**. | *"Now let’s zoom in, because the real secret sauce is what's happening at every single mile marker along the highway.*<br/><br/>*Let's click on this checkpoint near Mile 250. Look at this popup:*<br/><br/>*A common rookie mistake in weather apps is looking up 'current' weather along the entire 800-mile corridor. But a truck isn't a teleporting airplane—it takes 14 hours to drive from Dallas to Denver!*<br/><br/>*Notice our departure is **Saturday evening at 6:00 PM**, which means our truck arrives in Denver at **8:29 AM Sunday morning**.*<br/><br/>*Now look at the timeline below: a high crosswinds storm actually develops on Sunday afternoon at 1:00 PM. But by 1:00 PM Sunday, our truck has already finished the trip and been safely parked in Denver for nearly 5 hours!*<br/><br/>*What our backend does is calculate the truck's cumulative driving time along the actual road steps to derive its **exact estimated arrival ETA** at this specific mile. Then it queries Open-Meteo and linearly interpolates the forecasted weather expected **at the exact hour the truck rolls through this spot**.*<br/><br/>*And over in the sidebar, look at our stacked risk bars: each checkpoint covers a road segment using a midpoint formula that sums up mathematically to the exact total trip mileage with zero rounding drift."* |

---

### ACT 5: The "Wow" Factor: Live Hazards, Load Escalation & Route Diversion (5:00 – 6:30)
*Seamless transition into: The 48-Hour Radar*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. In `TripForm`, change **Departure Date & Time** to tomorrow morning: **`11/15/2026 04:00 AM`**.<br/>2. Change **Gross Vehicle / Load Weight** to **`42,000 lb`**.<br/>3. Click the blue **Find Safest Route** button (instant return in <1s!).<br/>4. **Point to the recommendation banner: it automatically switched to Route B!**<br/>5. Click an orange hazard checkpoint pin on Route A near Amarillo/Wichita Falls to open the popup. | *"Now, you might say: 'Gian, that looks great when skies are clear. But what happens when real-world storms and heavy loads collide?'*<br/><br/>*Let me show you our decision engine under severe real-world hazard conditions.*<br/><br/>*Watch this: I’m going to schedule our departure for tomorrow morning—**Sunday, Nov 15 at 04:00 AM**—right when our truck will be rolling through the Texas Panhandle during the Sunday afternoon storm front. And I’m bumping our load weight to **42,000 pounds**.*<br/><br/>*Let's hit 'Find Safest Route'—and look at what just happened!*<br/><br/>*First, look at the recommendation banner: **it automatically diverted the truck away from Route A and recommended Route B!***<br/><br/>*Why? Look at the explanation: **'With Severe miles tied, Route B has 0 High-risk miles versus 25 on Route A and Route C.'** Route A is 51 minutes faster, but our engine refused to send a 42,000-pound truck into high crosswinds! Safety won over speed.*<br/><br/>*Now look at the map: Route A has vibrant orange hazard checkpoints. Let’s click on this checkpoint near Amarillo: sustained crosswind is 38 mph. Under normal conditions with an empty trailer, that’s moderate. But because our truck is hauling 42,000 pounds, our load physics rule triggered:*<br/><br/>*`⚠️ Load Rule Escalation: Vehicle load (>40,000 lb) plus sustained wind escalated risk to Severe.`*<br/><br/>*The dispatcher catches this catastrophe before the truck ever pulls out of the bay."* |

---

### ACT 6: The 48-Hour Doppler Weather Radar (6:30 – 7:45)
*Seamless transition into: Edge Cases & Resilience*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Point your mouse at the floating **48-Hour Forecast Timeline Slider** at the bottom.<br/>2. Hover over the multi-colored mini sparkline strip above the slider.<br/>3. **Click the Play ▶️ button** and watch the animation sweep across the corridor.<br/>4. Drag the slider to **Hour 17–20 (Sunday 1:00 PM)** to freeze on the storm front.<br/>5. Point out why hazards show across all 3 routes (corridor comparison).<br/>6. Click **Full Map** in the top header. | *"Now, routing for right now is only half the battle. On long-haul freight, a storm could be brewing tomorrow afternoon while your driver is still mid-trip. And that brings us to our visual centerpiece: the **48-Hour Corridor Doppler Weather Radar**.*<br/><br/>*First, look right above the slider at this mini colored sparkline strip. In one second, without clicking anything, a dispatcher can glance at this strip and immediately see which future hours have storm or wind activity.*<br/><br/>*Now watch what happens when I click **Play**—look at how the radar animates across the entire corridor!*<br/><br/>*Notice that the weather hazards appear across all 3 routes: that is completely intentional! As a dispatcher, you need to see the weather developing across the entire regional corridor—Route A through Texas, Route B through Oklahoma, and Alternative C—so you can visually compare them side-by-side. Right here at Sunday 1:00 PM, you can see the high-wind storm hitting Route A, while Route B in Oklahoma only has light rain. That gives instant visual validation of our decision engine's recommendation!*<br/><br/>*And look at the Doppler radar rendering: stepped reflectivity bands from yellow fringes to orange storm bodies and crimson severe cores, with zero cosmetic blur. It maintains its true physical geographic footprint at every zoom level.*<br/><br/>*Notice how smooth that is? That is running at a rock-solid **60 frames per second** with **zero network requests** while scrubbing, thanks to our custom HTML5 canvas layer.*<br/><br/>*And if you're on a dispatch floor with dual monitors, just hit **'Full Map'** right here in the header—the sidebar tucks away, the map expands full-screen, and you have a dedicated command center."* |

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
