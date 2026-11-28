# Layout B integration — focused implementation verification

## Outcome and release boundary

The approved chart-adjacent B composition is integrated in the real Moon Path app. It activates only with the existing editor expanded, CSS width **640–1023 inclusive**, and height **at most 540**. Fit Viewport means the actual responsive browser/pane width; there is no new viewport selector, fixed canvas, iframe, camera-reset action or fullscreen feature.

**Focused implementation and independent parent spec/code/security reviews pass. The latest full-gate and release status is recorded in the parent completion section below. Production promotion is explicitly not approved or performed.** No worker staging, commit, push, build, dependency installation or deployment was performed. Integration began at `9af677053fc8d45f03abf54f56989c7953dd69e1` on dev01.

## Complete task-owned repository file list

Modified:

- `app/src/components/moon-app.tsx`
- `app/src/components/place-search.tsx`
- `app/src/styles.css`

Created:

- `app/scripts/landscape-editor.test.mjs`
- `docs/verification/2026-11-28-layout-b-integration.md` — this record
- `docs/plans/2026-11-28-layout-b-integration.md` — parent-authored approved integration plan

The parent-owned plan was read, not rewritten, by the implementer. No optional component/hook files were added. A reusable lesson was added to the **active moongeometry profile's** MoonGeometry skill; no repository `.impeccable` metadata or another profile's files were written.

### Composition and rationale

- The sky/controller, editor section and orbital section have stable React ancestry and a concrete source order: sky (including its native chart and primary fields), remaining editor, orbit. CSS reproduces the original ordinary/desktop positions; B's reading and Tab order agree with its visible order. This replaces the study's semantic flattening/reordering, rather than shipping its tagging CSS.
- A stable, nonsemantic `sky-comparison` wrapper keeps the native chart mounted in every mode. Only formatting is flattened outside B. In B it becomes a fluid two-column grid, full native ordinary **208px** sky at left and the existing complete time group plus latitude at right. The active orientation instrument retains its own larger native stage.
- The original time and latitude JSX/callbacks are defined once and rendered at one location at a time. In B a native fieldset/hidden legend names “Time and latitude”; UTC and civil lines remain plain text. Default fieldset margin, minimum width, padding and border are neutralized.
- The viewport subscription starts after mount from an initially false state, so SSR/hydration agree, and removes its listener on unmount. No layout state enters observation persistence or the URL.
- Primary input nodes move only at mode boundaries, never ordinary edits/frames. Draft ownership stays in MoonApp. Before a media-state transition the actually focused primary control is recorded; a layout effect restores the corresponding control with `preventScroll`. Keyboard disclosure entry focuses time only when opening directly into B. Pointer opening does not autofocus, and an out-of-gate keyboard request cannot be resurrected by a later resize.
- The observer sightline repair is retained exactly. Renderer, sky model, orientation controller, store, astronomy/providers, exports and dependencies are unchanged. The existing observed-view memo, URL construction/synchronization and native date/time/scrubber callbacks also compare byte-for-byte with the original source slices.

## Evidence handles

