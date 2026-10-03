# Earth Coastline Map Technical Specification

**Date:** October 3, 2026

## Goal

Replace the hand-drawn land with a real coastline while keeping the observer marker on the entered latitude and longitude.

Do not change:

- the sky chart;
- the ephemeris or its two-clock contract;
- the URL;
- the hoops;
- the day, night, or twilight shader;
- the view-snap positions;
- the one-page layout.

The globe texture is created by `createEarthTexture()` in `app/src/components/space-scene.tsx`. Its fallback land is the existing set of polygons in that function. The Earth mesh is currently `SphereGeometry(0.56, 48, 32)`. The camera is `PerspectiveCamera(40, 1, 0.1, 40)`, and wheel zoom currently stops at radius `3.4`.

The observer marker is the circle mesh named `figure`. The cream sphere at `y = 1.32` is the north-axis marker, not the observer.

---

## 1. Map asset and provenance

Commit these files:

```text
app/src/assets/earth-land.png
app/src/assets/earth-land.md
scripts/generate-earth-land-map.mjs
```

`earth-land.png` must be exactly `2048×1024` pixels.

Use Natural Earth 1:50m land data. Pin the dataset version and source URL. Record in `earth-land.md`:

- the Natural Earth dataset name;
- dataset version;
- source URL;
- source checksum, when the source provides or permits one;
- that Natural Earth data are public domain;
- output dimensions;
- land and ocean colours;
- that polygons crossing ±180° were split while generating the raster;
- the generator command.

The generator must be deterministic. Running it twice from the same pinned source must produce the same PNG bytes.

Any packages used only by the generator must be development dependencies, not browser/runtime dependencies. A network download is allowed only when manually running the generator. The application and production build must never download map data at runtime.

The generator must:

- produce a standard equirectangular image;
- split polygons that cross the antimeridian before rasterization;
- ensure the first and last image columns meet cleanly;
- render land approximately `#72a46f`;
- render ocean approximately `#18527d`;
- omit satellite imagery, country borders, labels, and political boundaries.

Britain, Madagascar, Japan, and New Zealand must be recognisable.

The committed PNG remains in standard geographic order:

- west on the left;
- east on the right;
- longitude −180° at the left seam;
- longitude 0° at the centre;
- longitude +180° at the right seam;
- latitude +90° at the top;
- latitude −90° at the bottom.

Do not store a horizontally mirrored PNG.

---

## 2. Texture loading and fallback

Import the bundled asset through Vite:

```ts
import earthLandUrl from "@/assets/earth-land.png";
```

`createEarthTexture()` must remain synchronous from the caller's perspective, but return a handle that supports cancelling the asynchronous image load:

```ts
type EarthTextureHandle = {
  texture: THREE.CanvasTexture;
  cancelLoad: () => void;
};

function createEarthTexture(): EarthTextureHandle;
```

Loading sequence:

1. Create the `1024×512` canvas used by the live Three.js texture.
2. Paint the fallback ocean, existing fallback land polygons, and faint 30° graticule immediately.
3. Create and return the `CanvasTexture` immediately. The globe must never be temporarily blank or ocean-only.
4. Load the bundled PNG asynchronously.
5. On success:
   - clear and redraw the map image using the handedness correction described below;
   - redraw the graticule on top;
   - set `texture.needsUpdate = true`.
6. On error, retain the already-painted fallback texture.
7. On scene cleanup, call `cancelLoad()` before disposing the texture. A late `onload` or `onerror` callback must not mutate a disposed texture.

A suitable cancellation pattern is:

```ts
let active = true;

image.onload = () => {
  if (!active) return;
  // Redraw map and graticule.
  texture.needsUpdate = true;
};

return {
  texture,
  cancelLoad() {
    active = false;
    image.onload = null;
    image.onerror = null;
  },
};
```

Texture settings:

```ts
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.colorSpace = THREE.SRGBColorSpace;
```

Retain appropriate anisotropic filtering. Horizontal repeat wrapping is required to reduce sampling and mipmap artifacts at the antimeridian seam.

Raise Earth mesh resolution to:

```ts
new THREE.SphereGeometry(0.56, 96, 64)
```

