# Observer-to-Moon sightline anchor verification

## Scope

Base local commit: `fed65cb8ece58b6f85ed8d4e9b8a74dfa2392931` on `dev01`; application source before this fix is the accepted `99292fe` release. The preceding local commit contains isolated layout studies only.

User reported that the sightline appeared to stop short of the location marker, especially while zooming the orbital diagram. B with Fit Viewport is a tentative layout-study preference, not an instruction to implement that layout in this renderer fix.

Task files:

- `app/src/components/space-scene.tsx`
- `app/scripts/observer-sightline.test.mjs`
- This verification record

No astronomy, clocks, coordinates, Earth/Moon positions, camera controls, marker scaling, line style, depth behavior, layout, dependencies or study files are changed.

## Reproduction and root cause

The cream observer marker is intentionally lifted from the sphere to avoid surface interference: its centre is `zenith * (EARTH + 0.025)`. The old line instead began at `zenith * EARTH`. These are distinct 3D points; perspective makes their apparent separation grow during close zoom, and Earth can hide the mismatched line's beginning.

The tight rendered regression failed on the old code for exactly that contract:

```text
initial near-horizon: sightline starts at actual location marker
(gap 0.025000012256356438)
SIGHTLINE_RED_EXIT=1
```

The fix takes the start point directly from the actual `figure.position`. The Moon endpoint, camera transforms, scene reflection, material, opacity and depth testing are untouched. This is a connection to the existing displayed marker, not a change to the physical observation model or a new observer elevation.

## RED/GREEN and focused checks

With portable Node from `app`:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
MOON_SIGHTLINE_ARTIFACT_DIR='<artifact-directory>/green' \
  "$NODE" --test scripts/observer-sightline.test.mjs
```

- Before editing: baseline typecheck and focused astronomy/Earth-map tests passed, **34/34**.
- New regression: observed RED against the original renderer, then **1/1 GREEN** after the single anchor correction.
- Regression reaches the real Three.js scene via a response-only module hook; no diagnostic globals are added to shipped application code.
- It checks actual marker and Moon endpoint identity in world/screen space, actual nearby sightline framebuffer pixels, preserved depth testing, near-horizon Earth clearance for the seeded visible-Moon case, all three camera presets at normal/near/far zoom, free rotation, and resizing to 340x452, 844x390 and 1440x900. Only owned browser/context/Vite resources are closed; temporary auth/database environment changes are restored.

## Matched real-browser evidence

The parent captured New York, `lat=40.7`, `lon=-74`, November 27, 2026, at mean solar 20:00, 23:00 and 12:00, each at radius 6.4, 1.5 and 12. The nine matched before/after cases preserve every displayed scientific value and retain normal depth testing.

- Maximum measured projected marker/line gap before: **11.939982632257024 CSS px**.
- Maximum measured gap after: **0.0000070015852464901 CSS px**, below 0.001px in the measured cases. Residual is Float32 geometry precision, not a visible detachment.
- The above-horizon near-horizon example now connects visibly to the cream marker at both default and close zoom. Genuine Earth occlusion remains enabled; the fix does not draw an always-on-top ray through the planet.
- A real **1600x900 Share PNG** was downloaded and opened. Both diagrams/time metadata remain legible; the corrected orbital connection is present.
- Before/after viewport screenshots and scientific values were independently inspected. No page errors occurred in the matched diagnostic runs.

Artifact directory:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-sightline/`

Key files: `baseline.json`, `red.log`, `green.log`, `green/observer-sightline.json`, `diagnostic.json`, `before-2000-default.png`, `before-2000-near.png`, `after/diagnostic.json`, `after/after-2000-default.png`, `after/after-2000-near.png`, `after/sightline-share.png` and `after-diagnostic.log`.

## Final integration gate

Independent review `sa-0-bb10124c` passed the complete three-file staged patch, with no security concerns or logic errors. Source/test hashes matched the reviewed evidence. Nonblocking suggestions were condition-based camera-state waits, location/time-change coverage, and outermost-finally environment restoration; these do not change the renderer verdict.

**Final serial gate PASS:** 501 tests passed, 0 failed, 0 skipped, across 41 normally discovered test files. Typecheck, targeted ESLint/Prettier, staged whitespace/security checks and production build passed. Migration safely skipped without `DATABASE_URL`; the existing PGLite fallback migrates itself. Browser-backed tests and build ran serially. Reviewed source/test hashes remained identical through the gate.

The parent additionally exercised the actual live B study with its native **Fit Viewport** selection at a 340x452 inner viewport, matching the reported preview size. At normal, minimum-radius and maximum-radius zoom, the connector remained attached and depth testing stayed enabled, with no page/console errors. Evidence: `fit-b-acceptance.json`, `fit-b-default.png`, `fit-b-near.png` and `fit-b-far.png`.

Final gate evidence: `final-typecheck.log`, `final-suite.log`, `final-build.log`, `final-migrate.log`, `final-gate.json`, `full-sightline/observer-sightline.json` and `reviewed-source-hashes.json` in the artifact directory above. Final source changes remain only the shared-anchor correction; no new styling, layout or astronomy changes were introduced after review. Main/production remain unchanged pending user acceptance.

All nine unrelated user-file hashes and all eleven committed layout-study file hashes are protected by `baseline.json`; they must be rechecked before committing. The local study and existing upstream server are not stopped by the test fixture.

## Limits

Rendered checks use Chromium and emulated viewport sizes, not native Safari, physical-device or accessibility certification. Camera zoom can legitimately move the Moon or location outside the frame, and Earth can legitimately obscure a location/connector. The contract is shared 3D attachment and preserved scene occlusion, not forcing every object to remain visible from every camera angle.
