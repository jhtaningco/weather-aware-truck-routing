# Loom Walkthrough: The Charismatic Product Pitch Edition (7–9 Minutes)

* **Presenter:** Gian Adoc
* **Company:** Spotter.AI
* **Role:** Remote Full Stack Engineer (React + Django, AI Systems)
* **Tone:** Charismatic, energetic, confident, conversational — like a world-class founding engineer / sales engineer demoing a flagship product!
* **Target Duration:** 7 to 9 minutes
* **Live App URL:** `http://localhost:5173`

---

## 🎯 The Secret to Nailing This Pitch
- **Don't recite code—tell a story!** You're pitching a safety-critical commercial platform that saves trucking companies hundreds of thousands of dollars in rollover damages.
- **Use the transitions!** Notice how each section naturally hands off to the next with phrases like *"Now, here’s where it gets really interesting..."*, *"Watch what happens when..."*, and *"Now look at the map..."*.
- **Keep your mouse active:** Hover over buttons, highlight cards, and click markers right as you speak about them.

---

## 🎬 The Master Script

---

### ACT 1: The Hook & The Problem (0:00 – 1:15)
*Seamless transition into: The 3 Highway Corridors & Map Legend*

| 🖥️ Screen Action | 🗣️ What You Say (High-Energy, Conversational Pitch) |
| :--- | :--- |
| **Start on the live dashboard at `http://localhost:5173`.**<br/><br/>Keep the mouse centered. Have the clean map and sidebar ready. | *"Hey everyone at Spotter.AI! My name is Gian, and I’m thrilled to take you inside my **Weather-Aware Truck Routing** platform.*<br/><br/>*Now, we all use consumer GPS apps like Google Maps or Waze every day. They have one simple job: get your car to the destination in the fewest minutes possible.*<br/><br/>*But when you're a commercial fleet dispatcher managing an 80,000-pound heavy semi-truck, drive time is only half the equation. Out on the open highway, a 45-mile-per-hour crosswind, sudden freezing rain, or unexpected mountain snowfall isn't just an inconvenience—it's a catastrophic rollover, loss of cargo, and a multi-million-dollar liability.*<br/><br/>*So the challenge was clear: **How do we empower drivers and dispatchers to pick the safest possible heavy-vehicle route before they even leave the depot?***<br/><br/>*Let me show you how we solved it."* |

---

### ACT 2: The 3 Highway Corridors & Map Legend (1:15 – 2:30)
*Seamless transition into: The Route Recommendation Engine*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Point to or select **Origin** (`Dallas, TX, United States`) and **Destination** (`Denver, CO, United States`) from the dropdowns.<br/>2. Keep load at `35,000 lb`, interval at `25 miles`.<br/>3. Click **Find Safest Route**!<br/>4. **Hover over the Map Legend in the top right.**<br/>5. Click **Hide / Show** on the legend to show it collapses. | *"Let’s dive straight into the product. Imagine a fleet dispatcher who needs to send freight from Dallas up to Denver.*<br/><br/>*First, we select our Origin and Destination from the dropdown—Dallas to Denver—set our departure time, and click **'Find Safest Route'**... and boom! Our routing engine analyzes live weather across hundreds of miles and generates 3 completely distinct commercial highway corridors.*<br/><br/>*And notice that these 3 routes are **genuinely different highways**—not slight variations of the same road. We filter out overlapping duplicates so drivers see real alternatives: Route A through Texas, Route B through Oklahoma and Kansas, and Alternative C.*<br/><br/>*Now, look at our **Map Legend** up in the top-right corner:*<br/>*- **Route Options:** We have Route A in solid brand blue, Route B in slate neutral, and Route C in dashed sky blue.*<br/>*- **Checkpoint Risk:** Here you see our 5 risk categories—from **Low** in emerald green up to **No Travel** in dark maroon. Notice that safe checkpoints along the highway are marked with green pins, giving drivers instant visual confirmation that those road segments are clear to proceed.*<br/>*And for dispatchers, notice you can click **Hide** right here to tuck the legend away and maximize map visibility."* |

---

### ACT 3: Route Recommendation & Safety Criteria (2:30 – 3:45)
*Seamless transition into: Micro-Level Checkpoints*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Hover your mouse over the blue recommendation banner at the top of the route list.**<br/><br/>Toggle between Route A and Route B cards to show the interactive focus rings. | *"Now, generating three lines on a map is great. But here’s the million-dollar question: **How does a dispatcher know which route is genuinely the safest?***<br/><br/>*Look at our top recommendation banner: it automatically selected **Route A**.*<br/><br/>*And why did it pick Route A? Because we strictly followed the assessment's recommendation criteria in exact order:*<br/>*1. **First, prefer fewest Severe miles:** Avoiding extreme weather and no-travel zones is rule number one—if a route has severe hazards, it immediately drops down the list.*<br/>*2. **Second, prefer fewest High miles:** If severe miles are tied, it looks for the option with the fewest high-risk miles.*<br/>*3. **Third, prefer lowest average risk:** If those are still tied, it compares overall weather smoothness.*<br/>*4. **And fourth, prefer shortest travel times:** Balancing safety with driver efficiency.*<br/><br/>*And look at how cleanly that worked here: Route A and Route B were tied with zero severe miles and tied on average risk. So following the rules, the system moved to travel time and recommended Route A because it saves the driver **51 minutes** of driving! Perfect balance of safety and speed.*<br/><br/>*Now, you might wonder: where do these risk numbers actually come from? Let’s zoom into the highway."* |

