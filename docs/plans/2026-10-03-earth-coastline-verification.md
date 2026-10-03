# Earth Coastline Map Verification Record

**Date:** October 3, 2026
**Implementation baseline:** `e74bfd7c6d2a3ea45e8e8f1a327467fb213fe3a7`
**Post-review correction:** working tree after user visual review on October 3, 2026

This record captures the automated and manual acceptance evidence for `docs/plans/2026-10-03-earth-coastline-map.md`.

## Deterministic asset regeneration

Official source archive:

```text
C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/earth-land-source/ne_50m_land.zip
```

Verified source SHA-256:

```text
0b8e670cf80dce9cbebe2a193bc44ba5602758c22e1fa603980553646d7ff162
```

The generator was run twice from the checksum-verified local archive:

```bash
node scripts/generate-earth-land-map.mjs --source-archive C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/earth-land-source/ne_50m_land.zip
node scripts/generate-earth-land-map.mjs --source-archive C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/earth-land-source/ne_50m_land.zip
```

The committed PNG, first regeneration, and second regeneration all produced:

```text
2f3c2af5ec9752db57d3a15797d499dcf65ed7e0dc8dcd1c0aa17a0da6f97640
```

`git diff --exit-code -- app/src/assets/earth-land.png` passed after regeneration.

`file app/src/assets/earth-land.png` reported:

```text
PNG image data, 2048 x 1024, 8-bit/color RGBA, non-interlaced
```

Visual inspection of the source raster confirmed:

- west-left/east-right orientation;
- recognisable Britain, Madagascar, Japan, and New Zealand;
- no borders or labels;
- no ocean-spanning antimeridian streak;
- no visible first/last-column seam.

## Automated checks

The following checks passed during implementation and final verification:

```bash
npm run typecheck
node --experimental-strip-types --test src/lib/earth-map.test.ts
node --experimental-strip-types --test src/lib/astro.test.ts
npm test
npm run build
npx eslint src/components/space-scene.tsx src/lib/earth-map.ts src/lib/earth-map.test.ts
git diff --check
```

Results:

- Earth-map tests: 6 passed.
- Astronomy tests: 25 passed.
- Full suite: 86 passed, 0 failed.
- Production build emitted the bundled coastline PNG.
- No browser/runtime Natural Earth download was introduced.
- The existing non-blocking bundle-size, module-directive, and child-process deprecation warnings remain.

## Automated coordinate contract

`earth-map.test.ts` verifies that the transformed painted-Earth coordinate agrees with the displayed (Z-reflected) `ephemerisAstronomyProvider.observerZenith()` to within `0.1°` for:

- Greenwich equator;
- London;
- Sydney;
- Los Angeles as a western-longitude case;
- Tromsø as a latitude above 60°;
- two instants separated by more than one year.

The suite also checks the displayed geographic basis directly: with north up, `east × north` must point outward. This test failed against the first implementation and now prevents the render-level horizontal mirror reported during user review.

The same suite verifies:

- half-open `[-180°, +180°)` longitude wrapping;
- both sides of the antimeridian;
- north and south poles;
- explicit Earth Y-rotation and display-reflection signs;
- independent close-zoom scaling for the observer figure and horizon plate;
- scale clamping below radius 1.5 and above radius 2.25.

## Manual browser checks

Checks were made in fresh browser contexts at `1280×800` and `1440×900`. Fresh contexts were used after an older Vite HMR context retained a stale split-module error; direct HTTP checks and fresh contexts loaded the route and split module with HTTP 200 and no captured page errors.

### Orientation correction

The first verification pass tested internal coordinate alignment but did not test the handedness of the final camera-visible scene. Because astronomy vectors use +Z for increasing right ascension while Three.js uses +Y as north, the internally aligned globe appeared horizontally mirrored to the viewer.

The correction reflects the complete 3D model on Z, keeping the Earth, observer, Moon, Sun, and hoops in one frame while restoring familiar right-handed geography. The world-space shader Sun direction receives the same reflection explicitly.

Fresh close-view checks after the correction confirmed:

- North America has Baja and the Pacific coast on the left, with Florida and the Caribbean on the right;
- the Asia view proceeds west-to-east from Arabia through India to Southeast Asia;
- the day/night terminator still follows the reflected Sun direction;
- no WebGL or page error was captured.

### Locations

- **London — 51.5° N, 0°:** Britain and northwestern Europe rendered with detailed coastline. At minimum zoom the observer overlay remained compact and neighbouring coastline remained visible.
- **Sydney — 33.9° S, 151° E:** included in the automated reflected-coordinate alignment contract and used for the corrected Asia-Pacific browser view.
- **Los Angeles — 34.05° N, 118.25° W:** included as the automated western-longitude counterpart.
- **Antimeridian — 179.4° E:** minimum zoom showed no visible texture seam or ocean-spanning artifact.
- **Tromsø — 69.65° N, 18.96° E:** the high-latitude coastline and observer placement rendered without polar inversion.

### Zoom and camera

- Repeated negative wheel events reached the minimum close view without the camera entering the Earth.
- The figure and horizon plate shrank independently inside the hoops.
- The marker remained visible and nearby coastline remained readable.
- Repeated positive wheel events reached the wide-view clamp without errors.
- Existing three-quarter, edge-on, and north view-snap radii and presentation were unchanged.

### Animation and longitude changes

- Spin Earth was run in a clean browser context. The painted globe and observer marker rotated together without visible marker drift.
- After pausing, longitude was changed from approximately 19° E to 100° W while retaining the represented instant. The globe orientation remained tied to the instant and the marker moved to the corresponding painted geography.
- The URL and controls updated normally, and no page error was captured.

### Image loading and disposal

- Successful loading replaced the complete fallback with the detailed bundled coastline without a blank frame.
- Runtime image loading was forced to fail while allowing route and Vite modules to load. The ocean gradient, corrected fallback polygons, and graticule remained visible.
- The forced failure produced no application error or rejected promise.
- Cleanup calls `cancelLoad()` before texture disposal; the active guard is cleared and image callbacks are nulled, preventing a late load callback from mutating a disposed texture.

### Visual regression

The following remained unchanged:

- day/night and twilight shader appearance;
- equator, ecliptic, and lunar hoops;
- Sun rays and Moon placement;
- local sky chart;
- one-page layout;
- URL and place/time controls;
- view snaps.

## Conclusion

All implementation requirements and acceptance checks in the Earth coastline specification have been exercised. The generated asset is reproducible, the painted Earth and observer share the same reflected display frame, recognizable coastlines have familiar east/west handedness, close zoom preserves geographic readability, and the fallback remains complete and safe.
