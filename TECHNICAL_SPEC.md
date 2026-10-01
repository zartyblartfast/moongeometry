# Technical Specification

# 1. Recommended Architecture

Use a client-side static web application.

Recommended stack:

- TypeScript
- Vite
- native HTML
- CSS
- SVG
- Vitest

Avoid introducing a large UI framework unless development complexity later justifies it.

The application is principally:

- numerical calculation
- SVG visualization
- interactive state management

A lightweight architecture is therefore preferable.

---

# 2. Architecture Principle

Astronomical calculations must be completely independent from visualization.

Use the following pipeline:

    User Input
        ↓
    Time + Observer Position
        ↓
    Astronomy Engine
        ↓
    Astronomical State
        ↓
    ┌──────────────────────┐
    │ Observer Sky         │
    │ Horizon Geometry     │
    │ Orbital Geometry     │
    │ Timeline             │
    │ Numerical Panel      │
    └──────────────────────┘

No renderer should calculate its own independent Moon or Sun position.

---

# 3. Shared Application State

Suggested interface:

```ts
interface ObserverState {
  latitudeDeg: number;
  longitudeDeg: number;
  elevationM: number;
  timezone: string;
}

interface TimeState {
  utc: Date;
  localDateISO: string;
  localTime: string;
}

interface BodyHorizontalPosition {
  altitudeDeg: number;
  azimuthDeg: number;
}

interface EquatorialPosition {
  rightAscensionHours: number;
  declinationDeg: number;
}

interface SunState {
  horizontal: BodyHorizontalPosition;
  equatorial: EquatorialPosition;

  aboveHorizon: boolean;

  riseUtc?: Date;
  transitUtc?: Date;
  setUtc?: Date;
}

interface MoonState {
  horizontal: BodyHorizontalPosition;
  equatorial: EquatorialPosition;

  distanceKm: number;

  illuminationFraction: number;
  phaseAngleDeg: number;
  elongationDeg: number;
  lunarAgeDays: number;

  waxing: boolean;
  phaseName: string;

  aboveHorizon: boolean;

  riseUtc?: Date;
  transitUtc?: Date;
  setUtc?: Date;
}

interface SkyState {
  solarAltitudeDeg: number;

  condition:
    | "day"
    | "civil-twilight"
    | "nautical-twilight"
    | "astronomical-twilight"
    | "night";
}

interface AstronomyState {
  observer: ObserverState;
  time: TimeState;
  sun: SunState;
  moon: MoonState;
  sky: SkyState;
}
```

---

# 4. Astronomy Module

Suggested files:

    src/astronomy/
      ephemeris.ts
      coordinates.ts
      moonPhase.ts
      riseSet.ts
      twilight.ts
      visibility.ts
      constants.ts

Responsibilities:

## ephemeris.ts

Obtain geocentric or apparent coordinates of:

- Sun
- Moon

## coordinates.ts

Coordinate conversion:

- equatorial coordinates
- local hour angle
- horizontal coordinates
- altitude
- azimuth

## moonPhase.ts

Calculate:

- Sun-Moon elongation
- phase angle
- illuminated fraction
- waxing/waning
- lunar age
- descriptive phase

## riseSet.ts

Calculate:

- sunrise
- sunset
- Moon rise
- Moon set
- transit

Handle:

- no rise
- no set
- circumpolar cases where applicable

## twilight.ts

Classify sky state using solar altitude.

## visibility.ts

Determine:

- Moon geometrically above horizon
- Sun geometrically above horizon
- daytime Moon overlap

A later version may provide a heuristic visibility estimate.

---

# 5. Astronomy Library

The preferred implementation should use a validated astronomical calculation library rather than deriving all high-precision ephemerides from scratch.

Wrap the external library behind the application's own astronomy interface.

Example:

```ts
interface EphemerisProvider {
  getSunState(
    date: Date,
    observer: ObserverState
  ): SunState;

  getMoonState(
    date: Date,
    observer: ObserverState
  ): MoonState;
}
```

This prevents visualization code from becoming dependent on a particular third-party library.

It also allows the astronomy engine to be replaced later.

---

# 6. Coordinate Convention

Document all conventions explicitly.

Recommended conventions:

Latitude:

    north positive
    south negative

Longitude:

    east positive
    west negative

Altitude:

    horizon = 0°
    zenith = +90°
    below horizon = negative

Azimuth:

    north = 0°
    east = 90°
    south = 180°
    west = 270°

Angles should be normalized where appropriate.

Example:

```ts
function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
```

---

# 7. Date and Time

Internally store astronomical times in UTC.

Convert to/from local civil time only at the UI boundary.

Never perform astronomical calculations using ambiguous local timestamps.

Required distinction:

    UI local time
        ↓ timezone conversion
    UTC instant
        ↓
    astronomy calculation

Daylight saving changes must therefore be handled by the timezone conversion layer rather than the astronomy engine.

---

# 8. Observer Sky Renderer

Suggested file:

    src/renderers/skyRenderer.ts

Use SVG.

Suggested coordinate representation:

- azimuth controls horizontal location
- altitude controls vertical location

Possible projection for initial implementation:

    x = normalized azimuth
    y = function(altitude)

Later versions may support:

- azimuthal projection
- fisheye sky dome
- stereographic celestial view

The initial projection should prioritize comprehension over visual realism.

---

# 9. Horizon Geometry Renderer