---

### ACT 4: Checkpoints, Weather Risk Rules & Arrival ETA (3:45 – 5:00)
*Seamless transition into: Heavy Load Physics*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. **Click on a circular checkpoint marker on Route A (around Mile 250 near Wichita Falls).**<br/><br/>2. Let the clean popup open smoothly.<br/><br/>3. **Point to the popup header:** `🚚 Truck Arrival ETA`.<br/><br/>4. Point to the wind speed, gusts, and ETA.<br/><br/>5. Point to the stacked segment risk bar on the route card. | *"Now let’s zoom in, because the real secret sauce is what's happening at every single mile marker along the highway.*<br/><br/>*Let's click on this checkpoint near Mile 250. Look at this popup:*<br/><br/>*A common mistake in weather apps is checking current weather across the whole 800-mile trip. But a truck takes 14 hours to reach Denver! Our backend calculates the truck's exact arrival time at every mile marker, and fetches the weather forecasted for the moment the truck actually drives through that spot.*<br/><br/>*Notice that departing when skies are clear, our truck arrives in Denver hours before any storm develops, so the system doesn't penalize the driver with false alarms.*<br/><br/>*And how do we evaluate risk? We strictly implemented the assessment's **Weather Risk Matrix**:*<br/>*- **Sustained Wind:** under 25 mph is Low, 25 to 35 is Moderate, 35 to 45 is High, 45 to 55 is Severe, and 55+ is an automatic No-Travel emergency.*<br/>*- **Rain Rate:** up to 0.25 in/hr Moderate, up to 0.50 High, up to 1.0 Severe, over 1.0 No Travel.*<br/>*- **Snowfall:** up to 1.0 in/hr Moderate, up to 2.0 High, up to 3.0 Severe, over 3.0 No Travel.*<br/>*The base risk is the maximum of all three metrics.*<br/><br/>*And over in the sidebar, look at our stacked risk bars: each checkpoint covers a road segment using a **midpoint formula** that sums up mathematically to the exact total trip mileage with zero rounding drift."* |

---

### ACT 5: Heavy Load Rules & Route Diversion Demo (5:00 – 6:30)
*Seamless transition into: The 48-Hour Radar & Moving Truck*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. In `TripForm`, advance the **Departure Date** by 1 day (or set time into the storm).<br/>2. Change **Gross Vehicle / Load Weight** to **`42,000 lb`**.<br/>3. Click the blue **Find Safest Route** button.<br/>4. **Point to the recommendation banner: it automatically switched to Route B!**<br/>5. Click an orange hazard checkpoint pin on Route A near Amarillo/Wichita Falls to open the popup. | *"Now, you might say: 'Gian, that looks great when skies are clear. But how does the system behave when real-world storms and heavy loads collide?'*<br/><br/>*Let me show you our decision engine under severe real-world hazard conditions.*<br/><br/>*The assessment specifies two critical **Vehicle Load Weight Escalation Rules**:*<br/>*1. If sustained wind is 35 to 45 mph and the vehicle load exceeds **40,000 pounds**, High risk escalates to **Severe**.*<br/>*2. If sustained wind is 45 to 55 mph and the load exceeds **30,000 pounds**, Severe risk escalates to **No Travel**.*<br/>*And crucially: load rules only ever increase risk, never lower it!*<br/><br/>*Watch this: I’m going to schedule our departure right when the high-wind storm front sweeps across the Texas Panhandle, and I’m setting our load weight to **42,000 pounds**.*<br/><br/>*Let's hit 'Find Safest Route'—and look at what just happened!*<br/><br/>*First, look at the recommendation banner: **it automatically diverted the truck away from Route A and recommended Route B!***<br/><br/>*Why? Look at the explanation: **'With Severe miles tied, Route B has 0 High-risk miles versus 25 on Route A.'** Route A is faster, but our engine applied the safety rules: Route B had fewer High-risk miles, so safety won over speed!*<br/><br/>*Now look at the map: Route A has vibrant orange hazard checkpoints. Let’s click on this checkpoint near Amarillo: sustained crosswind is 38 mph. Under normal conditions with an empty trailer, that’s moderate. But because our truck is hauling 42,000 pounds, our load physics rule triggered:*<br/><br/>*`⚠️ Load Rule Escalation: Vehicle load (>40,000 lb) plus sustained wind escalated risk to Severe.`*<br/><br/>*The dispatcher catches this catastrophe before the truck ever pulls out of the bay."* |

---