All generated evidence is under:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-layout-b-integration/`

- `baseline.json`: parent inventory of 9 unrelated files, 16 immutable source/dependency files and 11 study files.
- `native-baseline/`, `baseline-run.log`: original, **pre-UI-edit** native rectangles, input/clock/stat values, SVG geometry and screenshots in ten fresh contexts: both actual fonts and controlled fallback at 1440×900, 1280×800, 390×844, 340×452 and collapsed 844×390. Readiness required controlled 20:00, an attached IANA marker (not necessarily visible) and settled fonts.
- `clean-baseline-provenance.json`, `baseline-app.zip`, `archive-baseline.mjs`, `archive-baseline.log`, `clean-baseline/`, `supplemental-baseline/`, `supplemental-baseline.log`: supplementary original-commit measurements, including **expanded** 390/340 portrait. This clean scratch archive reuses installed dependencies through a directory junction; there was no dependency install or working-tree source undo. Windows Git archive converts line endings to CRLF; provenance records raw hashes and verifies source identity after line-ending normalization. The original pre-edit evidence is retained separately.
- `red-1.log` through `red-4.log`, corresponding artifact directories: real rendered failing tracer runs.
- `green-1.log`, `green-2.log`, `green-3-final.log`, `green-4.log`: successive passing tracer runs.
- `final-focused.log`, `final/evidence.json`: final maintained rendered test run and native state evidence.
- `ui-hardening.log`, `sky-chart-legibility.log`, `refraction-ui.log`, `observer-sightline.log`: serial existing focused suites.
- `targeted-quality.log`: successful typecheck, targeted ESLint and Prettier checks.
- `audit.mjs`, `integrity.log`, `integrity-and-summary.json`: executable integrity/count audit, complete protected hashes, owned file hashes, discovery check, cleanup and upstream HTTP checks. Run again after parent changes to refresh its attestation.

### Rendered RED → GREEN tracers

| Tracer | Actual RED | Implementation GREEN |
|---|---|---|
| Shared comparison position | `red-1.log`: full sky + complete time + latitude + primary result required **675.796875px** in a 390px viewport | `green-1.log`: semantic chart-adjacent group; final union **237.796875px**, native stage exactly 208px |
| Keyboard entry/order | `red-2.log`: keyboard opening did not focus the primary time field | `green-2.log`: deliberate source order, keyboard-only entry and actual ARIA group targets |
| Focus/draft through resize | `red-3.log`: focused time was lost at 639×390 | `green-3-final.log`: primary focus captured before media update and restored in a layout effect; incomplete draft and committed URL preserved |
| Stale autofocus request | `red-4.log`: a portrait keyboard disclosure request stole focus after later landscape resize | `green-4.log`: entry request constrained to an immediate B opening |

These were vertical tracers, not a pile of source-pattern assertions followed by a single implementation. Subsequent validation expands the already-rendered behavior. The new suite has no shipped store/test globals or synthetic scientific event dispatch. Its optional camera and observed-call counters modify only served responses inside the owned test context.

## Final executed results

| Focused command | Result |
|---|---:|
| `node --test scripts/landscape-editor.test.mjs` | **11/11**, zero failures/skips |
| `node --test scripts/ui-hardening.test.mjs` | **28/28** |
| `node --test scripts/sky-chart-legibility.test.mjs` | **6/6** |
| `node --test scripts/refraction-ui.test.mjs` | **10/10** |
| `node --test scripts/observer-sightline.test.mjs` | **1/1** |
| Focused aggregate, calculated from TAP logs | **56/56** |
| Maintained test discovery (enumeration only) | **42 files**, new script included |
| Typecheck / changed TS/JS ESLint / changed source-test Prettier | pass / pass / pass |
| `git diff --check` | pass (Windows line-ending warnings only) |

The full suite/build were deliberately **not** run by the implementer. Do not infer the eventual full-suite total from these scoped results.

### Native interaction and lifecycle coverage

- Four exact scientific touch edits: time **20:00 → 23:00 → 20:00**, latitude **40.7 → 20 → 40.7**. Chromium CDP supplies native trusted touch; each drag samples 12 intermediate positions and records at least five distinct values (nine in each final recorded drag). X/Y/width/height remain stable under the finger; full sky, complete time, latitude and primary result remain inside the window at every sample.
- The interaction run chooses one initial comparison position, then uses **zero repeated inspection/return scrolling**. Window scroll/reset/repair and `scrollIntoView` spies remain empty during edits; history length stays unchanged and observation edits replace the existing query. Trusted numeric typing edits the native time field and repeated native Arrow keys make the exact latitude changes back and forth. Actual seed-restored statistics and geometric SVG attributes match the starting state.
- The comparison position's initial reveal is recorded separately in `final/evidence.json`; it is not a minimum-scroll claim. Native hour segments are selected by a trusted click before numeric typing. Native `Home` can perform browser page navigation; it is not used as an implicit scroll-repair mechanism.
- One each of original date/time/search controls and all four original ranges; unique IDs, native fieldset/legend, valid dl/div/dt/dd structure, original standard-atmosphere annotation and rise/set caveat. No positive tabindex and no nested vertical scroller. All ten enumerated secondary controls are brought into actual window rectangles, not merely checked with CSS visibility.
- Native forward/back Tab reaches the preceding Explain action and traverses time/scrubber/latitude, current actions, disclosure, search, date's internal segments, longitude, spin and orbital action in semantic order. Keyboard collapse retains its opener; pointer reopening does not focus time.
- **19** primary responsive transitions exercise both directions around width 639/640, 1023/1024 and height 540/541, plus portrait/landscape. Time remains focused with an incomplete blank draft and retains its last valid instant/query; explicit blur restores 23:00. Focused edited latitude and scrubber survive additional boundary changes. There are zero history writes on resize. A response-only counter proves no extra observed snapshots/paths during the 15 unchanged-observation resize states.
- The exact same orbital canvas, camera object and sky horizon DOM element survive the main boundary matrix. A genuinely free-rotated camera retains its position/up vector. The media subscription count is one while mounted, zero on Lunar Parallax navigation and one on return.
- Fresh independent context restores the exact edited shared mean-solar date/time and coordinates, query keys and scientific statistics; it cannot borrow the originating store/local storage.
- Real Slide start changes displayed declination; real pause leaves the primary simulation disclosure. Spin changes the native clock without erasing independent-orbit disclosure. Current time and Summer preset clear it through native actions. Both hemispheres are exercised with trusted drags.
- Explain uses an actual captured opener and a bounded 2000ms wait for Radix's asynchronous Escape-focus restoration. Share generates/downloads/decodes a real **1600×900** PNG with nonempty rendered pixel variety, not a thumbnail stand-in.
- Current location uses explicit **simulated New York coordinates**, never the operator's location. The real unsupported-orientation path retains readable status and the native ordinary 208px sky. The existing DEV preview then verifies retained 37° session state across five additional viewports and a stage larger than 208px; this is controller/layout evidence, not physical sensor certification.

### Geometry and visual checks

- **14 out-of-gate comparisons** match original native rectangles, all input values/rectangles, headers, scientific stats and SVG geometric attributes exactly: ten original cases plus actual-font/fallback expanded portraits at 390 and 340. Ordinary desktop sky is 256px; ordinary phone sky is 208px. No horizontal overflow.
- Six B comparison captures cover widths 640, 844 and 1023 at height 390 with actual Outfit/Fraunces and controlled fallback. Their complete comparison union is 237.796875px and ordinary native stage 208px; no chart shrink is used to pass.
- `final/evidence.json` contains **39 recorded state entries**. `final/` contains **38 nonempty PNGs**, **36 distinct pixel-file hashes**; intentional same-state duplicates are not counted as unique. Counts are generated by `audit.mjs`, not estimated.
- Representative inspected images: `final/comparison-fonts-844-position.png`, `final/interaction-start.png` (fallback), `final/fonts-1440x900.png`, `final/fonts-340x452-expanded.png`, `final/active-instrument-preview.png`, and the actual `final/layout-b-share.png`. Desktop paired diagrams and ordinary portrait stacking remain native. Active-instrument status/selected-time guidance stays in normal document flow; it may require ordinary page scrolling.

## Reproduction commands

From `C:/hermes/moongeometry/app`, using the installed portable Node:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
EVIDENCE='C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-layout-b-integration'

# Original pre-edit capture (already archived; do not overwrite it):
MOON_LAYOUT_BASELINE=1 MOON_LAYOUT_ARTIFACT_DIR="$EVIDENCE/native-baseline" \
  "$NODE" --test scripts/landscape-editor.test.mjs

# Reproducible original-commit scratch archive + expanded portrait baseline:
"$NODE" "$EVIDENCE/archive-baseline.mjs"
MOON_LAYOUT_ROOT="$EVIDENCE/clean-baseline/app" MOON_LAYOUT_BASELINE=1 \
  MOON_LAYOUT_ARTIFACT_DIR="$EVIDENCE/supplemental-baseline" \
  "$NODE" --test scripts/landscape-editor.test.mjs

# Final real-app focused run:
MOON_LAYOUT_BASELINE_DIR="$EVIDENCE/supplemental-baseline" \
  MOON_LAYOUT_ARTIFACT_DIR="$EVIDENCE/final" \
  "$NODE" --test scripts/landscape-editor.test.mjs

# Each command below was run serially, not overlapping browser fixtures:
"$NODE" --test scripts/ui-hardening.test.mjs
"$NODE" --test scripts/sky-chart-legibility.test.mjs
"$NODE" --test scripts/refraction-ui.test.mjs
"$NODE" --test scripts/observer-sightline.test.mjs
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/eslint/bin/eslint.js \
  src/components/moon-app.tsx src/components/place-search.tsx \
  scripts/landscape-editor.test.mjs
"$NODE" node_modules/prettier/bin/prettier.cjs --check \
  src/components/moon-app.tsx src/components/place-search.tsx \
  src/styles.css scripts/landscape-editor.test.mjs
"$NODE" "$EVIDENCE/audit.mjs"
```