Suggested file:

    src/renderers/horizonGeometryRenderer.ts

Render:

- circular Earth cross-section
- observer
- Earth radius to observer
- tangent horizon
- Sun line of sight
- Moon line of sight
- altitude arcs

Mathematical constraint:

The local horizon must always be perpendicular to the observer's local radial direction.

The visualization should therefore derive the tangent line from the observer position rather than manually positioning it.

---

# 10. Orbital Geometry Renderer

Suggested file:

    src/renderers/orbitalGeometryRenderer.ts

Render:

- Earth
- Moon
- Sun direction
- ecliptic
- lunar orbital plane
- ascending/descending node if enabled
- inclination arc
- Moon illumination
- elongation

Do not attempt physical distance scaling in the default view.

Preserve angular relationships where useful.

---

# 11. Rendering Models

Create view-model functions between astronomy and SVG.

Example:

```ts
interface SkyViewModel {
  sunX: number;
  sunY: number;

  moonX: number;
  moonY: number;

  sunVisible: boolean;
  moonVisible: boolean;

  skyBrightness: number;
}
```

Renderer responsibilities should be limited to drawing.

---

# 12. State Management

Version 1 does not require Redux or another large state library.

Use one centralized application state and explicit update events.

Example:

```ts
type AppListener = (state: AstronomyState) => void;

class AppStore {
  private state: AstronomyState;
  private listeners = new Set<AppListener>();

  getState(): AstronomyState {
    return this.state;
  }

  subscribe(listener: AppListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
```

---

# 13. Animation

Use requestAnimationFrame for visual animation.

Astronomical state does not need to be recalculated every display frame.

For example:

- UI rendering: up to screen refresh rate
- astronomy recalculation: when simulated time changes meaningfully

Animation speeds:

    1 minute simulated / second
    10 minutes simulated / second
    1 hour simulated / second
    1 day simulated / second

Animation should stop automatically when the browser tab is hidden if appropriate.

---

# 14. Performance

Astronomical calculations for one Sun and one Moon position should be inexpensive.

Main performance risks are:

- unnecessary DOM reconstruction
- repeated SVG creation
- excessive animation updates

Prefer updating existing SVG attributes.

Example:

```ts
moonElement.setAttribute("cx", String(x));
moonElement.setAttribute("cy", String(y));
```

rather than recreating the SVG tree.

---

# 15. Responsive Design

Desktop:

    controls
    ┌──────────────┬──────────────┐
    │ Observer Sky │ Geometry     │
    └──────────────┴──────────────┘
    timeline
    data

Mobile:

    controls
    Observer Sky
    Geometry
    timeline
    data

SVGs must use:

```html
viewBox="0 0 width height"
```

and scale responsively.

---

# 16. Accessibility

Minimum requirements:

- keyboard-accessible controls
- proper form labels
- adequate contrast
- text equivalents for diagram state
- numerical values available independently from graphics
- avoid using colour alone to convey state
- respect reduced-motion preferences

---

# 17. Testing

Automated tests should cover:

- angle normalization
- coordinate transforms
- Sun altitude
- Moon altitude
- phase calculation
- illumination fraction
- twilight classification
- rise/set handling
- timezone conversion

Regression tests should compare selected dates and locations with trusted astronomical references.

---

# 18. Error Tolerance

Define expected precision.

Educational target:

Sun and Moon positions should normally agree with reputable astronomical ephemerides closely enough that visual differences are negligible.

Exact tolerance should be determined after selecting the ephemeris engine.

Do not claim precision beyond that delivered by the underlying model.

---

# 19. Future Extension Points

Architecture should allow later modules for:

    eclipses/
    lunarNodes/
    planets/
    stars/
    photography/
    observationLog/

without changing the core coordinate system.

# Desktop Layout Requirement

The application must be implemented desktop-first.

At viewport widths >= 1024px:

- primary visualization panels must appear side-by-side
- controls should use a compact toolbar layout where practical
- numerical data should use multi-column or tabular layouts
- mobile stacking must not remain the default layout

At viewport widths >= 1440px:

- content should expand to use available width up to the defined max-width
- visualization panels should grow proportionally
- control widths should remain compact rather than stretching unnecessarily

---

# Component Design Constraint

Do not use generic UI component defaults without customization.

Avoid automatically generated component-library styling such as:

- excessive border radius
- oversized padding
- pill buttons
- large card shadows
- mobile-oriented spacing

Reusable components must follow DESIGN_SYSTEM.md.

---

# CSS Architecture

Use explicit layout classes for:

- desktop workspace
- primary visualization grid
- control toolbar
- data grid
- timeline
- mobile reflow

Do not rely only on generic utility classes without a coherent layout plan.

---

# Screenshot Review Requirement

Each major UI milestone must be visually reviewed at:

- 1280 x 800
- 1440 x 900
- 1920 x 1080
- 390 x 844

Desktop screenshots must be assessed independently from mobile screenshots.

A design is not acceptable merely because it is responsive.

It must also look intentionally designed for desktop.

The preferred desktop interaction model is a compact scientific workbench. Production UI should not begin from generic component-library defaults. First establish an approved main-screen mockup with either:

- a compact top control toolbar with side-by-side primary visualizations, or
- a left collapsible control rail with a large visualization workspace.

In both cases, advanced controls and deeper astronomical data should use progressive disclosure so the main observation workflow remains clear.