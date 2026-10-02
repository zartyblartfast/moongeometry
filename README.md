# MoonGeometry

MoonGeometry is an interactive educational web app for seeing how the Moon's orbital geometry becomes the Moon's apparent path in a local sky.

Live site:

```text
https://moongeometry.com
```

The current working app lives in [`app/`](app/). It is a React / Vite / Three.js prototype imported from the Grok-generated `moon-path-source.zip` and then iterated in this repository.

---

## Current app

Run the app from the `app/` directory:

```sh
cd app
npm ci
npm run dev
```

The app is committed with `app/.grok/app-env.json` containing:

```json
{
  "VITE_AUTH_ENABLED": "false"
}
```

That flag disables the imported Grok auth gate for local/public development. If you regenerate the Grok scaffold or delete `.grok/`, restore that file or set `VITE_AUTH_ENABLED=false` in your environment.

The local development server runs at:

```text
http://localhost:8080/
```

The current screen contains two main synchronized views:

1. **Orbital geometry**
   - A Three.js/WebGL schematic of Earth, the equator, the ecliptic, sunlight direction and the Moon's inclined orbit.
   - The globe includes schematic continents/oceans, an observer marker, and day/night/twilight shading.
   - Distances and sizes are intentionally schematic.

2. **Local sky path**
   - A 2D backyard-sky chart showing the resulting apparent Moon path for the selected latitude, longitude, date and mean solar time.
   - It displays ephemeris-backed Moon altitude/azimuth, declination, phase, illumination and geometric rise/set, plus the altitude relationship.

The controls include:

- latitude and longitude sliders
- date
- **mean solar time** at the selected longitude
- a read-only UTC reference for the same instant
- explicit place lookup via OpenStreetMap/Nominatim search

The time input is deliberately **not** civil/watch time. The URL stores mean-solar `date` and `time`, plus `lat` and `lon`:

```text
?lat=51.5&lon=-0.1&date=2026-12-21&time=21:00
```

Place search sets coordinates only. It does not set a time zone or daylight-saving rule.

The app also includes an **Explain** panel with:

- a summary of how the left geometry becomes the right sky path
- live calculation values from the model
- a scientific-basis section with Kepler/Newton/Cassini context and modern reference sources
- model limits

---

## Current model

The app separates ephemeris-backed observed values from an intentionally schematic teaching diagram.

The user-facing Sun and Moon altitude, azimuth and declination; lunar phase, illumination and ecliptic coordinates; sky dots and arcs; and geometric rise/set are produced locally through the pinned `astronomy-engine` ephemeris provider. Local-sky positions are topocentric and include observer parallax. No runtime network ephemeris call is made.

Rise/set is the app's own geometric center crossing at altitude 0°. It does not include atmospheric refraction, apparent Sun/Moon radius, terrain or weather, so its times should not be treated as conventional apparent-rise/set almanac times.

The editable date/time remains **mean solar time** at the selected longitude. UTC is a read-only reference for the same instant, not a second editable clock.

The Three.js orrery remains educational and schematic. Geocentric ephemeris directions drive the displayed Sun and Moon angles, but object sizes, distances, orbit-hoop radius, sunlight-ray length, continents and overall scale are not realistic. It does not render libration, detailed lunar surface orientation or a Cassini-state model.

The earlier simple/mean-orbit provider remains in the codebase for comparison and testing, but it is not the active observed display model.

MoonGeometry is not a precision navigation or almanac tool. For work where conventions and precision matter, compare against a published almanac or specialist service.

The label in the app is intentional:

> Angles true · distances fiction

The label describes the visual teaching model: its directions are ephemeris-driven, while its scale and drawn geometry are simplified.

---

## Repository layout

```text
app/                         Current runnable React/Vite/Three.js app
sketches/                    Earlier disposable UI layout sketches
*.md                         Product, astronomy and UI design notes
Moon_Path_Vision_Specification.docx  Imported vision/spec document
```

The `app/` tree still contains some imported Grok scaffold code for auth, app-data and preview hosting. The MoonGeometry product code is concentrated in `app/src/components/moon-app.tsx`, `space-scene.tsx`, `sky-chart.tsx`, `moon-phase.tsx`, `app/src/lib/astro.ts`, and `app/src/lib/astronomy/`.

Ignored local/generated items include:

```text
app/node_modules/
app/.vercel/
tools/
*.zip
```

---

## Documentation status

The root specification documents were written before and during the prototype process. They describe the intended broader product direction, not the exact current screen.

In particular:

- `PRODUCT_SPEC.md`, `TECHNICAL_SPEC.md`, `ASTRONOMY_MODEL.md`, `UI_UX_SPEC.md`, `DESIGN_SYSTEM.md`, `DEVELOPMENT_ROADMAP.md`, `DIAGRAM_STRATEGY.md` and `REQUIRED_DIAGRAMS.md` are **planning / next-design documents**.
- Some of those documents discuss a future “Moon Visibility Explorer” with SVG-first diagrams, a separate local-horizon view, timelines and validated ephemerides.
- The current app in `app/` is a different prototype direction: a compact two-view React/Three.js app with an orrery-style view and local sky-path chart.
- `sketches/` contains previous UI explorations and should not be treated as the current app layout.

When in doubt, treat `app/` as the program and the root specs as design background / future roadmap.

---

## Useful commands

From `app/`:

```sh
npm run dev        # local server
npm run typecheck  # TypeScript check
npm test           # scaffold tests plus astronomy tests
npm run build      # production build
```

---

## Scientific context

The active observed model uses an ephemeris provider, while the presentation remains an educational simplification grounded in standard ideas:

- topocentric equatorial-of-date positions and observer parallax
- spherical astronomy for converting equatorial coordinates to geometric local altitude/azimuth
- lunar orbital inclination relative to the ecliptic
- ephemeris-backed lunar phase and illumination
- historical context from Kepler, Newton and Cassini
- modern reference standards such as the Astronomical Almanac, USNO services and JPL Horizons for precision comparison

The scientific-basis section in the app distinguishes the active calculations, historical/physical context and intentionally schematic visual geometry.
