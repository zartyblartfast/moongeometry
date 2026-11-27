# Sky-chart legibility — disposable snapshot comparison

No production chart changes. This folder is a visual study for review, not an approved implementation or a live ephemeris.

## Open

Open `C:/hermes/moongeometry/sketches/010-sky-chart-legibility/index.html` directly in a browser. File URLs were verified; no static server, install or build step is needed. Each HTML file is self-contained, including its captured SVG/data, inline CSS and inline JavaScript. An optional Google Fonts stylesheet loads the existing Outfit face; system sans-serif is the offline fallback. The screenshots used loaded Outfit, not the fallback.

The index shows all three variants side by side on a laptop and one tab at a time on a phone. The state selector switches between three real model snapshots. Every standalone file also has working state and variant controls.

## Files

- `index.html` — head-to-head comparison; single-variant tabs at narrow widths.
- `current.html` — opens on captured current.
- `candidate-a-labels.html` — opens on candidate A.
- `candidate-b-frame.html` — opens on candidate B.
- `captures.json` — exact visible SVG captures, source URLs, palette, actual rendered context and capture-readiness metadata. The supplied original northern capture is preserved as `baselineCapture`.
- `README.md` — this study, measurements and limits.

No existing sketches index or README was edited. No app/source files, configuration, skills, staging or commits were touched. No app tests/build/npm commands were run. The parent-owned app server on port 58211 was neither stopped nor restarted. No prototype server was started, so there is no owned server PID or stop procedure.

## Variant: captured current

**Stance:** a trustworthy baseline, not a reconstruction of the whole app.

- Uses the exact captured SVG, its `0 0 320 336` viewBox, original text coordinates and native font sizes.
- Keeps the captured 256 px laptop plot stage.
- Existing north-up linework, paths, dots, rings, summit marker and palette remain untouched.
- Best for identifying exactly what the two experiments change; small annotations remain small by design.

## Variant A: readable labels

**Stance:** isolate annotation treatment without changing chart framing or plot height.

- Original `0 0 320 336` viewBox; same 256 px stage and horizon diameter as current.
- Annotations target 12 CSS px; N/E/S/W target 13 CSS px with weight 500. The SVG font size compensates for the uniform screen scale when the stage resizes.
- The 30° and 60° annotations move to their rings' upper portions to avoid the paths in these captured states. The zenith annotation moves slightly down; the horizon annotation slightly up. Label text, fills and meaning are unchanged.
- Exact candidate label anchors: 30° `(100,129)`, 60° `(160,144)`, horizon `(234.34,78)`, zenith `(160,177)`. Cardinals keep their original anchors.
- Strong at isolating the legibility benefit and preserving generous framing. Weak at using available plot space.
- Best lower-risk reference if retaining the current frame is the priority.

## Variant B: frame + labels

**Stance:** use a little more of the same 256 px stage, not a taller panel or a different projection.

- Same labels and annotation positions as A.
- ViewBox becomes `12 20 296 296`, trimming spare outside margins only. Default uniform `xMidYMid meet` scaling is retained; nothing is stretched.
- No Sun/Moon points, polyline coordinates, marker coordinates, physical angles, ring geometry, stroke values or colours change.
- Strong at modestly increasing the chart's visual footprint. Weak at retaining clearance outside the cardinals: the smallest tested label-to-viewBox clearance is about 4 px.
- Best candidate to discuss next, with A retained as the safer fallback. This is a recommendation for visual review, not an approved winner or permission for production edits.

## Captured states

All dates/times below are the selected **mean solar** model moments, not an invented civil clock. Source URLs are included in the JSON and in the expandable context on each page.

| State | Latitude | Longitude | Model moment | Actual captured Moon altitude / azimuth | Captured civil line |
|---|---:|---:|---|---|---|
| Northern winter | 51.5° | -0.1° | 2026-12-21 21:00 | 61.8° / 159.7° · SSE | Civil · 21:00 GMT, 21 Dec · UTC+00:00 |
| Southern summer | -33.9° | 151.2° | 2026-12-21 21:00 | 31.7° / 4.4° · N | Civil · 21:55 GMT+11, 21 Dec · UTC+11:00 |
| Near-horizon fixture | 51.5° | 0° | 2026-11-19 00:39 | 0.3° / 261.6° · W | Civil · 00:39 GMT, 19 Nov · UTC+00:00 |

