# Ephemeris Upgrade Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Use a topocentric ephemeris for the observed Sun and Moon, while the page, URL, mean-solar clock, schematic orrery, and current educational presentation stay as they are.

**Architecture:** Add a model/provider seam beside the existing `astro.ts` implementation, then compare and switch observed outputs. Do **not** split `astro.ts` into many modules before there is a second model to compare.

**Tech Stack:** React, Vite, TanStack Start, Three.js, TypeScript, Node test runner.

---

## Repository context

Repository:

```text
https://github.com/zartyblartfast/moongeometry.git
```

Runnable app:

```text
app/
```

Current mean-orbit astronomy code:

```text
app/src/lib/astro.ts
```

Main consumers:

```text
app/src/components/moon-app.tsx
app/src/components/sky-chart.tsx
app/src/components/space-scene.tsx
app/src/components/moon-phase.tsx
```

---

## Do not change

- The one-page layout and two-view structure.
- The URL shape:

```text
?lat=51.5&lon=-0.1&date=2026-12-21&time=21:00
```

- `date` and `time` are mean solar time at the selected longitude.
- UTC stays a read-only reference line.
- No time zones, daylight saving, second clock, new diagram, or place-search change.
- Distances and sizes in the orrery stay fiction. Do not draw a true-scale Solar System.
- Rise/set stays a geometric horizon crossing: no refraction, no apparent radius, no terrain. Do not compare those times with a published almanac.
- Do not remove “Mean circular orbit, not a full ephemeris” until the user-facing numbers on the page actually come from the ephemeris.
- Keep “Distances and sizes are schematic” or equivalent in any case.
- The Altitude / Azimuth label change is separate. Do not revert it if it has landed before this work starts.

---

## Current two-clock contract

The current code already has an important contract:

```ts
snapshot(instant, lat, lon, orbitInstant)
skyPath(instant, lat, lon, which, orbitInstant)
```

These use two time inputs:

- `instant` is the clock and Earth rotation: GMST, zenith, hour angle, and the time shown in the controls.
- `orbitInstant` is the Sun/Moon orbital state. It equals `instant` except during **Slide the Moon**.

Current animation behavior:

- **Spin Earth** advances both `instant` and `orbitInstant`.
- **Slide the Moon** holds the time of day, steps `instant` by whole days, and advances `orbitInstant` continuously.

A provider that accepts only one time will break Slide.

---

## Parallax and diagram contract

Parallax is an observer effect.

It belongs in:

- altitude
- azimuth
- sky path / sky arc
- rise/set geometric horizon crossing

It does **not** move the Moon bead on the schematic orbit hoop. The hoop keeps a fixed radius. Only the bead’s angular position may change.

The silver Moon dot must stay on the silver sky arc. Both are topocentric in the upgraded observed view.

The sky arc is still the diurnal track of the current body state, not a full day of orbital motion. Recompute it from the current `orbitInstant` so it keeps drifting smoothly. Preserve the spirit of the existing test:

```text
the sky path drifts with declination instead of stepping once a day
```

No midnight/date-bound jump may return.

---

## Accuracy target

The current Moon model is geocentric, so the local apparent Moon can be wrong by about a degree. The first ephemeris target is therefore topocentric observed position.

Initial targets:

- Sun altitude and azimuth within 0.25° of reference.
- Moon altitude and azimuth within 0.25° of reference.
- Moon illumination within 2 percentage points.

Say this level honestly in UI/docs. Do not claim arcsecond precision.

---

## Ephemeris source rule

Prefer a maintained browser-compatible library, likely `astronomy-engine`, after checking:

- license
- bundle size
- maintenance status
- topocentric Sun support
- topocentric Moon support
- phase / illumination support
- ability to access geocentric directions for the orrery

Do not call JPL Horizons from the browser. Use a few saved Horizons or library/reference fixtures for tests.

Do not use a library rise/set routine if it includes refraction or apparent-radius conventions. Displayed rise/set remains the app’s own geometric horizon crossing unless deliberately changed and labelled.

Write the source choice in:

```text
docs/plans/ephemeris-source-evaluation.md
```

before adding the dependency.

---

## Provider output conventions

Be explicit about units and coordinate conventions.

Suggested conventions:

- RA/Dec: radians, unless a type explicitly says `Deg`.
- Altitude/azimuth for UI: degrees.
- Azimuth: degrees clockwise from north.
  - 0° = north
  - 90° = east
  - 180° = south
  - 270° = west
- Geocentric unit vectors use the existing equatorial frame unless deliberately changed.
- Existing `moonHz` / `sunHz` compatibility fields may remain radians during transition if that avoids large UI edits.

