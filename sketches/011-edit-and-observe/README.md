# 011 — Live edit-and-observe studies

**Local comparison artifacts, not production implementation. Neither proposal is approved.** These studies address only the measured expanded, short-height landscape edit/observe separation. Desktop, portrait and collapsed layouts are intentionally unchanged.

## Launch

Keep the existing real-app server at `http://127.0.0.1:58211/` running. From any working directory:

```sh
C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe C:/hermes/moongeometry/sketches/011-edit-and-observe/server.mjs --port=0
```

Open the exact `READY http://127.0.0.1:<assigned-port>/__study/` address printed by the process. `--port=0` requests an OS-assigned port; an explicit `--port=58212` is also supported if that port is free. The study server binds only to `127.0.0.1`. Stop this process when finished; do not stop the existing upstream.

The index defaults to an **actual 844 × 390 iframe viewport**, not a scaled drawing. Current/A/B links open independently reviewable pages. The canvas selector also offers native 1280 × 800, 1440 × 900 and 390 × 844 sizes, plus Fit viewport. On a smaller host screen the outer review canvas scrolls rather than silently scaling the app. The review page opens the native disclosure for short landscape; **Comparison position** makes the relevant edit/observe area visible. Capture mode (`current.html?capture=1`, `a.html?capture=1`, `b.html?capture=1`) removes all review chrome and fills the exact browser viewport; it leaves disclosure state to the app/test.

## What is live and what changes

- The same-origin iframe loads the **real root application**, initially `/?lat=40.7&lon=-74&date=2026-11-27&time=20:00`.
- Ordinary HTTP and WebSocket upgrade traffic is reverse-proxied to the already-running upstream. There is no app build, replacement renderer, fixture astronomy, cloned control, fake event, new store, test global, or edited application response.
- After the mounted app produces its civil-time zone marker, `study.js` adds `data-study-*` presentation markers and one isolated CSS stylesheet inside the iframe. A MutationObserver follows native expanded state and conditional notices. **No React-owned node is reparented or replaced.** Native handlers continue to own state, URL updates, scientific calculations and Share generation.
- Layout rules activate only when the **native disclosure has `aria-expanded="true"`, width is 640–1023 CSS px inclusive and height is at most 540 CSS px**. Nothing is changed in desktop, portrait or collapsed layouts except hiding the DEV-only Preview button, identically in Current/A/B. Share, Explain and the real orientation entry remain native.
- All scientific wording and native diagram dimensions remain: 208px ordinary phone sky stage / 256px desktop stage. Fonts, scientific colour tokens and geometry are not overridden. The original time group is approximately 141.8px high on the touch landscape viewport; latitude is 60px. These studies do not compress them into smaller fake controls.
- Only explicitly allowlisted study HTML/CSS/JS is served under `/__study/`. Source/test/docs are not served there. `/__study/health.json` separates proxy HTTP/WebSocket errors from browser/app failures.

## Current — accepted structure

Baseline, not a third proposal. The expanded editor precedes the sky on this phone breakpoint. Repeated full-sky comparison reproduces 274px each way for time and 160px each way for latitude after settling into the nearer edit positions. The preceding production recheck found no corresponding repeated-scroll defect on desktop or the tested portrait, so those are not redesigned.

## A — Split editor

**Stance:** preserve the normal editor sequence and put the existing sky alongside it.

- Editor occupies the left column; the existing sky panel occupies the right.
- Sky is sticky and bounded to viewport height minus 16px, with native overflow scrolling. Its native header, primary status and full 208px stage fit at the comparison position.
- All controls stay in their original editor sequence. The orbital panel remains below; all sky stats, standard-atmosphere badge, rise/set caveat and meridian formula remain accessible inside the sky pane.
- **Strength:** least conceptual change to the editor; one chosen initial move to scrollY=381 then zero comparison/return scrolling across all four exact edits.
- **Cost:** two vertical scroll surfaces. Reading lower sky details scrolls the chart/header out of that pane; users must return the pane to its top before doing full-chart comparisons again. Native touch scrolling and default scroll chaining were exercised. The pane is not a replacement for all-page scrolling.

## B — Chart-adjacent

**Stance:** put only the two demonstrated comparison controls beside the native sky.

- CSS `display: contents` flattens formatting boxes without moving DOM nodes. Native local-sky header and primary status sit above the group.
- Full 208px sky stage is in the left column; the original complete time group and original latitude control are in the right column.
- Native caption, statistics, scientific caveats, search/disclosure, date, longitude, Earth spin, modelling copy and orbital panel remain reachable below. There is exactly one of every input; no mirrored or miniature controls.
- Conditional simulation and orientation notices have distinct rows, including when both exist.
- **Strength:** the clearest edit/observe loop and only one normal page scroll surface; the tested comfortable comparison position is scrollY=123, then zero comparison/return scrolling across all four exact edits.
- **Cost:** time/latitude visually precede other editor controls, while native semantic/focus order remains unchanged. Flattened panel boxes also weaken the previous panel grouping. A real implementation would need deliberate keyboard/screen-reader reading-order review, not blind copying of this presentation-only CSS.

**Recommendation for review:** B is the stronger hypothesis for this narrowly demonstrated task. A is useful if preserving the whole editor's existing grouping matters more than avoiding nested scrolling. Neither is a reason to change the desktop workbench, collapse scientific content, shrink the chart or promote an untested production change.

## Scoped verification

Run the owned harness (starts and closes its own study proxy/browser, never the upstream):

```sh
C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe C:/hermes/moongeometry/sketches/011-edit-and-observe/verify.mjs C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-live-studies
```

The harness uses the installed app Playwright module directly. Main matrix: Current/A/B × 844 × 390, 1280 × 800, 1440 × 900, 390 × 844. Phone collapsed/expanded states, native Time 20:00 → 23:00 → 20:00 and Latitude 40.7 → 20 → 40.7, original-control reachability, app-induced scroll delta, history, URL, native SVG geometry/value/copy equality and out-of-gate layout equality are checked. It also exercises Share (real generated PNG), Explain, disclosure re-opening, a trusted sky-pane scroll, 20 responsive lifecycle sizes/boundaries, three fresh-context edited-URL restorations, simulation notices, and the native orientation unavailable path after explicit simulated geolocation.

See `VERIFICATION.md` for the executed totals, evidence paths and limitations. No full suite or production build was run because no application code was changed.

## Files

- `index.html`, `current.html`, `a.html`, `b.html`: review entry and three named pages.
- `review.css`: outer review chrome only; index carries equivalent inline chrome CSS.
- `study.js`: same-origin, post-mount presentation tagging and review controls.
- `layout.css`: narrow, native-expanded-only layout treatments and uniform DEV Preview hiding.
- `server.mjs`: Node-stdlib loopback HTTP/WebSocket reverse proxy with a fixed study allowlist.
- `verify.mjs`: reproducible owned Playwright verification and evidence collector.
- `README.md`, `VERIFICATION.md`: intent, trade-offs, launch instructions and executed evidence record.