Leave the day, night, and twilight shader unchanged.

---

## 3. Texture handedness

`THREE.SphereGeometry` places `u = 0.5`, corresponding to map longitude 0°, on local `+X`. Increasing `u`, which moves eastward in the source PNG, moves toward local `−Z`.

The app's equatorial frame moves increasing longitude and right ascension toward `+Z`. Therefore, applying the standard west-to-east PNG directly would mirror east and west relative to the celestial frame.

Correct this handedness explicitly by either:

- drawing the source image horizontally reversed into the runtime canvas; or
- applying an exactly equivalent runtime texture transform.

The committed PNG must remain unmirrored. A later Y-axis rotation cannot correct an east/west reflection.

The fallback polygons must use the same final geographic handedness as the loaded PNG.

---

## 4. Earth rotation and observer alignment

Remove the legacy `gmstDeg(daysSinceJ2000(...))` Earth-rotation path from `space-scene.tsx`.

Do not independently reimplement Astronomy Engine sidereal time in the component.

Obtain Greenwich's direction from the same provider used by the observer marker:

```ts
const greenwich = ephemerisAstronomyProvider.observerZenith(instant, 0, 0);
const siderealAngle = Math.atan2(greenwich[2], greenwich[0]);
```

The sign of `earth.rotation.y` depends on the chosen handedness correction. Determine and lock the sign through the alignment test rather than guessing.

The final transformation must satisfy:

```ts
earthSurfaceUnit(lat, lon, siderealAngle)
```

matching:

```ts
ephemerisAstronomyProvider.observerZenith(instant, lat, lon)
```

within `0.1°` angular separation.

Do not move `figure` away from `observerZenith(instant, lat, lon)` to compensate for an incorrect map transform.

---

## 5. Pure map and alignment helpers

Create:

```text
app/src/lib/earth-map.ts
app/src/lib/earth-map.test.ts
```

Keep map projection, sphere-coordinate conversion, Earth rotation, angular comparison, and zoom scaling testable without React or WebGL.

### Longitude wrapping

Define longitude wrapping to the half-open interval:

```text
[−180°, +180°)
```

Therefore, +180° and −180° identify the same antimeridian seam.

### Pixel projection

`earthMapPixel(lonDeg, latDeg, width, height)` returns integer pixel indices for the unmirrored source image.

Use:

```ts
const wrappedLon = wrapLongitude180(lonDeg);
const u = wrap01((wrappedLon + 180) / 360); // [0, 1)
const v = clamp((90 - latDeg) / 180, 0, 1); // [0, 1]

const x = Math.min(width - 1, Math.floor(u * width));
const y = Math.min(height - 1, Math.floor(v * height));
```

The returned ranges are:

```text
x ∈ [0, width − 1]
y ∈ [0, height − 1]
```

Test:

- `(0°, 0°)` at the image centre, allowing for the documented integer-pixel convention;
- north and south poles;
- a point immediately to each side of the antimeridian;
- +180° and −180° mapping to the same seam;
- London: `51.5° N, 0°`;
- Sydney: `33.9° S, 151° E`.

### World-frame alignment

Provide a helper such as:

```ts
earthSurfaceUnit(
  latDeg: number,
  lonDeg: number,
  greenwichSiderealAngle: number,
): Vec3
```

Its documented coordinate convention must include the same horizontal image correction and Y rotation used by the mesh.

Compare its result with `observerZenith()` using angular separation, not component-by-component pixel checks.

Acceptance:

```text
angular separation < 0.1°
```

Test at least:

- Greenwich equator;
- London;
- Sydney;
- one western longitude;
- one latitude above 60°;
- two instants separated by at least one year.

---

## 6. Zoom and observer-overlay scaling

Camera radius is measured from the Earth's centre.

Change wheel limits to:

```text
minimum: 1.5
maximum: 12
```

At radius `1.5`, the nearest Earth surface is approximately `0.94` scene units from the camera because `EARTH = 0.56`. This remains outside the camera's `0.1` near plane.

Do not change the existing view-snap radii. Drag and wheel zoom must continue to work while the camera is inside the hoops. The camera must never cross the Earth surface.

