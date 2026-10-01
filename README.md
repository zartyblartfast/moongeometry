# Moon Visibility Explorer

An interactive educational web application that explains and predicts where the Moon appears in the sky for any observer, date and time.

The application connects three things that are often shown separately:

1. What an observer actually sees in the local sky.
2. The Earth-Moon-Sun geometry that produces that observation.
3. The astronomical calculations that predict it.

The central aim is to make lunar phases, daytime Moon visibility, moonrise/moonset and the Moon's changing path across the sky visually understandable and independently verifiable.

In plain terms, if someone wonders how and why the Moon appears where and when it does from a specific latitude, longitude, date and time, the application should make the answer visually clear. It should also expose the underlying mathematical and geometric reasoning for users who want to investigate more deeply.

---

## Core Idea

For any selected:

- latitude
- longitude
- date
- time

the application calculates the actual positions of the Sun and Moon.

It then displays the same instant in multiple synchronized views:

### Observer Sky

Shows what an observer would actually see:

- Moon altitude and azimuth
- Sun altitude and azimuth
- Moon phase
- horizon
- compass directions
- daylight, twilight or night
- optional ecliptic
- optional celestial equator

### Local Horizon Geometry

Shows the observer on spherical Earth with their local horizontal tangent plane.

This demonstrates an important distinction:

The Moon's orbital inclination relative to the ecliptic is NOT the same thing as the Moon's altitude above an observer's horizon.

### Earth-Moon-Sun Geometry

Shows:

- Earth
- Moon
- direction toward the Sun
- lunar orbital plane
- ecliptic plane
- approximately 5.145° lunar orbital inclination
- Sun-Moon elongation
- illuminated and dark hemispheres of the Moon

All views represent the same calculated moment.

---

## Educational Goals

The application should allow a user to discover visually that:

- The Moon is frequently visible during daylight.
- Moon phase depends on Sun-Earth-Moon geometry.
- A full Moon is approximately opposite the Sun in the sky.
- A first-quarter Moon is approximately 90° from the Sun.
- Moonrise and moonset change from day to day.
- The Moon's orbit is inclined approximately 5.145° to the ecliptic.
- The ecliptic is not the same as an observer's local horizon.
- An observer's horizon is determined by their position on spherical Earth.
- Earth's rotation causes the daily apparent motion of the Sun and Moon.
- The Moon's orbital motion causes its position relative to the Sun to change from day to day.
- Lunar phase cycles repeat approximately every 29.53 days.
- The Moon orbits Earth relative to the stars in approximately 27.3 days.

The application should encourage users to compare predictions with direct observation.

---

## Design Principle

The primary design principle is:

> Observation first. Geometry second. Calculation always underneath.

The interface should feel like a compact scientific workbench rather than a generic dashboard or mobile app enlarged to desktop size. Controls, data and explanations should support the visualizations without crowding them. Collapsible sections are preferred for secondary controls and deeper technical details.

The left or primary part of the interface should answer:

> What should I see?

The accompanying geometry should answer:

> Why should I see it?

---

## Accuracy

The graphics do not need to reproduce astronomical distances to scale.

Instead, the application must distinguish clearly between:

- calculated geometry
- angular geometry
- schematic visual representation
- true physical scale

Where sizes or distances are exaggerated, the visualization must say so explicitly.

Suggested label:

> Schematic view: sizes and distances are exaggerated for clarity. Calculated directions and angles are preserved.

---

## Technology

Recommended initial stack:

- TypeScript
- Vite
- HTML5
- CSS
- SVG
- Astronomy calculation library or validated ephemeris module
- Vitest for automated tests

SVG should be preferred for the main educational diagrams because it provides:

- precise geometry
- scalable graphics
- crisp labels
- easy animation
- accessibility
- straightforward interaction
- simple dynamic updating

A Three.js/WebGL visualization may be added later, but should not replace the clearer controlled educational diagrams.

---

## Planned Views

The first release should contain:

1. Observer Sky
2. Local Horizon Geometry
3. Earth-Moon-Sun Geometry
4. Daily visibility timeline
5. Numerical observation panel

Later versions may add:

- 3D orbital view
- monthly lunar animation
- eclipse geometry
- lunar nodes
- declination graphs
- maximum/minimum lunar altitude analysis
- observation sharing
- URL-encoded scenarios

---

## Example

A user chooses:

Latitude: 54.15° N  
Longitude: 4.48° W  
Date: 2026-09-29  
Time: 17:45

The application calculates:

- Sun altitude
- Sun azimuth
- Moon altitude
- Moon azimuth
- lunar illumination
- phase
- Sun-Moon elongation
- whether each body is above the geometric horizon
- twilight state

The diagrams then update simultaneously.

---

## Important Terminology

### Altitude

Angular height of an object above or below the observer's local horizon.

0° = horizon  
+90° = zenith  
negative values = below horizon

### Azimuth

Compass direction of an object measured around the horizon.

### Ecliptic

The apparent annual path of the Sun against the celestial sphere, corresponding to Earth's orbital plane.

### Lunar Orbital Plane

The plane of the Moon's orbit around Earth.

It is inclined by approximately 5.145° relative to the ecliptic.

### Elongation

Angular separation between the Sun and Moon as seen from Earth.

Approximately:

- New Moon: 0°
- First Quarter: 90°
- Full Moon: 180°
- Last Quarter: 90°

### Local Horizon

The plane perpendicular to the observer's local vertical.

On spherical Earth it is tangent to Earth at the observer's location.

---

## Repository Structure

Suggested initial structure:

    src/
      astronomy/
        ephemeris.ts
        coordinates.ts
        moonPhase.ts
        visibility.ts
        twilight.ts

      components/
        controls/
        sky/
        geometry/
        timeline/
        dataPanel/

      renderers/
        skyRenderer.ts
        horizonGeometryRenderer.ts
        orbitalGeometryRenderer.ts

      state/
        appState.ts

      utils/
        angles.ts
        dates.ts
        formatting.ts

      main.ts
      styles.css

    tests/
      astronomy/
      coordinates/
      regression/

    docs/
      PRODUCT_SPEC.md
      TECHNICAL_SPEC.md
      ASTRONOMY_MODEL.md
      UI_UX_SPEC.md
      ROADMAP.md

---

## Development Philosophy

Astronomical calculations and visual rendering must remain separate.

The diagrams must consume calculated astronomical state.

They must never invent or approximate astronomical positions independently.

In other words:

    astronomical inputs
          ↓
    calculation engine
          ↓
    shared astronomical state
          ↓
    all visualizations

This ensures that every diagram displays the same physical situation.

---

## Status

Initial specification / prototype stage.