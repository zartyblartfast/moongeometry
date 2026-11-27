# Sky-chart B — verification record

Date: 2026-11-27. Branch: `dev01`, base HEAD `3672294` (app baseline identical to `f3008e5`). This is a renderer/readability change, not an astronomy/provider change. The implementation checkpoint evidence below is preserved; final parent reviews, full-suite/build results and integration acceptance are recorded at the end. No push or deployment is part of this task.

## Implemented scope

- North-up presentation uses approved B's `12 20 296 296` viewBox with uniform `xMidYMid meet`. The physical layout remains centre `(160,168)`, horizon radius `118`.
- Visible annotations target 12 CSS px; cardinals target 13 CSS px / weight 500. Existing native `h-52 lg:h-64` stage heights remain 208 / 256 px; no panel-height changes.
- CSS supplies the correct native-stage font sizes on SSR/first paint. A ResizeObserver adjusts only two SVG presentation variables from the actual uniform meet scale, including width-constrained stages. It does not set React state, calculate ephemerides, or read text layout. It disconnects when leaving north-up/unmounting; orientation toggles are exercised.
- Canonical hidden export deliberately retains a nominal 256px presentation, independent of its 1px DOM host and responsive viewport. Its SVG markup stays byte-identical through resizing and orientation headings. `orientation-control.tsx` and `share-infographic.ts` were inspected but not modified.
- B's normal annotation anchors are retained: 30° `(100,129)`, 60° `(160,144)`, horizon `(234.34,78)`, zenith `(160,177)`. Small explicit alternatives avoid body markers in the tested equatorial/near-zenith cases: 60° `(125,153)`, zenith `(160,200)`. No generic label-layout engine was added.
- Native-phone/font testing required cardinal anchors N `(160,40)`, E `(292,168)`, S `(160,300)`, W `(28,168)`. These adjust annotation placement only. They provide clearance without enlarging the frame/panel or moving the horizon/astronomical points.
- North-up annotations paint above paths/summit with a restrained 3-world-unit background halo, below the actual Sun/Moon markers. Original paths, point attributes, strokes, colours, ring geometry and summit line attributes match all three immutable captured SVGs exactly.
- Orientation retains its separate `360x376` layout, 72 fixed bezel ticks, fixed sight, four degree labels, upright heading-rotated cardinals and no summit tick. Its original typography and annotation positions remain unchanged.

## Vertical RED → GREEN record