### ACT 6: 48-Hour Doppler Radar & The Moving Truck Marker (6:30 – 8:00)
*Seamless transition into: Tech Stack & Architecture*

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| 1. Point your mouse at the floating **48-Hour Forecast Timeline Slider** at the bottom.<br/>2. Hover over the multi-colored mini sparkline strip above the slider.<br/>3. **Point to the Radar Legend:** Show `⭕ Clear (Clean)` where sunny skies remain transparent on the radar.<br/>4. **Click the Play ▶️ button** and watch the animation sweep across the corridor.<br/>5. **Point to the blue Truck Marker (🚚) gliding down the highway!**<br/>6. Drag the slider to the storm hour to freeze on the storm front.<br/>7. Click the truck icon to show its status card: `🚚 Mile 518 • In Transit`.<br/>8. Click **Full Map** in the top header. | *"Now, routing for right now is only half the battle. On long-haul freight, a storm could be brewing tomorrow afternoon while your driver is still mid-trip. And that brings us to our visual centerpiece: the **48-Hour Corridor Doppler Weather Radar**.*<br/><br/>*First, look right above the slider at this mini colored sparkline strip. In one second, without clicking anything, a dispatcher can glance at this strip and immediately see which future hours have storm or wind activity.*<br/><br/>*And look at our **Radar Legend** at the bottom: clear, safe weather is kept completely transparent—we call it 'Clear (Clean)'—so roads stay pristine. But when hazardous weather develops, look at how it blooms as an authentic Doppler radar front!*<br/><br/>*Now watch what happens when I click **Play**—look at how the radar animates across the entire corridor!*<br/><br/>*And look at what's on the highway: **there's our commercial freight truck marker (🚚) smoothly gliding along the route in real time!***<br/><br/>*Now let’s pause right here during the storm hour. Look at the story this tells:*<br/>*- Down in Texas on Route A, there's a severe storm front raging near Amarillo.*<br/>*- But look at our truck: because our engine diverted to Route B, our driver is cruising safely through Kansas at **Mile 518** under clear skies!*<br/>*- And as the slider advances, the truck marker reaches Denver and turns green: **'🏁 Arrived at Destination'**.*<br/><br/>*Notice that as the radar sweeps across the map, this isn't fake mock data—our backend connects directly to live NOAA forecast models via Open-Meteo. You're watching an authentic storm track across the Great Plains at a rock-solid **60 frames per second** with **zero network requests** while scrubbing, rendered on our custom HTML5 canvas layer.*<br/><br/>*And if you're on a dispatch floor with dual monitors, just hit **'Full Map'** right here in the header—the sidebar tucks away, the map expands full-screen, and you have a dedicated command center."* |

---

### ACT 7: Tech Stack, Automated Tests & Packaging (8:00 – 8:30)
*Seamless transition into: The Closing Sign-Off*

| 🖥️ Screen Action | 🗣️ What You Say (Crisp & Simple — ~30 Seconds) |
| :--- | :--- |
| 1. Switch smoothly to your open terminal window.<br/>2. Run: `pytest` (show 174 passed in 3 seconds!).<br/>3. Run: `npm test` (show 14 passed in 1 second!). | *"Under the hood, the technical stack is simple, robust, and production-grade:*<br/><br/>*- On the **backend**, it's **Python and Django REST Framework**.*<br/>*- On the **frontend**, it's **React, TypeScript, and Material UI**.*<br/><br/>*And look at our automated test suite:*<br/>*- On the backend, we have **174 automated tests** passing in ~3 seconds, covering every weather threshold and load rule.*<br/>*- On the frontend, **14 unit tests** with 100% clean TypeScript and ESLint.*<br/><br/>*The entire app is packaged into a **production Docker container**, ready for one-click deployment."* |

---

### ACT 8: The Confident Pitch Close (8:30 – 9:00)

| 🖥️ Screen Action | 🗣️ What You Say |
| :--- | :--- |
| **Switch back to the running web app. Frame the full map with the blue route and the moving truck marker. Smile at the camera.** | *"If we were taking this to commercial production at Spotter.AI, the natural roadmap would be hooking in live telematics for dynamic in-transit rerouting, analyzing steep mountain road grades, and factoring in mandatory Hours of Service driver rest breaks.*<br/><br/>*Every architectural assumption, trade-off, and design decision is documented in `README.md` and `docs/DECISIONS.md`.*<br/><br/>*I had a fantastic time building this system, and I would love the opportunity to discuss the architecture and dive deeper with the Spotter.AI engineering team.*<br/><br/>*Thank you so much for your time, and have a wonderful day!"* |

---

## 🎙️ Golden Rules for Presenting Like a Pro
1. **Energy is contagious:** Speak with enthusiasm—you built something genuinely cool that works smoothly, so let that pride come through!
2. **Hit the transitions:** Phrases like *"Now, here's the million-dollar question..."* keep the viewer hooked and make the time fly by.
3. **If you stumble, smile and keep going:** Don't stop and restart the recording! A tiny pause or self-correction shows natural human confidence.