Do not mix degrees and radians silently.

---

## Reference fixture format

Saved reference fixtures should live in:

```text
app/src/lib/astronomy/fixtures/reference-cases.ts
```

Suggested type:

```ts
export type ReferenceCase = {
  name: string;
  instant: string; // ISO UTC
  latDeg: number;
  lonDeg: number;
  expected: {
    sunAltDeg: number;
    sunAzDeg: number;
    moonAltDeg: number;
    moonAzDeg: number;
    illumination: number;
  };
  source: "Horizons" | "AstronomyEngine" | "USNO" | "Other";
  notes?: string;
};
```

Each fixture must state whether it uses geometric or apparent conventions. Do not compare the app’s geometric rise/set to a refraction/apparent almanac value.

---

## Task 1 — Baseline

**Objective:** Confirm the current app is green before any ephemeris work.

**Files:** none expected.

**Steps:**

From `app/`, run:

```sh
npm run typecheck
node --experimental-strip-types --test src/lib/astro.test.ts
npm run build
```

Notes:

- `npm run build` also runs `db:migrate`.
- With no `DATABASE_URL`, migration skips and exits 0. That is not a failure.

**Expected:** all commands succeed.

**Do not start subsequent tasks if this fails.**

---

## Task 2 — Provider contract

**Objective:** Add a provider interface without wiring it into the UI.

**Files:**

- Create: `app/src/lib/astronomy/provider.ts`

The provider must require both instants:

```ts
export type AstronomyProviderInput = {
  instant: number;
  orbitInstant: number;
  latDeg: number;
  lonDeg: number;
};
```

The provider should return at least:

- Sun geocentric direction for the orrery.
- Moon geocentric direction for the orrery.
- Sun topocentric altitude/azimuth for the sky/stat display.
- Moon topocentric altitude/azimuth for the sky/stat display.
- Moon declination.
- Moon illumination.
- Moon waxing/waning.
- Moon phase name.
- Moon elongation.
- Compatibility fields needed by the current UI.

Suggested shape:

```ts
import type { Vec3 } from "../astro";

export type EquatorialPosition = {
  ra: number;  // radians
  dec: number; // radians
};

export type HorizontalPosition = {
  altitudeDeg: number;
  azimuthDeg: number; // clockwise from north
};

export type BodyState = {
  equatorial: EquatorialPosition;
  horizontal: HorizontalPosition;
  geocentricUnit: Vec3;
};

export type MoonState = BodyState & {
  distanceKm?: number;
  illumination: number;
  elongationDeg: number;
  waxing: boolean;
  phaseName: string;
};

export type AstronomyProviderSnapshot = {
  sun: BodyState;
  moon: MoonState;
  decDeg: number;
  zenith: Vec3;
};

export interface AstronomyProvider {
  snapshot(input: AstronomyProviderInput): AstronomyProviderSnapshot;
}
```

Do not wire the UI.

**Verify:**

```sh
cd app
npm run typecheck
```

**Commit:**

```sh
git add app/src/lib/astronomy/provider.ts
git commit -m "feat: define astronomy provider contract"
```

---

## Task 3 — Simple adapter

**Objective:** Add a provider implementation that wraps the existing mean-orbit model.

**Files:**

- Create: `app/src/lib/astronomy/simple-provider.ts`
- Modify if needed: `app/src/lib/astronomy/provider.ts`

Rules:

- Call the existing `astro.ts` functions.
- Do not change visible behavior.
- The page still uses `astro.ts` directly for now.
- Add a focused test that the simple provider returns the same observed values as direct `snapshot()` for a representative case.

**Verify:**

```sh
cd app
npm run typecheck
node --experimental-strip-types --test src/lib/astro.test.ts
```

**Commit:**

```sh
git add app/src/lib/astronomy/simple-provider.ts app/src/lib/astronomy/provider.ts app/src/lib/astro.test.ts
git commit -m "feat: add simple astronomy provider"
```

---

## Task 4 — Ephemeris source evaluation

**Objective:** Choose the high-accuracy source before adding dependencies.

**Files:**

- Create: `docs/plans/ephemeris-source-evaluation.md`

Evaluate at least:

- `astronomy-engine`
- one other maintained browser-compatible JS astronomy library if viable
- Meeus-style algorithms as a fallback option
- JPL Horizons as reference/checking source only

Record:

- package name
- license
- npm version
- maintenance status
- browser/static deployment compatibility
- estimated bundle-size impact
- topocentric Sun support
- topocentric Moon support
- geocentric direction access
- phase/illumination support
- whether rise/set conventions include refraction or apparent radius
- decision and rationale

The decision should state that displayed rise/set remains app geometric crossing.

