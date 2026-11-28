# Executed verification — live landscape-only studies

## Result

**Scoped pass; awaiting design/physical-device review, not production approval.** The implementer checkpoint changed no application source, dependency file, Vite configuration, unrelated sketch/index/README, repository plan or git ref, and performed no commit, push, build or deployment. The parent independently verified the completed studies afterward; see the final section below.

The application under test was the existing root app served at `127.0.0.1:58211`, with local HEAD `99292feb019ff3521baa9d7b3c52d980d0b8d02a`. The earlier production deployment attestation belongs to the parent recheck; this run is a live local study, not a second production deployment attestation.

## Executed evidence

Base directory:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-live-studies/`

- `evidence.json`: complete native rectangles, input/URL/clock/stat values, scientific SVG geometry hashes, original scientific copy, errors/warnings, touch/mouse edits, resize states, fresh-context URL restoration and review checks.
- `summary.json`: generated execution totals and proxy diagnostics.
- `integrity-and-metrics.json`: protected-file SHA-256 comparison, unchanged HEAD, git status/diff check, screenshot existence/uniqueness, and tool-calculated comparison metrics.
- `run.log`, `integrity.log`: real execution output.
- `cli-smoke.json`: separate real CLI launch with `--port=0`; printed READY, study HTTP 200, proxied app HTTP 200, no stderr, and owned-process closure.
- `summarize.mjs`, `cli-smoke.mjs`: scratch-only integrity/CLI probes. `probe.mjs` and `probe-*.png` are preliminary discovery, **not included in final screenshot totals**.

### Totals from final generated JSON

| Item | Executed result |
|---|---:|
| Main matrix cases | 12 |
| Main recorded states | 129 |
| Exact scientific range drags | 48 |
| Trusted touch scientific drags | 24 |
| Trusted mouse scientific drags | 24 |
| Additional trusted sky-pane touch scroll | 1 |
| Passing assertions | 1632 / 1632 |
| Native scientific SVG geometry comparisons to Current | 86 |
| Out-of-gate document-layout comparisons to Current | 66 |
| Fresh-context edited shared-URL restorations | 3 |
| Single-frame resize/boundary states | 20 |
| Final unique screenshots, all verified nonempty | 108 |
| Successful forwarded WebSocket upgrades | 21 |
| Proxy HTTP / WebSocket errors | 0 / 0 |
| Main-case app/console errors / failed requests | 0 / 0 |

The resize checks include both sides of the 640px, 1024px and 540px gate boundaries. Ordinary sky heights remain 208px below desktop and 256px at desktop. Resting, collapsed, re-collapsed and all requested desktop/portrait edit states match Current's document geometry outside the study gate. Scientific non-text SVG geometry, native input inventory/values, displayed scientific values and scientific copy agree at corresponding exact inputs; these are equality checks, **not independent astronomy-accuracy validation**.

All four scientific edits changed to their exact intended values. They emitted native trusted events, preserved page scroll and history length, and updated the real native URL. There are no test-store globals or synthetic input dispatches. Share produced a real generated blob PNG in each landscape variant; Explain opened and closed through the real dialog. Every original search/date/time/time-range/latitude/longitude/spin control was scrolled into an actually visible viewport rectangle. A's scientific pane accepted a trusted touch scroll and retains default normal scroll chaining.

## Landscape comparison

Chosen comfortable initial positions are not mathematical minimum-scroll claims.

| Treatment | Initial comparison scrollY | Repeated time inspect / return | Repeated latitude inspect / return | Ordinary native stage |
|---|---:|---:|---:|---:|
| Current | 107 before the first time edit | +274 / −274 px | +160 / −160 px | 208px |
| A — Split editor | 381 | 0 / 0 px | 0 / 0 px | 208px |
| B — Chart-adjacent | 123 | 0 / 0 px | 0 / 0 px | 208px |

Current's **first** sky inspection after its initial time edit moved +580px; subsequent repeated time comparison settled to ±274px. The first latitude edit was made at the previous time return position and used +274/−160; repeated latitude then settled to ±160. All A/B edits kept full sky, primary status and active slider visible without further inspection/return scrolling. The complete time group and latitude are also together at the chosen A/B comparison positions, with unchanged native input/control sizes.

A's bounded sky panel is 374px high on the 390px viewport. Its full content is 618px and the lower-detail view reaches scrollTop 244. This is an explicit trade-off: lower scientific detail is reachable but replaces the chart/header inside that pane. B avoids nested scrolling but separates the time/latitude visual placement from native DOM/focus order and other editor controls.

## Representative screenshots

All paths are relative to the evidence base above:

- `current-844x390-time-20.png`: baseline full-sky inspection after the repeated time edit.
- `current-844x390-comparison.png`: baseline editor position; full sky remains offscreen.
- `a-844x390-comparison.png`, `b-844x390-comparison.png`: native full sky plus time/latitude comparison areas.
- `a-844x390-time-23.png`, `b-844x390-time-23.png`: genuine time change and changed scientific sky.
- `a-844x390-latitude-20.png`, `b-844x390-latitude-20.png`: genuine latitude change / below-horizon state.
- `a-844x390-sky-details.png`, `b-844x390-sky-details.png`: reachable scientific details.
- `a-1280x800-comparison.png`, `b-1440x900-rest.png`: unchanged paired desktop workbench.
- `b-390x844-comparison.png`: unchanged portrait comparison position.
- `a-844x390-collapsed-again.png`, `b-844x390-collapsed-again.png`: restored native collapsed composition.
- `a-844x390-share.png`, `b-844x390-explain.png`: real native dialogs.
- `a-orientation-unavailable.png`, `b-orientation-unavailable.png`: native unavailable orientation plus simulation disclosures retained without overlap.
- `review-current.png`, `review-a.png`, `review-b.png`: live review chrome and exact native landscape canvas.

Representative final A/B comparison, edited latitude, detail, desktop, portrait and review screenshots were visually inspected, in addition to numeric/DOM checks.

## Integrity / ownership

The nine unrelated-file hashes and seven source/dependency hashes supplied in `parent-baseline.json` remain identical. HEAD is unchanged; `git diff --check` returns no errors. The only new repository directory is `sketches/011-edit-and-observe/`; the pre-existing user changes are retained untouched. All generated evidence is in the owned scratch directory. A reusable live-study verification lesson was also recorded in the active profile's `sketch` skill as required by the agent workflow; it does not alter the repository or another profile.

Owned browser contexts/browser and study servers were closed through their APIs; the CLI smoke's owned process also exited. The parent upstream server was neither modified nor stopped. Restart `server.mjs` for user review.

## Limitations and issues encountered

- This is desktop Chromium / phone emulation, not physical-phone touch, browser chrome, keyboard, iOS, true-north sensor or accessibility acceptance. Simulated geolocation is explicitly set to the seeded coordinates; no operator location is requested. The native orientation unavailable path is exercised, not claimed as sensor support.
- All fonts loaded in the tested captures. Blocked-font fallback was not separately tested here; the native renderer/fonts were not edited.
- The instrument in an active real orientation session has its own native size and guidance. These studies do not force it into a 208px comparison cell; additional notices may require normal scrolling.
- The browser emitted non-fatal WebGL ReadPixels GPU-stall warnings and an `Unrecognized feature: 'web-share'` iframe-policy warning. These are recorded separately from app/console errors. No proxy/WebSocket errors occurred.
- During development, a CSS-specificity overlap in the first B draft, auto-placement of secondary copy into a reserved notice row, and a two-pixel iframe border-box discrepancy were found and corrected before the final passing run. Early harness assumptions about absent orientation eligibility and state-label capture were also corrected. Final evidence is from the completed passing run, not those discovery attempts.
- The tagging CSS depends on the accepted app's DOM structure. It is disposable review material, not an approved production architecture. B especially needs reading/focus-order review before any production implementation.
- No full suites/builds were run. The scoped executable harness and direct real-app source/hash checks are the verification provided for this presentation-only experiment.

## Independent parent acceptance and review handoff

- Parent read the complete proxy, presentation tagging and layout CSS, executable verification harness, and generated evidence. All 1632 recorded assertions are true, and generated counts agree: 12 main cases, 48 exact range drags and 108 recorded screenshots.
- Parent started the actual CLI server, verified the live comparison in the Hermes preview pane, selected B and used its real Comparison position control. The server remains running for local review; the upstream on 58211 remains untouched.
- Independent parent smoke run exercised Current/A/B with four actual trusted touch edits each: time 20:00 to 23:00 and back, latitude 40.7 to 20 and back. All 12 edits preserved application scroll; corresponding scientific values and geometric SVG hashes matched exactly. A and B retained the complete 208px sky and active control simultaneously, without repeated repositioning.
- Parent also checked native Explain Escape/focus restoration and resized each case to desktop, confirming the 256px sky and matching desktop geometry. No page/console or proxy errors occurred.
- Parent opened both native landscape comparison screenshots. A retains editor grouping but introduces an independently scrolling sky pane. B has the cleaner single-scroll comparison but changes visual versus semantic/focus order; it is a design hypothesis, not approved production CSS.
- Evidence: `parent-study-acceptance.mjs`, `parent-study-acceptance.json`, `parent-current-landscape.png`, `parent-a-landscape.png`, `parent-b-landscape.png`, and `parent-baseline.json` under profile scratch `moongeometry-edit-observe/`.
- All 9 unrelated files and 7 app/source/dependency SHA-256 baselines remain unchanged. The parent will checkpoint only this new eleven-file study directory locally on dev01. No application change, push or deployment is included; production/main remain on accepted `99292fe`.

Review recommendation: **B for further evaluation**, not a desktop redesign. Preserve the current desktop, portrait and collapsed observation layouts. User selection and subsequent implementation review are separate gates.
