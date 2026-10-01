# Development Roadmap

> **Documentation status:** This is a planning / next-design document. The current runnable app is in `app/` and is a React/Vite/Three.js two-view prototype, not the full SVG-first Moon Visibility Explorer described here. See `README.md` for the current build status.


# Phase 1 - Calculation Foundation

Goal:

Produce reliable Sun and Moon position calculations before designing elaborate graphics.

Tasks:

- create Vite + TypeScript project
- establish directory structure
- select astronomy/ephemeris library
- implement observer location model
- implement UTC/local time handling
- calculate Sun altitude and azimuth
- calculate Moon altitude and azimuth
- calculate Moon illumination
- calculate Sun-Moon elongation
- calculate basic phase description
- implement twilight classification
- add automated tests

Deliverable:

A simple debug page showing numerical astronomical values.

Before or alongside this phase, create a disposable desktop UI mockup for the main workbench screen. The mockup should prove the compact layout, collapsible sections, visualization dominance and data presentation before production UI code is built.

Selected UI direction:

> `sketches/001-left-rail-workbench`

This should be used as the starting point for the production app shell.

---

# Phase 2 - Observer Sky

Goal:

Create the first useful visualization.

Implement:

- horizon panorama
- compass directions
- altitude grid
- Sun
- Moon
- Moon phase
- sky brightness
- time slider

Deliverable:

Changing time visibly moves the Sun and Moon through the local sky.

---

# Phase 3 - Local Horizon Geometry

Goal:

Explain why an object is above or below the observer's horizon.

Implement:

- spherical Earth cross-section
- observer
- Earth radius
- local vertical
- tangent horizon
- Sun direction
- Moon direction
- altitude angles

Deliverable:

Observer Sky and Horizon Geometry update simultaneously.

---

# Phase 4 - Lunar Orbital Geometry

Goal:

Explain the relationship between:

- ecliptic
- lunar orbital plane
- observer horizon

Implement:

- ecliptic plane
- lunar orbital plane
- 5.145° inclination
- line of nodes
- Moon position
- Sun direction
- explanatory labels

Deliverable:

Interactive orbital-plane diagram synchronized with the selected date.

---

# Phase 5 - Moon Phase Geometry

Goal:

Explain the observed lunar phase.

Implement:

- Sun direction
- illuminated Moon hemisphere
- Earth-facing hemisphere
- elongation
- phase angle
- visible illuminated fraction

Deliverable:

Moon phase on the sky display matches the orbital geometry display.

---

# Phase 6 - Daily Timeline

Goal:

Show when the Moon is above the horizon relative to daylight.

Implement:

- sunrise
- sunset
- twilight
- moonrise
- moonset
- Moon transit
- solar transit
- daytime overlap

Deliverable:

24-hour Sun/Moon visibility timeline.

---

# Phase 7 - Find the Moon Today

Goal:

Turn the educational app into a practical observation tool.

Implement:

    Find Daytime Moon

Result:

- suitable time range
- direction
- altitude
- phase
- illumination
- Sun separation

Deliverable:

A user can determine when and where to look for the Moon.

---

# Phase 8 - Observation Verification

Implement:

- explicit date/time/location entry
- calculated observation panel
- copy result
- shareable URL

Deliverable:

An observation can be independently reproduced by another user.

---

# Phase 9 - Animation

Add:

- real-time mode
- minute animation
- hourly animation
- daily animation
- lunar-month animation

Use the different speeds to explain:

- Earth rotation
- lunar orbit
- phase progression

---

# Phase 10 - Educational Polish

Add contextual explanations for:

- local horizon
- ecliptic
- lunar orbital plane
- declination
- altitude
- azimuth
- elongation
- phase
- lunar nodes
- twilight

Keep explanations short and visual.

---

# Phase 11 - Scale Demonstration

Add selectable modes:

    Teaching View

    Angular Geometry

    True Scale

True-scale mode should demonstrate why ordinary Solar System diagrams exaggerate sizes and distances.

---

# Phase 12 - Advanced Astronomy

Possible later additions:

- lunar nodes
- eclipse geometry
- eclipse seasons
- maximum lunar declination
- major/minor lunar standstill
- libration
- perigee/apogee
- Moon angular diameter
- atmospheric refraction
- horizon elevation
- terrain horizon
- photography planning

---

# First Development Milestone

Do not begin with complex 3D graphics.

The first milestone should be:

> Given latitude, longitude, date and time, accurately calculate and display the Sun and Moon altitude, azimuth and lunar phase.

Then build visualizations on top of those verified values.

The first visual milestone should also demonstrate the product's core explanatory purpose:

> For this observer and time, where is the Moon, when is it visible, and why does the Sun-Earth-Moon/local-horizon geometry produce that result?

The answer should be visible at a glance, with deeper math and geometry available through advanced or collapsible sections.

Because diagram clarity is the hardest part of the project, follow `DIAGRAM_STRATEGY.md` before implementing production renderers.

---

# Suggested Development Order

    Astronomy engine
          ↓
    Numerical test page
          ↓
    Observer sky
          ↓
    Time slider
          ↓
    Horizon geometry
          ↓
    Phase geometry
          ↓
    Orbital plane
          ↓
    Daily timeline
          ↓
    Educational explanations
          ↓
    Animation
          ↓
    Advanced features

The visual application should grow outward from tested astronomical calculations rather than attempting to retrofit accurate calculations into finished graphics.