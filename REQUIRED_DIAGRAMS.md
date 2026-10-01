# Required Diagrams

This document defines the diagrams MoonGeometry should provide and what each one is responsible for explaining.

The goal is not to maximize the number of diagrams. The goal is to choose a small set of diagrams where each one answers a distinct user question clearly.

---

# 1. Diagram Selection Principle

Each diagram must answer one primary question.

If a diagram tries to answer too many questions at once, split the responsibility or move secondary details into optional overlays.

The main user questions are:

1. Where should I look in the sky?
2. What will the Moon look like from here now?
3. When is the Moon visible today?
4. Why is it above or below my horizon?
5. Why does it have this phase?
6. What does the Moon's tilted orbit mean?
7. How does the Moon's path change through time?

---

# 2. Required Core Diagrams

## 2.1 Observer Sky View

Primary question:

> Where is the Moon in my local sky?

This is the main observational view.

It should show:

- local horizon
- compass direction / azimuth
- altitude scale
- Sun position
- Moon position
- sky brightness: day, twilight, night
- whether the Moon and Sun are above the horizon
- optional ecliptic / celestial equator overlays

The Moon symbol in this view should be the most observation-like Moon depiction in the application.

It should eventually support:

- correct illuminated phase
- correct orientation for the observer's location and time
- Northern Hemisphere vs Southern Hemisphere apparent rotation
- position angle of the bright limb
- optional lunar surface features / maria for orientation cues
- daytime rendering where the unilluminated lunar portion blends visually with the blue sky

Important distinction:

This is the view where the Moon should look most like what the observer might actually see. Other geometry diagrams do not need this level of lunar-disc realism.

## 2.2 Moon Appearance Inset

Primary question:

> What should the Moon itself look like?

This may be part of the Observer Sky View or a small companion inset.

It should show:

- lunar phase
- orientation as seen by the observer
- bright limb direction relative to the Sun
- optionally, simplified lunar maria / surface shading
- daytime/nighttime visual treatment

Why this is needed:

A simple crescent/quarter/full icon is not enough for all educational purposes. Observers in opposite hemispheres see the Moon rotated relative to each other. The visible orientation is only obvious if the lunar disc has recognizable non-uniform surface features, such as simplified maria, or another orientation cue.

Recommended implementation approach:

- Start with phase illumination and bright-limb orientation.
- Add a simplified lunar texture/maria overlay after the phase geometry is correct.
- Rotate the texture according to the observer-relative position angle.
- In daytime sky mode, reduce contrast in the shaded portion so it visually recedes into the blue sky.

Do not block the first astronomy milestone on full lunar texture realism. Build it as a later refinement of the Observer Sky View.

## 2.3 Daily Visibility Timeline

Primary question:

> When can I see the Moon today?

It should show:

- daylight period
- civil / nautical / astronomical twilight
- night
- Moon above/below horizon
- Moonrise / moonset
- Sun rise / set
- lunar transit
- current selected time
- daytime Moon overlap

This is the practical observation-planning view.

## 2.4 Local Horizon Geometry

Primary question:

> Why is the Moon above or below my horizon?

It should show:

- Earth cross-section
- observer position
- local vertical
- local tangent horizon
- Moon line of sight
- Sun line of sight
- altitude angle measured from the local horizon

This view must clearly teach that altitude is measured from the observer's local horizon, not from the ecliptic or lunar orbital plane.

## 2.5 Phase Geometry

Primary question:

> Why does the Moon have this phase?

It should show:

- Sun direction
- Earth
- Moon
- illuminated lunar hemisphere
- Earth-facing hemisphere
- Sun-Moon elongation
- approximate phase relationship

This diagram can be schematic. It does not need lunar maria or observer-specific apparent disc orientation unless an optional inset is shown.

## 2.6 Ecliptic and Lunar Orbit Geometry

Primary question:

> What does the Moon's 5.145° orbital inclination mean?

It should show:

- ecliptic plane
- lunar orbital plane
- 5.145° inclination
- line of nodes, optionally
- Moon position relative to these planes

This view must explicitly distinguish the lunar orbital plane from the observer's local horizon.

---

# 3. Optional / Later Diagrams

## 3.1 Dynamic Overview Geometry

Primary question:

> How does the selected local Moon view fit into the larger Earth-Moon-Sun system?

This is the big-picture diagram linking the other views.

It should show:

