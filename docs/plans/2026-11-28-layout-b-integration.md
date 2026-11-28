# B chart-adjacent responsive editor implementation plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Integrate the user-selected B layout into the actual Moon Path application, fitting available viewport space and retaining the already verified sightline repair.

**Architecture:** Replace the disposable study's presentation-only rearrangement with a semantic responsive composition of the existing sky and native time/latitude controls. Render each scientific input once, derive the narrow editing mode from the real viewport plus the existing disclosure state, and preserve state/focus at mode boundaries. Keep rendering, astronomy, clocks, URLs, providers, camera and orientation behavior unchanged.

**Tech Stack:** Existing React/TypeScript, Tailwind/CSS, native matchMedia, Node test runner and Playwright; no dependency changes.

## Approved input and limits

- Base: `9af677053fc8d45f03abf54f56989c7953dd69e1`, dev01, three existing unpushed commits. Sightline fix `20f618f` has 501 passing tests in 41 discovered files; retain it exactly.
- User explicitly selected B and Fit Viewport, then approved integration, verification and publishing a dev01 preview. Production promotion remains behind the final preview-acceptance gate.
- Approved reference: `sketches/011-edit-and-observe/b.html`, `layout.css`, README and VERIFICATION; measured current-production baseline in profile scratch `moongeometry-edit-observe/report.md`. No additional design exploration.
- B applies only to **expanded editing** at width 640–1023 CSS px and height at most 540 CSS px. Desktop, portrait and collapsed observation layouts remain visually/functionally unchanged. Fit Viewport means fluid sizing to the actual browser/pane, not a new production viewport selector, iframe, fixed 844x390 canvas or camera-zoom control.
- At B, the ordinary native 208px sky stage sits beside the existing complete mean-solar time group (input, scrubber, UTC, civil line) and latitude control. Header, simulation/orientation status and plain-language Moon result remain associated. Caption/stats/caveats, search/current actions/disclosure, date/longitude/spin and orbital diagram remain reachable in a normal single-page scroll. Do not introduce nested scrolling or duplicate/miniature controls.
- Preserve native 256px desktop / 208px ordinary phone stages. Do not force active orientation instrumentation to those ordinary dimensions; preserve its existing behavior and notices.
- Preserve scientific copy/values, signed coordinates, refraction semantics, query schema, mean-solar-only editing, reset contracts, native touch targets and gestures, current-location ownership, Share PNG and Explain behavior.

## File scope

Expected modifications:

- `app/src/components/moon-app.tsx`
- `app/src/components/place-search.tsx` only if disclosure/focus/ARIA coordination requires it
- `app/src/styles.css` for scoped production layout rules

Optional small extraction, only if it reduces duplication:

- `app/src/components/primary-observation-controls.tsx`
- `app/src/lib/use-landscape-editor.ts` (responsive state/focus lifecycle only)

Create:

- `app/scripts/landscape-editor.test.mjs` (normally discovered rendered regression)
- `docs/verification/2026-11-28-layout-b-integration.md`

Do not modify astronomy/provider/store/renderer/orientation/export/package/lock files. The 9 unrelated files, 16 immutable source/dependency files and 11 study files are inventoried in profile scratch `moongeometry-layout-b-integration/baseline.json`. Keep study artifacts as references, not shipping architecture.

## Task 1 — Preserve current truth and establish the first RED

1. Before editing UI, record baseline native rectangles/values/geometry at 1440x900,1280x800,390x844 and collapsed844x390 using a fixed New York fixture `?lat=40.7&lon=-74&date=2026-11-27&time=20:00`. Wait for mounted controlled fields, attached IANA marker and settled fonts. Capture both primary-font and deterministic fallback cases if needed for exact layout comparisons.
2. Add a real rendered regression using an owned OS-assigned loopback Vite fixture, Chromium and normally discovered `.test.mjs` file. Reuse established environment/resource-cleanup patterns, without dependencies or shipped diagnostic globals.
3. At844x390 expand the native editor. Require the full native sky, complete time group, latitude and primary result to admit a shared comparison position within the viewport. Observe an intended RED against the existing app, not a harness/selector error. Distinguish one initial reveal from repeated comparison travel.
4. Archive RED logs and baseline metrics in profile scratch `moongeometry-layout-b-integration/`.

## Task 2 — Minimal semantic B composition, GREEN