All logs and browser artifacts are under:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-sky-b/`

| Slice                  | Observed RED                                                                                                                               | Observed GREEN                                                                                | Logs                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Desktop B              | Original rendered viewBox was `0 0 320 336`, not `12 20 296 296`                                                                           | 1/1                                                                                           | `red-desktop.log`, `green-desktop.log`                      |
| Native phone           | At the real 208px stage, fixed desktop type rendered 30° at 9.75 CSS px                                                                    | 2/2 after inverse sizing and cardinal clearance                                               | `red-phone.log`, `green-phone.log`                          |
| Dynamic labels         | Near-horizon phone W/Moon bounding boxes overlapped; broader inspection also found equatorial 60°/Moon and near-zenith zenith/Sun overlaps | 3/3, six states × desktop/phone; protected labels and unobscured body markers in those states | `red-dynamic.log`, `red-placement.log`, `green-dynamic.log` |
| Primary-font clearance | Actual loaded Outfit put phone N's text box only 2.77px from the frame                                                                     | 6/6 after moving only N from y38 to y40                                                       | `red-outfit.log`, `outfit-browser-green.log`                |

Phone fixture setup initially timed out because civil metadata is in a collapsed region; readiness was corrected to inspect its text content, not visibility. The valid phone RED above was subsequently observed before production sizing changes. A later export helper used the wrong Close button accessible name; the helper was corrected to `Close share preview`. Neither setup issue was treated as a feature RED.

The existing refraction PNG check initially failed because it assumed the old SVG presentation transform. Only its world-to-PNG mapping was updated for B's 296-square frame, 640×672 serialization padding, and unchanged 444×310 infographic containment. The saved apparent astronomical point `(43.61,185.18)`, apparent/geometric altitude fixtures, input moments and astronomical assertions were not changed. Logs: `refraction-before-mapping.log` (9/10), `refraction-green.log` (10/10), final combined run below (16/16).

## Final focused commands/results

Run from `C:/hermes/moongeometry/app`, with the portable executable:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
ART='C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-sky-b'

MOON_SKY_ARTIFACT_DIR="$ART/final-browser" MOON_REFRACTION_ARTIFACT_DIR="$ART/refraction" \
  "$NODE" --test --test-concurrency=1 scripts/sky-chart-legibility.test.mjs scripts/refraction-ui.test.mjs
# 16/16: 6 new rendered regressions, 10 existing refraction regressions.
# final-focused-browser.log

MOON_SKY_FONT_DIR="$ART" MOON_SKY_ARTIFACT_DIR="$ART/outfit-browser-green" \
  "$NODE" --test scripts/sky-chart-legibility.test.mjs
# 6/6 again with real controlled Outfit 400/500/600 loaded and asserted.
# outfit-browser-green.log

"$NODE" --experimental-strip-types --test --test-concurrency=1 \
  src/lib/astro.test.ts src/lib/earth-map.test.ts src/lib/orbital-lines.test.ts \
  src/lib/orientation-ui.test.ts src/lib/share-infographic.test.ts \
  src/lib/true-north-orientation.test.ts src/lib/use-true-north-orientation.test.ts
# 104/104; focused-unit.log. Includes existing shared-snapshot/provider-call contract.

"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/eslint/bin/eslint.js src/components/sky-chart.tsx scripts/sky-chart-legibility.test.mjs scripts/refraction-ui.test.mjs
"$NODE" node_modules/prettier/bin/prettier.cjs --check src/components/sky-chart.tsx scripts/sky-chart-legibility.test.mjs scripts/refraction-ui.test.mjs
# All passed.
```

The normal test discovery now finds **40 files**, including `scripts/sky-chart-legibility.test.mjs` (previous supplied baseline: 39). No full-suite result is claimed. Existing unit tests emit the known react-test-renderer deprecation warning. Git reports existing Windows LF/CRLF normalization warnings; `git diff --check` passes.

## Rendered measurements and inspection

Measurements use each SVG's actual screen CTM and transformed viewBox, not the wider letterboxed SVG rectangle. Viewports use DPR 1, visual viewport scale 1, root font 16px.

| Rendering                                 | Stage | Horizon diameter | Annotation / cardinal | Minimum text-box-to-frame clearance, excluding halo |
| ----------------------------------------- | ----: | ---------------: | --------------------: | --------------------------------------------------: |
| 1440×900 / 1280×800, system sans fallback | 256px |        204.108px |        12 / 13 CSS px |                                             6.697px |
| 390×844 / 844×390, system sans fallback   | 208px |        165.838px |        12 / 13 CSS px |                                             4.103px |
| 1440×900, real Outfit                     | 256px |        204.108px |        12 / 13 CSS px |                                             7.422px |
| 390×844, real Outfit                      | 208px |        165.838px |        12 / 13 CSS px |                                             4.179px |
| 390×844, forced Georgia fallback          | 208px |        165.838px |        12 / 13 CSS px |                                             3.899px |

Rendered cases: northern winter `(51.5,-0.1)` and southern summer `(-33.9,151.2)` at mean-solar `2026-12-21 21:00`; apparent-horizon `(51.5,0)` at `2026-11-19 00:39`; equator `(0,0)` at `2026-12-21 21:00`; high latitude `(78,15)` at `2026-06-21 12:00`; near zenith `(0,0)` at `2026-03-20 12:00`. Both desktop/phone passes have no label-label or label-body-marker bounding-box overlaps in these cases. Dynamic paths may cross labels; the halo/paint ordering protects them. This is **not** a proof of zero astronomical collisions for every place/moment.