Scale only:

```text
figure.scale
plate.scale
```

Do not change their positions. Do not scale the north-axis marker.

At camera radius `2.25` or greater:

```text
figure scale = 1
plate scale = 1
```

At camera radius `1.5` or less, target:

```text
figure visual radius = 0.012
plate outer radius = 0.045
```

Given the existing geometries, the minimum scale factors are:

```ts
const MIN_FIGURE_SCALE = 0.012 / 0.045;
const MIN_PLATE_SCALE = 0.045 / 0.19;
```

Between camera radii `1.5` and `2.25`, interpolate each scale independently and linearly.

Create a pure helper:

```ts
type ObserverOverlayScale = {
  figure: number;
  plate: number;
};

function observerOverlayScaleForCameraRadius(
  cameraRadius: number,
): ObserverOverlayScale;
```

Apply it with:

```ts
figure.scale.setScalar(scales.figure);
plate.scale.setScalar(scales.plate);
```

Test:

- radius `>= 2.25` returns `{ figure: 1, plate: 1 }`;
- radius `<= 1.5` returns the two stated minimum factors;
- an intermediate radius produces values strictly between minimum and 1;
- values clamp outside the supported range.

At minimum zoom, the marker must remain visible and the ring must still read as the local tangent plane without covering the neighbouring coastline.

---

## 7. Automated verification

Add `src/lib/earth-map.test.ts` to the app's `npm test` script.

From `app/`, run:

```bash
npm run typecheck
node --experimental-strip-types --test src/lib/earth-map.test.ts
node --experimental-strip-types --test src/lib/astro.test.ts
npm test
npm run build
npx eslint \
  src/components/space-scene.tsx \
  src/lib/earth-map.ts \
  src/lib/earth-map.test.ts
git diff --check
```

Verify asset reproducibility from the repository root or adjust the command's relative paths explicitly:

```bash
node scripts/generate-earth-land-map.mjs
git diff --exit-code -- app/src/assets/earth-land.png
```

The generator must not modify the PNG when its inputs and pinned source are unchanged.

---

## 8. Manual acceptance checks

Check at both `1280×800` and `1440×900`.

Locations:

- London, `51.5° N, 0°`, at wide view and minimum zoom;
- Sydney, `33.9° S, 151° E`, at wide view and minimum zoom;
- at least one western-longitude location, to expose an east/west reflection;
- a location close to the antimeridian;
- a location above 60° latitude.

Interaction and alignment:

- London appears in southeast England.
- Sydney appears on Australia's east coast.
- Spin Earth: the marker remains on the same painted geographic point as Earth rotates.
- Change longitude while paused: the marker moves to the corresponding painted longitude while the Earth orientation remains appropriate for the selected instant.
- Drag and zoom work inside the hoops.
- Wheel zoom clamps at radii 1.5 and 12.
- The camera never enters the Earth.

Loading and fallback:

- Force the image load to fail and confirm the fallback ocean, polygons, and graticule remain visible.
- Confirm successful image loading replaces the fallback without a blank frame.
- Confirm scene disposal before image completion causes no late mutation or console error.

Visual regression:

- At wide view the globe still reads as the existing teaching globe: green land, blue ocean, and faint graticule.
- At minimum zoom the coastline near the observer is visible.
- The observer marker remains visible.
- The horizon ring remains understandable without obscuring neighbouring coastline.
- Day/night shading and the twilight band are unchanged.
- The hoops, Sun rays, Moon placement, and view snaps are unchanged.
- No new panel or layout change is introduced.

---

## Done criteria

The work is complete when:

- the standard unmirrored Natural Earth PNG and its provenance are committed;
- the map is generated reproducibly from a pinned source;
- the runtime corrects Three.js UV handedness without altering the source PNG;
- the painted Earth and `observerZenith()` agree within `0.1°` in automated tests;
- London and Sydney appear on the correct coasts;
- the antimeridian seam is visually clean;
- minimum zoom reveals local coastline without the observer overlays hiding it;
- image failure retains the fallback texture;
- image completion after scene disposal is safely ignored;
- all automated commands pass;
- all manual checks pass.