**Verify:** document exists and answers the above.

**Commit:**

```sh
git add docs/plans/ephemeris-source-evaluation.md
git commit -m "docs: evaluate ephemeris source options"
```

---

## Task 5 — Ephemeris adapter, page unchanged

**Objective:** Add the dependency and ephemeris provider without switching the app.

**Files:**

- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Create: `app/src/lib/astronomy/ephemeris-provider.ts`
- Create: `app/src/lib/astronomy/fixtures/reference-cases.ts`
- Add/modify tests.

Rules:

- Same provider interface as the simple adapter.
- Tests compare the ephemeris provider with saved reference fixtures, not with the simple model.
- Also record simple-vs-ephemeris differences for a few cases so disagreement around ~1° is expected and explained.
- Do not switch the app UI yet.
- Do not use a network call at runtime.

**Verify:**

```sh
cd app
npm run typecheck
node --experimental-strip-types --test src/lib/astro.test.ts
npm run build
```

**Commit:**

```sh
git add app/package.json app/package-lock.json app/src/lib/astronomy app/src/lib/astro.test.ts
git commit -m "feat: add ephemeris astronomy provider"
```

---

## Task 6 — Switch observed numbers

**Objective:** Use one provider for every user-facing observation while preserving UI and schematic geometry.

Switch the following to the ephemeris provider:

- sky-panel altitude
- sky-panel azimuth
- Explain panel altitude row
- Explain panel azimuth row
- declination
- phase
- illumination
- rise/set geometric crossing
- sky-chart Moon dot
- sky-chart Moon arc
- Sun dot / Sun path where applicable

Do **not** use a library rise/set routine if it includes refraction or apparent radius.

Build the sky arc by sampling topocentric altitude/azimuth around the diurnal track at the current `orbitInstant`. It remains the current body’s diurnal track, not a full day of orbital motion. It must keep drifting smoothly and must not reintroduce a midnight jump.

Drive the orrery angles from the same geocentric directions:

- Sun-ray direction from geocentric Sun direction.
- Moon bead angle from geocentric Moon direction.

Leave these schematic:

- hoop radius
- ray length
- Earth size
- continents
- overall orrery scale

Preserve:

- URL
- mean-solar controls
- UTC line
- place search
- one-page layout
- southern-hemisphere phase-icon mirror

**Slide the Moon check:**

- date steps
- clock time stays put
- arc drifts
- dot remains on arc

**Verify:**

```sh
cd app
npm run typecheck
node --experimental-strip-types --test src/lib/astro.test.ts
npm run build
```

Manual screenshots:

```text
1280 x 800
1440 x 900
```

**Commit:**

```sh
git add app/src/components app/src/lib/astronomy app/src/lib/astro.ts app/src/lib/astro.test.ts
git commit -m "feat: use ephemeris provider for observed Moon state"
```

---

## Task 7 — Words and documentation

**Objective:** Update labels/docs only after the page’s observed numbers really come from the ephemeris provider.

When the page is on the ephemeris provider, replace:

```text
Mean circular orbit, not a full ephemeris.
```

for the observed outputs with a shorter limit such as:

```text
Topocentric positions. Geometric rise/set. No refraction. Distances remain schematic.
```

Do not delete the simple model. Keep it behind the adapter for comparison tests.

Update:

- `README.md`
- any relevant Explain panel text
- any current-model disclaimers

Keep a clear distinction between:

- observed values that are ephemeris-backed
- schematic orrery geometry that remains a teaching diagram

**Verify:**

```sh
cd app
npm run typecheck
npm run build
```

**Commit:**

```sh
git add README.md app/src/components app/src/lib/astronomy
git commit -m "docs: document ephemeris model status"
```

---

## Done checklist

From `app/`:

```sh
npm run typecheck
node --experimental-strip-types --test src/lib/astro.test.ts
npm run build
```

Manual checks:

- A shared URL restores the same place and mean-solar moment.
- Mean solar time remains the only editable time input.
- UTC remains read-only.
- Place search still sets coordinates only.
- Slide the Moon and Spin Earth still match the two-clock contract.
- The Moon dot sits on the Moon arc in both hemispheres.
- Rise/set is still described as geometric.
- The orrery is still a diagram, not a scale model.
- No new panel or diagram was added.
- The Explain panel’s Live calculation tab shows values that match the displayed sky panel.

---

## Commit discipline

Commit each task separately. Do not combine provider interface, dependency addition, and UI switch in one commit.

The highest-risk tasks are:

1. ephemeris provider implementation
2. sky path sampling
3. rise/set geometric crossing
4. provider switch in the UI

Treat those as separate commits with explicit visual and numerical verification.