Also exercised: 390 → landscape 844 → desktop 1280 → 390 resizing; a width-constrained 220px SVG to distinguish actual meet scaling from viewport assumptions; JavaScript-disabled SSR first paint; failed remote font loading; alternate serif font; headings 0/90/180/270; exiting orientation back to north-up.

Actual screenshots were visually inspected, not merely generated. Primary-font evidence is in `outfit-browser-green/`: `desktop-1440-north.png`, `resize-1280-800.png`, `resize-390-844.png`, `resize-844-390.png`, `{north,south,horizon,equator,high-latitude,near-zenith}-{1440,390}.png`, `orientation-{0,90,180,270}.png`. The parallel fallback captures are in `final-browser/` (runs were serial, not concurrent). The stage stays compact; no claim that every existing page section fits entirely within a viewport is made.

Real **1600×900 PNGs**: `final-browser/canonical-north-export.png`, `final-browser/oriented-phone-canonical-export.png`, their Outfit-pass counterparts, and `refraction/refraction-share.png`. Native sky-panel crops were inspected. The north-up sky-region pixels and the complete metadata block are identical before/after orientation plus viewport changes within each font pass; hashes are recorded in each pass's `export-digests.json`. Mean-solar/civil lines and diagram panel placement remain unchanged.

## Provenance and resource ownership

- `checkpoint-summary.json` contains exact source/font/export SHA-256 hashes, per-case measurements, discovery count and all 9 unrelated-file comparisons.
- Rendered source hashes:
  - `src/components/sky-chart.tsx`: `87f2cb8a9ef96b918732f80fd7aba1b004c64a1332aaf524a7a8d7f5f424951d`
  - `scripts/sky-chart-legibility.test.mjs`: `84d2840d199696b05de4f76dc1eceab0d0328d4f6d16b4a37e08dc79e60ad896`
  - `scripts/refraction-ui.test.mjs`: `ee5d6bf9448419539d04e0d8af82032e15e316e22b8b97eca0cfdf6069c12fdf`
- Outfit primary-font test assets were downloaded only into scratch from Google's Outfit v15 endpoint, via the CSS stored as `outfit.css`; they are not dependencies or shipped app assets. Ordinary tests run offline with font failure/fallback. The optional primary pass reads `outfit-{400,500,600}.ttf` from `MOON_SKY_FONT_DIR` and serves those bytes as data-font faces.
- Final normal fixture: `http://127.0.0.1:51285`; final Outfit fixture: `http://127.0.0.1:52552`. Both are **closed**, not live preview links. Each `resources.json` reads zero contexts before browser close, disconnected browser, and `serverListening: false`. All owned contexts/browser/Vite servers were closed through their APIs, including failed RED runs.
- Parent-owned `http://127.0.0.1:58211/` was neither stopped nor restarted; a read-only HEAD request returned HTTP 200 at checkpoint. No new persistent preview server was left behind.
- The supplied `unrelated-baseline.json` comparison is **9/9 unchanged**, including both tracked sketch index files and unrelated untracked planning/sketch files. The approved sketch directory and task plan were not modified.

## Final parent review and integration acceptance

Task-owned repository scope, staged explicitly without unrelated work:

1. `app/src/components/sky-chart.tsx`
2. `app/scripts/sky-chart-legibility.test.mjs` (new)
3. `app/scripts/refraction-ui.test.mjs` (presentation-to-PNG mapping only)
4. `docs/plans/2026-11-27-sky-chart-b.md`
5. `docs/verification/2026-11-27-sky-chart-b.md` (this record)

No dependency/config/provider/projection/globe/clock/orientation-controller changes.

### Independent reviews