1. Reuse the actual original time/latitude controls and callbacks, extracted once if useful. Never render hidden duplicate inputs or clone handlers/store state.
2. Establish an SSR-safe responsive state/disclosure contract. Initial server and hydration markup must agree; subscribe/clean up native media changes after mount. No browser sniffing, URL changes or layout state persisted as observation state.
3. Place time/latitude beside the sky in a meaningful DOM/reading order in B. Do not simply copy the study's CSS visual-order hack or use positive tabindex/aria-flowto to camouflage incorrect order. Use native fieldset/legend or equivalent explicit group labels without adding visual card clutter.
4. Keep the 3D scene and sky/controller mounted through ordinary edits and layout changes where feasible. In particular do not remount/reset the orbital canvas/camera when a disclosure opens, a time/latitude value changes, or viewport boundaries change.
5. If moving primary input nodes between semantic groups is necessary at a mode boundary, retain all committed state and draft contracts in their existing owner, preserve/restore the relevant focused field before paint, and avoid per-frame moves. Do not steal focus during ordinary updates or automatically summon the phone keyboard on pointer expansion. Keyboard expansion must lead predictably to the primary controls rather than tabbing through offscreen secondary inputs first.
6. Preserve the ordinary desktop/portrait/collapsed composition and native control dimensions. New wrappers must not acquire default fieldset margins/min-width/borders that alter layout.
7. Run the new focused test GREEN. Verify actual native time/latitude edits update both chart and URL while preserving history length, scroll stability and geometry. Capture screenshots of the integrated app, not the old study.

## Task 3 — Boundary and interaction tracer bullets

Add each next regression RED before changing behavior:

- Touch and keyboard time20->23->20, latitude40.7->20->40.7 with intermediate values and stable control rectangles; after a shared initial position both chart and active control remain visible without repeated scrolling.
- Exactly one date/time input and one of each original range control; every secondary control remains reachable. DOM/focus sequence is logical, labels and aria-controls targets exist, no positive tabindex or unexpected keyboard trap. Test keyboard disclosure entry, forward/backward Tab and collapse.
- Resize in both directions at width639/640,1023/1024 and height540/541; portrait/landscape transitions while focused and with edited state. No stale media listeners, source-coordinate/clock changes, unwanted URL writes or repeated remounts. Preserve the existing incomplete-time-input recovery contract and committed instant/URL.
- Out-of-gate native geometry equals captured baseline for desktops/portrait/collapsed; no horizontal overflow; real fonts and fallback fit. At 340x452 (the user's Fit Viewport example), preserve the working portrait layout.
- Shared URL restores exact selected coordinates and mean-solar moment in a fresh context; no inherited storage assumption.
- Start/pause Slide: primary simulation notice remains after pause; current-time/preset reset clears it. Preserve Spin, both hemisphere cases and ordinary observational visits.
- Explain Escape/focus return uses an actual opener and bounded wait for Radix async restoration. Generate/download a real1600x900 Share PNG and inspect it.
- Preserve current-location/orientation state and notices; exercise unavailable/conditional-copy states using explicit simulated device data, not operator location. No claim of physical sensor certification.

## Task 4 — Reviews, complete gate and preview release

1. Implementer returns complete file list/diff, RED/GREEN evidence, focused totals and native screenshots. Run targeted lint/format/typecheck; relevant existing UI suites serially. Do not run a full suite/build, stage, commit or deploy from the worker.
2. Parent stages only task files and runs independent **spec review first**, resolves blockers, then independent **code/security review**. Preserve reviewed source hashes.
3. Parent independently exercises the actual app and inspects real screenshots. Run full serial `scripts/run-tests.mjs --test-concurrency=1`, then production build and migration, never concurrently with browser fixtures. Read actual totals/discovered count; do not assume them from arithmetic.
4. Verify protected hashes and unrelated status. Complete verification document with exact commands/results, source hashes and limitations. Commit task-owned changes on dev01.
5. Fetch remote refs, require safe non-force update, push exact verified dev01. Verify exact Git-triggered Vercel preview SHA/branch/status, each advertised route and deployed behavior. Do not source-upload the dirty working tree or prune development dependencies.
6. Hand over the deployed preview for final user check. Main and production stay at accepted99292fe until that acceptance. Mark this scope complete at verified preview handoff; production promotion is the explicit remaining user gate.

## Commands

From `C:/hermes/moongeometry/app`:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" --experimental-strip-types --test src/lib/astro.test.ts src/lib/earth-map.test.ts
"$NODE" --test scripts/landscape-editor.test.mjs
"$NODE" --test scripts/ui-hardening.test.mjs
"$NODE" scripts/run-tests.mjs --test-concurrency=1
"$NODE" scripts/with-app-env.mjs "$NODE" node_modules/vite/bin/vite.js build
"$NODE" scripts/migrate.mjs
```

The parent has already re-run baseline typecheck and astronomy/map34/34 at this base. Existing upstream58211 and owned study proxy51354 are not test-fixture cleanup targets. Once integration begins, use the actual app for review: old study CSS assumes its original DOM and must not be layered on the production composition.