Tracer commands used the same test entry, artifact variable and `--test-name-pattern` values `expanded landscape`, `keyboard disclosure`, `focused primary edits`, and `portrait keyboard disclosure`. The archived RED logs correspond to the test/source versions at those tracer points, not claims that the completed app still fails.

## Integrity and resource ownership

- All **9 unrelated + 16 immutable + 11 study** SHA-256 entries match `baseline.json`. The immutable renderer hash is the same one containing `20f618f`; no sightline workaround or renderer edit was introduced.
- Each browser fixture binds its own OS-assigned **127.0.0.1** port, explicitly disables auth, unsets DATABASE_URL, and restores the previous environment in `finally`. Final read-back evidence is `contextsRemaining: 0`, `browserClosed: true`, `serverClosed: true`, `environmentRestored: true`.
- Only owned contexts/browser/Vite servers are closed through their APIs. Upstream **58211** and study proxy **51354** were not stopped or reassigned; the audit reads HTTP 200 from the app and proxy health endpoint after completion. Do not layer old study CSS over the newly integrated DOM.
- During the focused implementation no git ref or production deployment changed. The nine unrelated user-file hashes and parent plan were preserved; the dirty tree was intentional for parent review.

### Final implementation/test hashes

| File | SHA-256 |
|---|---|
| `app/src/components/moon-app.tsx` | `96f13c8ccb91a8326c8ceb73925e35f546f9719b14372e7995e73a951b471abf` |
| `app/src/components/place-search.tsx` | `2fc67ea2301d2a6bb6efdc363cfc20344719b3d3c0c47a1dea5ee9ff1d96d08b` |
| `app/src/styles.css` | `d090cb95882475fb255a8ed6991562047062ef0fe1b43d09142ed3390d8a34e6` |
| `app/scripts/landscape-editor.test.mjs` | `caa382961f128da07356295546aaa0de8252e920729a09fadafbe504e4e56e06` |

