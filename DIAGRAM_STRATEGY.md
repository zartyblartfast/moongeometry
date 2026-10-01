# Diagram Strategy

> **Documentation status:** This is a planning / next-design document. The current runnable app is in `app/` and is a React/Vite/Three.js two-view prototype, not the full SVG-first Moon Visibility Explorer described here. See `README.md` for the current build status.


MoonGeometry's hardest implementation challenge is not general page layout; it is making the diagrams both correct and visually understandable.

The selected UI shell direction is:

> `sketches/001-left-rail-workbench`

This gives the application a compact functional control rail and a large visualization workspace. Some of the visual polish from `003-full-canvas-inspector` may be reused, but the production app should start from the functional left-rail workbench model.

---

# 1. Core Diagram Principle

Every diagram must be driven by the same calculated astronomical state.

Do not manually position the Sun, Moon or observer because it looks plausible.

Required pipeline:

    observer + UTC time
          ↓
    astronomy engine
          ↓
    shared AstronomyState
          ↓
    diagram view models
          ↓
    SVG renderers

The renderer may simplify, scale or schematize geometry for clarity, but it must not invent astronomical facts.

---

# 2. Diagram Types

See also `REQUIRED_DIAGRAMS.md` for the diagram inventory and implementation order.

## 2.1 Observer Sky

Primary user question:

> Where should I look?

Must clearly show:

- horizon
- altitude
- azimuth / compass direction
- Sun position
- Moon position
- Moon phase
- daylight/twilight/night state
- whether the Moon is above the horizon

This diagram should be the first visual answer a user understands.

## 2.2 Local Horizon Geometry

Primary user question:

> Why is the Moon above or below my horizon?

Must clearly show:

- spherical Earth cross-section
- observer location
- local vertical / radial direction
- tangent local horizon
- line of sight to Moon
- line of sight to Sun
- altitude angle measured from the local horizon

This diagram must make clear that the observer's horizon is local and tangent to Earth.

## 2.3 Sun-Earth-Moon / Phase Geometry

Primary user question:

> Why does the Moon have this phase?

Must clearly show:

- Sun direction
- Earth
- Moon
- illuminated lunar hemisphere
- Earth-facing hemisphere
- Sun-Moon elongation
- approximate phase relationship

This should explain phase through geometry rather than treating phase as a label.

## 2.4 Ecliptic / Lunar Orbit Geometry

Primary user question:

> What does the Moon's 5.145° orbital inclination mean?

Must clearly distinguish:

- ecliptic plane
- lunar orbital plane
- lunar orbital inclination
- local horizon plane

This view must prevent the common misunderstanding that lunar orbital inclination is the Moon's altitude above the observer's horizon.

---

# 3. Implementation Strategy

Build diagrams in increasing difficulty.

## Step 1 — Numeric truth

Before polished diagrams, verify calculated values:

- Sun altitude / azimuth
- Moon altitude / azimuth
- Moon illumination
- elongation
- twilight state
- above/below horizon

## Step 2 — Diagram view models

Create view-model functions that convert `AstronomyState` into renderer-friendly coordinates.

Example modules:

    src/viewModels/skyViewModel.ts
    src/viewModels/horizonGeometryViewModel.ts
    src/viewModels/phaseGeometryViewModel.ts
    src/viewModels/orbitGeometryViewModel.ts

View models should be unit tested independently from SVG rendering.

## Step 3 — Static SVG renderers

Render clear static diagrams from known fixture states before adding animation.

Each renderer should accept a view model and produce/update SVG. It should not call the astronomy engine directly.

## Step 4 — Synchronized interaction

Once individual diagrams work, wire them to the shared app state so that changing time/location updates all views together.

## Step 5 — Motion and polish

Only add animation after the static diagrams are correct and comprehensible.

---

# 4. Diagram Acceptance Criteria

A diagram is acceptable only if:

- it answers its primary user question without requiring a long text explanation
- labels are readable at laptop desktop sizes
- line weights, colors and annotation styles match the design system
- calculated angles/directions are preserved or explicitly marked as schematic
- exaggerated sizes/distances are labelled as schematic
- it works at 1280 x 800 and 1440 x 900
- it does not confuse local horizon, ecliptic and lunar orbital plane

---

# 5. Recommended First Diagram Milestone

The first serious diagram milestone should be:

> Given a selected location, date and time, show the Moon and Sun in an Observer Sky SVG with accurate altitude/azimuth placement, plus a compact data strip confirming the same values numerically.

This keeps the first visual goal tied to verified astronomical output.

Do not start with complex 3D orbit graphics. They are visually tempting but would delay the core educational value.
