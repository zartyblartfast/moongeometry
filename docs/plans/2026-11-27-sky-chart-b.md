# Sky-chart B Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Integrate the user-approved B sky-chart treatment: readable labels and tighter framing, without changing astronomy or increasing panel heights.

**Architecture:** Keep the existing projection coordinates, provider data and semantic palette. Separate the north-up presentation frame/typography from the unchanged orientation instrument; use the same canonical north-up presentation for export. Measure real SVG sizing rather than assuming the hidden 1px export chart is the visible chart.

**Tech Stack:** React, TypeScript, SVG, Node's discovered test runner, Playwright/Vite; existing dependencies only.

## Approval and baseline

User approved B from `sketches/010-sky-chart-legibility`. That study used a 256px stage; production phone charts are 208px, which is an explicit implementation gate. Start at `3672294` on `dev01`; application code is unchanged since independently verified `f3008e5` (478 tests, 39 discovered files). Run current typecheck and focused astronomy/globe/orientation tests before editing. Preserve all 9 unrelated working files with scratch SHA-256 records; never stage them.

## Task 1: Implement north-up framing and typography using vertical RED/GREEN slices

**Files:** modify `app/src/components/sky-chart.tsx`; use `app/src/components/sky-chart-model.ts` only for pure presentation helpers if required. Add unit tests under `app/src/lib/` and rendered regressions at `app/scripts/sky-chart-legibility.test.mjs`. Change export/orientation consumers only if a demonstrated integration need requires it.

1. Write one real rendered failing regression for tighter north-up framing and readable annotations at a 256px desktop stage. Assert output rather than source strings; for example, calculate screen font size with `fontSize * svg.getScreenCTM().a`, require annotation size around 12px and cardinal size around 13px, and horizon diameter larger than the original 179.8px. Run it and preserve the expected failure log before editing production code.
2. Implement B's `12 20 296 296` desktop frame and readable labels while retaining all physical SVG geometry, projection origin `(160,168)`, radius 118, paths, points, colours and existing stroke choices. Preserve uniform aspect ratio. Retain the old orientation layout and bezel/sight behaviour.
3. Add the next failing regression at the real phone 208px stage, then implement the smallest sizing/clearance adaptation needed. Keep the stage 208px, labels readable, all four cardinals visible and no clipping/label-label overlap. Do not blindly copy normalized 256px prototype sizing. Retain generous-enough frame clearance for fallback fonts; minor phone framing adjustment is allowed to achieve this.
4. Regress resize/font fallback, north/south/near-horizon and representative equatorial/high-latitude/near-zenith states. Keep annotations understandable when paths or markers approach them: use a restrained halo or small tested collision-aware placement if needed, without relocating astronomical geometry. Avoid a new generic layout engine or stateful layout thrash.
5. Regress orientation mode at representative headings and canonical hidden export. Never divide by the hidden export SVG's 1px dimension to set enormous font sizes; use a stable intended presentation scale. Do not add test globals or mutate actual geometry for tests.

Run focused tests using portable Node from `app`:

```sh
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
"$NODE" --test scripts/sky-chart-legibility.test.mjs
"$NODE" --experimental-strip-types --test src/lib/astro.test.ts src/lib/earth-map.test.ts src/lib/orientation-ui.test.ts
"$NODE" node_modules/typescript/bin/tsc --noEmit
```

Use the existing owned OS-assigned Vite fixture pattern, close every owned context/server and fail on browser/hydration errors. Archive each RED/GREEN log in profile scratch `moongeometry-sky-b`. Formatting/linting may not touch unrelated files.

## Task 2: Review and real rendered artifact acceptance

1. Stage every intended file explicitly, including newly discovered tests. Spec compliance review first, then independent code/security review of the complete revised staged scope. Resolve blocking findings and re-review before committing.
2. Inspect actual app screenshots at 1440x900, 1280x800, phone 390x844 and phone landscape. Confirm original stage heights, surrounding panel geometry, readable labels/cardinal clearance, stable north/south/horizon outputs, and no horizontal overflow. Exercise orientation preview across headings without claiming physical sensor acceptance.
3. Generate an actual Share PNG through the app; inspect the image at native size for readable canonical north-up labels and correct sky geometry. Preserve infographic panel placement and clocks/metadata. Exercise a real animation briefly to check smoothness and dot-on-arc agreement.
4. Record commands, checked states, measurements, screenshots, review outcomes and known limitations in `docs/verification/2026-11-27-sky-chart-b.md`. Physical Pixel/native Safari acceptance remains untested unless actually exercised.

## Task 3: Full serial gate and commit

Run typecheck, the complete discovered suite with `--test-concurrency=1`, then production build through `scripts/with-app-env.mjs`, followed by migration. Never overlap build with browser-backed tests. Run targeted ESLint and Prettier, staged diff/security checks, and verify unrelated file hashes. Require the normal test discovery to include the new regression file(s). Commit task-owned files only on `dev01` after both independent reviews pass. Keep `main` unchanged; do not push/deploy without user authorization. Verify the localhost endpoint and open the integrated app in the desktop preview after the final gate, then report commit, actual totals, branch ahead/behind and remaining device limitations.