Worker-owned hashes are generated in `integrity-and-summary.json` after this document is written. The parent records the complete six-file integration scope and final fingerprints in `parent-final-attestation.json`.

## Warnings, harness corrections and limits

- Nonfatal Chromium WebGL ReadPixels GPU-stall warnings are retained in evidence. Git reports LF→CRLF working-copy warnings; `diff --check` passes. Unused Google Font subset faces can remain “unloaded”; the used Outfit and Fraunces faces are loaded in actual-font captures, separately from blocked-font fallback.
- Early development runs exposed harness assumptions as well as the intended app failures: native time Tab can move between internal segments without blurring; router serialization canonicalizes numeric coordinates (`-74`, not `-74.0`); native `Home` can scroll the page; full-page screenshots can temporarily resize the viewport and move a focused native range's scroll. The final interaction fixture uses explicit blur, actual canonical URL values, trusted hour-segment selection and **viewport** screenshots. It never repairs application scrolling to hide a failure.
- An early orientation selector incorrectly used the visible text instead of the existing accessible name; corrected to the real aria-label. The clean archive initially checked raw byte equality before recognizing Git's CRLF conversion; provenance now verifies normalized source identity explicitly.
- Desktop Chromium with touch emulation is not physical-phone, Safari/iOS, soft-keyboard/browser-chrome, screen-reader or sensor certification. Exact native time-segment selection across remounts is not claimed; the controlled incomplete-draft and committed-instant/blur contracts are exercised. The active DEV orientation preview is not true-north hardware evidence.
- Very short viewports cannot display an arbitrarily tall active instrument plus all guidance simultaneously; normal single-page scrolling remains intentional. No nested scrolling or scientific-content removal was introduced to conceal this.