Captures waited for matching selected input values, loaded fonts, the real visible sky chart, a present UTC/civil line and three consecutive unchanged SVG/context polls. The hidden 1×1 share/export SVG was deliberately excluded: the actual visible SVG was selected by a `[data-sky-horizon]` descendant and bounding width greater than 100 px. The northern recapture was byte-identical to the supplied original SVG.

## Measured comparison

Measured in the browser, in CSS pixels, at both target viewports and all three captured states:

| Treatment | Plot height | Horizon diameter | Screen label sizes | Minimum label-to-viewBox clearance |
|---|---:|---:|---:|---:|
| Captured current | 256 px | 179.8 px | 7.6–9.1 px | 16.8 px |
| A · labels | 256 px | 179.8 px | 12–13 px | 14.9 px |
| B · frame + labels | 256 px | 204.1 px | 12–13 px | 4.0 px |

B increases horizon diameter by **13.5%** (about 28.9% more disc area), without changing stage height or source geometry. A leaves horizon size unchanged.

Both candidates had zero overlapping label bounding boxes, zero clipped annotations, all four cardinals present, and no collisions against the captured Sun/Moon polylines, dots or summit tick with the audit's 1 px clearance allowance. Current remains exact, including its existing 30° annotation proximity/intersection with the northern Moon path and its 60° annotation proximity/intersection with the southern Sun path. The prototype does not hide those baseline limitations.

## Verification and evidence

Actual browser viewports: **1440×900** and **390×844**, desktop Chromium emulation at DPR 1. These are viewport checks, not tests on physical devices.

- 18 standalone combinations: 3 files × 3 captured states × 2 viewports.
- 12 additional index combinations: 3 desktop side-by-side states and 9 phone state/variant combinations.
- 18 standalone variant-button interaction checks; state changes exercised throughout.
- All non-text SVG descendant attributes, including geometry and colours, compared equal to their capture in every checked case; all current SVG strings were exact matches.
- All plot stages measured 256 px; no tested page had horizontal overflow.
- Visual review sheets cover both candidates, every captured state and both viewport sizes.

Evidence directory:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-hardening/chart-prototype/`

- `verification.json` — per-case rectangles, label sizes, cardinal visibility, SVG integrity, collision results and screenshots.
- `measurements-summary.json` — aggregated checks and measurements.
- `comparison-laptop-north.png`, `comparison-laptop-south.png`, `comparison-laptop-horizon.png` — index side-by-side screenshots.
- `comparison-phone-current-north.png`, `comparison-phone-a-north.png`, `comparison-phone-b-north.png` — phone tab screenshots.
- `{current,a,b}-{laptop,phone}-{north,south,horizon}.png` — all 18 standalone screenshots.
- `review-laptop-all-candidate-states.png`, `review-phone-all-candidate-states.png` — visual-review contact sheets.

Some browser transport calls timed out during capture; saved progress was retained and the exact remaining cases were retried successfully. No screenshot or model output was fabricated.

## Limits / before any production decision

- Only these three north-up snapshots and the two stated viewports were checked. No live ephemeris, rotated/device-heading chart, broad date/location sweep, browser/device matrix or astronomy correctness validation is implied.
- Candidate annotation positions are deliberately static for comparing these snapshots. A production design would still need collision handling across other states, heading changes, zoom, language/font differences and font-loading failure.
- B's roughly 4 px minimum cardinal clearance is a real trade-off. Do not infer that larger accessibility text or alternate metrics are safe from these checks.
- Existing palette and Outfit identity are preserved; contrast/palette redesign is outside this study. Faint grid rings remain faint.
- The live app currently uses a 208 px phone stage (`h-52`) and a 256 px laptop stage (`lg:h-64`). This comparison intentionally holds **every** plot at 256 px on both viewports to isolate labels and framing. It is not a proposal or claim that phone production height is already 256 px.
- No production source was changed. The user still needs to review the trade-offs before a chart implementation is proposed.