- Spec reviewer `sa-0-7fe7d500`: **PASS**, no gaps or scope creep. Independently checked the complete five-file scope, RED/GREEN logs, source hashes, actual phone/PNG artifacts and normal discovery.
- Independent code/security and integration reviewer `sa-0-3789753d`: **PASS**, no blocking security concerns or logic errors. Checked observer cleanup, responsive/hidden-export separation, orientation isolation, preserved geometry, complete new test and owned fixture cleanup. Independently verified the unchanged refraction world point maps to PNG pixel `(1158,526)` through B and the serializer's 16px meet padding.
- Nonblocking future test-hardening suggestions: assert the full non-cardinal annotation set explicitly, and replace fixed resize sleeps with bounded polling. The required annotations are currently rendered; no production change was requested by review.
- Parent added-line static security scan: no findings. Evidence: `parent-staging-security.json`, `parent-reviews.json`.

### Complete serial gate

Run from `app`, using portable Node; the build started only after all browser-backed tests exited:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
OUT='C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-sky-b'
"$NODE" node_modules/typescript/bin/tsc --noEmit
MOON_SKY_ARTIFACT_DIR="$OUT/parent-full-browser" MOON_REFRACTION_ARTIFACT_DIR="$OUT/parent-full-refraction" \
  "$NODE" scripts/run-tests.mjs --test-concurrency=1
"$NODE" scripts/with-app-env.mjs "$NODE" node_modules/vite/bin/vite.js build
"$NODE" scripts/migrate.mjs
```

**PASS: 484 tests, 484 passed, 0 failed, 0 skipped; 40 discovered files.** Baseline was 478 passed across 39 files. Final typecheck and production build passed. Migration safely skipped without `DATABASE_URL`; the existing PGLite fallback migrates itself. Targeted ESLint and Prettier passed for all three changed source/test files; staged whitespace check passed. Existing upstream build/deprecation/line-ending warnings remain non-fatal.

Evidence: `parent-final-typecheck.log`, `parent-final-suite.log`, `parent-final-build.log`, `parent-final-migrate.log`, `parent-final-gate.json`. Final source/test hashes match the implementation checkpoint above; only this verification record was updated after review.

### Parent's live-rendered acceptance

- Independently measured 1440x900, 1280x800, 390x844 and 844x390. Stage heights remain 256px desktop / 208px phone; labels measure 12 CSS px and cardinals 13 CSS px. Horizon diameters are approximately 204.108px desktop / 165.838px phone, with no horizontal overflow. Loaded-Outfit minimum phone text clearance was 4.179px against the transformed viewBox.
- Original before/after desktop and phone captures have exactly matching physical polyline/circle/summit-line attributes. This is a presentation-frame/type change, not new astronomical geometry.
- Foregrounded the live CDP target before resize measurements and waited for measured typography to settle; a background tab's delayed ResizeObserver delivery is not a foreground layout failure.
- Exercised Spin Earth and Slide the Moon independently from the restored fixed shared URL. Both move the actual Moon marker; Spin advances the clocks, and Slide preserves 21:00 mean-solar time while dates advance. Evidence: `parent-animation-checks.json`.
- Generated another real Share PNG through the app and inspected its native sky region. All eight annotations remain readable, with all four cardinals visible and the chart canonical north-up; mean-solar/civil metadata and diagram panels remain intact. Evidence: `parent-share.png` and `parent-after-*.png`, plus `parent-after-measurements.json`.
- Verified HTTP 200 for both the app and actual sky-chart module after the build, confirmed both contain B's frame, and opened the integrated app in the desktop preview. Evidence: `parent-endpoint-check.json`.
- All **9/9 unrelated baseline hashes still match**. The task-owned five-file patch is the only integration commit scope; unrelated sketches/plans stay untouched and unstaged. No push or deployment is authorized by this task.

Native Safari, physical Pixel/iOS sensor behaviour, arbitrary accessibility text scaling and exhaustive astronomical label-collision freedom are **not certified** by these Chromium desktop/emulation checks.