- Sun
- Earth's orbit around the Sun
- one Earth position for the selected date/time, not four static seasonal positions
- Earth's axial tilt
- observer position on the rotating Earth, optionally
- Moon orbit around Earth
- lunar orbital plane inclined relative to the ecliptic
- line of nodes, optionally
- Sunlight direction
- Earth and Moon shadow cones where useful
- current Moon position and phase relationship

This view should be dynamic. When time is played, the user should see Earth orbiting the Sun while the Moon orbits Earth. At slower animation speeds it can show Earth rotation and the observer moving through day/night; at faster speeds it can show lunar phase changes and the monthly orbit.

This diagram can be schematic rather than physically scaled, but it must clearly label what is preserved:

- orbital relationships
- Sun direction
- axial tilt
- lunar orbital inclination
- approximate shadow direction
- selected current position

Avoid showing four Earth positions around the Sun in the main interactive version. That static style is useful for explanation, but the application should emphasize the single selected moment and let animation reveal the full cycle.

This overview should connect to the other diagrams through shared highlighting:

- the same Moon marker used in Observer Sky and Phase Geometry
- the same Sun direction color
- the same lunar orbital plane color
- a highlighted current Earth/Moon position
- optional callouts that say which part is being shown in the local horizon or phase diagrams

This is likely a Phase 2 or later diagram. It should not precede the Observer Sky and Local Horizon views, because users first need the local observational frame.

## 3.2 Sky Dome / Annual Path View

Primary question:

> How does the Moon's path through my sky change over time?

This view is about paths, not realistic lunar appearance.

It may show:

- sky dome or altitude/azimuth projection
- Moon paths across selected days
- Sun path for comparison
- seasonal or monthly variation
- maximum/minimum altitude trends

The Moon can be represented as a simple marker in this view. Realistic lunar surface appearance is not necessary because the diagram's purpose is path comparison.

## 3.3 Monthly Phase Strip

Primary question:

> How does the Moon's phase change through the month?

It may show:

- sequence of lunar phases
- lunar age
- illumination fraction
- approximate rise/set pattern changes

## 3.4 True Scale Demonstration

Primary question:

> Why are the teaching diagrams not physically to scale?

It may show:

- Earth and Moon at approximate true relative scale
- Earth-Moon distance
- comparison with schematic teaching view

This should be a later educational feature, not part of the first usable app.

## 3.5 Eclipse / Node Geometry

Primary question:

> Why do eclipses not happen every month?

It may show:

- lunar nodes
- new/full Moon alignment
- ecliptic crossing
- eclipse seasons

This is explicitly a later extension.

---

# 4. Recommended First Diagram Set

For the first serious version, build these four:

1. Observer Sky View
2. Moon Appearance Inset, initially simple
3. Daily Visibility Timeline
4. Local Horizon Geometry

Then add:

5. Phase Geometry
6. Ecliptic / Lunar Orbit Geometry

This order keeps the application focused on the user's first practical question — where to look — before adding deeper orbital explanation.

---

# 5. Lunar Appearance Detail Levels

The Moon should have different visual treatments depending on context.

## Level 0 — Marker

Use for path diagrams and geometry diagrams where the Moon's visual appearance is not the point.

Example:

- simple circle
- labelled marker
- optional phase-independent symbol

## Level 1 — Phase Disc

Use for first implementation of Observer Sky and data panels.

Shows:

- illuminated fraction
- bright side direction
- simple shaded side

## Level 2 — Observer-Oriented Phase Disc

Use once phase geometry and local orientation are reliable.

Adds:

- apparent rotation for observer latitude/time
- bright limb position angle
- waxing/waning orientation as actually seen

## Level 3 — Textured / Maria Disc

Use for the polished observation-like Moon appearance.

Adds:

- simplified lunar maria / surface texture
- texture rotation to match apparent orientation
- daytime contrast adaptation
- optional night-mode contrast enhancement

Level 3 is valuable, but it should not come before the underlying orientation and phase math is correct.

---

# 6. Important Visual Distinction

Do not use the same Moon rendering style everywhere.

- Observer Sky: observation-like Moon, eventually with phase, orientation and surface cues.
- Moon Appearance Inset: most detailed apparent Moon rendering.
- Phase Geometry: schematic illuminated sphere/disc.
- Local Horizon Geometry: line-of-sight marker is enough.
- Sky Dome / Path View: path marker is enough.
- Orbit Geometry: orbital body marker is enough.

This prevents unnecessary realism from making explanatory geometry diagrams harder to understand.