## Parent independent acceptance and reviews

- Parent actual-app acceptance (`verify-actual.mjs`, `parent-local.log`, `parent-local/results.json`) passed at 1280×800, 390×844 and 844×390. It independently verified native stage sizes and unique original controls, Explain/Escape with bounded opener-focus restoration, real Slide/pause/reset, and no browser errors or horizontal overflow. The landscape case made four trusted CDP touch edits without repeated comparison travel, scroll repair or history growth, checked native latitude keys, and retained focused time plus the exact canvas/horizon nodes across 639/844/340/844 boundaries. Its actual downloaded PNG is 1600×900.
- The parent then ran the maintained workspace and all-four-slider regressions **serially** against the actual app (`parent-workspaces.log`, `parent-sliders.log`): workspace/direct route/return-state/Back, trusted touch and repeated keyboard edits, stable viewport/history and fresh-context shared-URL restoration all passed.
- Spec review `deleg_2e933837` / `sa-0-eca610ae`: **PASS**, no gaps, scope creep or suggestions. The reviewer read all six staged files, compared baseline/native interaction evidence, inspected actual artifacts, and confirmed four genuine rendered RED→GREEN tracers.
- Code/security review `deleg_8014cd17` / `sa-0-ac9bb400`: **PASS**, no security concerns or logic errors. The reviewer read the complete 106626-character six-file staged diff, including all 1258 lines of the new fixture, and matched all four frozen source/test hashes.
- Nonblocking follow-up: exact archived geometry comparisons are conditional on `MOON_LAYOUT_BASELINE_DIR`. The parent full gate explicitly sets this variable to the original-commit supplemental baseline. Ordinary suite runs retain the native-size, responsive-gate, control, lifecycle and interaction assertions; making the complete archived comparison portable to CI remains a potential later coverage improvement, not a claim of CI baseline coverage.
- Parent review attestation: `parent-reviews.json`; frozen implementation/test fingerprints: `parent-reviewed-source-hashes.json`. No implementation/test changes were made after these reviews.

## Parent full serial gate

Process `proc_501ecac68ccd` completed with **`B_FINAL_GATE_EXIT=0`**. Actual TAP totals: **512 tests, 512 passed, 0 failed, 0 cancelled, 0 skipped**, from **42 discovered files**. The new rendered fixture ran with the archived supplemental baseline explicitly enabled; its 14 out-of-gate comparisons passed again. Its read-back cleanup reports zero contexts, closed browser/server and restored environment.

The production build and typecheck passed. Migration returned the expected `[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).` Nonfatal Rolldown/Radix module-directive warnings remain in the build log; they were not hidden or treated as application failures.

Exact serial commands, from `app`, with `NODE` and `EVIDENCE` defined above:

```bash
"$NODE" node_modules/typescript/bin/tsc --noEmit
MOON_LAYOUT_BASELINE_DIR="$EVIDENCE/supplemental-baseline" \
  MOON_LAYOUT_ARTIFACT_DIR="$EVIDENCE/parent-full-layout" \
  "$NODE" scripts/run-tests.mjs --test-concurrency=1
"$NODE" scripts/with-app-env.mjs "$NODE" node_modules/vite/bin/vite.js build
"$NODE" scripts/migrate.mjs
```

Logs: `parent-final-typecheck.log`, `parent-final-suite.log`, `parent-final-build.log`, `parent-final-migrate.log`; fixture read-back: `parent-full-layout/evidence.json`. Parent hash audits compare all 9 unrelated, 16 immutable and 11 study files plus the four frozen implementation/test fingerprints. Only verification prose was updated after review; no implementation/test change invalidated the gate.

## Parent completion status at integration commit

- Independent spec review: passed.
- Independent code/security review: passed.
- Full serial suite/build/migration: passed; source hashes unchanged.
- dev01 push and exact-SHA preview smoke follow this integration commit; post-commit release evidence is recorded in profile scratch and the final handoff, not presumed from local success.
- Final user preview acceptance and any production promotion: pending; production remains unchanged.
