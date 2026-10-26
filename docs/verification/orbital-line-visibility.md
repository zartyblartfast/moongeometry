# Orbital line visibility: Stage 1 verification

## Decision and scope

Compared original `LineBasicMaterial` curves against equal 1.25 and 1.5 CSS-pixel
`Line2` curves, retaining all three colours, sample points, radii, and camera
settings. Also compared coverage antialiasing on/off. Selected **1.25 CSS px**:
it provides clearer high-density curves without the heavier appearance of 1.5.
No ecliptic colour change, theme change, or new UI control is included.

Only equator/ecliptic/lunar reference curves use `Line2`. Axis, observer sightline,
secondary guide, sunlight and SVG fallback retain their previous materials.

The existing scene reflects Z for astronomical display handedness. Runtime
comparison initially showed that default single-sided screen-space quads were
culled. `DoubleSide` fixes their visibility without disabling depth testing or
changing scene transforms, points, render order, or orbit motion.

Coverage antialiasing is enabled only when the actual WebGL default framebuffer
has more than one sample. A forced no-MSAA context was tested separately.
The installed LineSegments2 `onBeforeRender` updates resolution from the renderer's
CSS viewport; width is not multiplied by device pixel ratio. Each replaced
geometry is disposed, and final line geometries/materials are disposed at unmount.

## Reproduction

From `app`, run `npm run dev`, then:

```sh
npm run test:orbital-lines
node scripts/check-orbital-lines.mjs http://localhost:8080 <artifact-directory>
npm run typecheck
npx eslint src/components/space-scene.tsx src/lib/orbital-lines.ts src/lib/orbital-lines.test.ts scripts/check-orbital-lines.mjs
npm test
npm run build
git diff --check
```

All passed. The new unit file is included in the normal npm test list.
The browser command instruments the Vite response in-memory only, not production
source. It asserts actual framebuffer pixel differences for each individual
primary curve, catching the reflected-quad disappearance that helper tests alone
would miss. It also checks live viewport resolution, GL/runtime/console errors,
rotation, both animations, date-dependent geometry disposal and route-unmount
cleanup. It captures a real Share/Download PNG rather than a synthetic export.

Tested desktop 1280x800/DPR1, desktop 1440x900/DPR2, Pixel 7 portrait/landscape,
plus desktop with MSAA disabled. Three-quarter, From the north and Edge-on views,
closest/furthest camera zoom, resize and WebGL-unavailable SVG fallback passed.
Screenshot inspection covered crossings, loop continuity, Earth occlusion,
phone clarity and actual exported image. Existing mobile title truncation and
extreme-zoom cropping are outside this rendering-only change.

The original/final comparison uses latitude 51.5, longitude 0, mean-solar date
2026-10-26 at 12:00, Three-quarter preset, 1280x800 viewport, DPR1, default camera
zoom and 100% browser zoom. Original is from base `601dec7`; after is the actual
integrated app. See `orbital-line-comparison.png` beside this document. The
export artifact follows the browser test's animation and date-update exercise,
so its time/camera state is not the comparison fixture.

## Evidence SHA-256

- `app/src/lib/orbital-lines.ts`: `3155a244b1b8a1dc4e2520b20bbf2fd0fff960b901e06d3dba5ab91e5e802862`
- `orbital-line-comparison.png`: `4dca095104412a73f02ff3f2a754fff10716ef4703202d14bf83d9976fc06b26`
- `orbital-line-export.png`: `44f706e13bd92ffe62c8680467e8134e5a3c4f3042919a97ef91d4d76fb7a899`

Existing build chunk-size and test-renderer/MockTimers notices remain. Testing
uses desktop Chromium with emulated phone viewports and DPR, not a physical Pixel
GPU. Keep this on `dev01`; physical-phone visual acceptance remains with the user.
