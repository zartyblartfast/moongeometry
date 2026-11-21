# Atmospheric-refraction QA follow-ups — 21 November 2026

## Scope

Starting commit: `2ce0ad04c74b16d0aefc907d9a37282440ee2588` on local `dev01`.

This closes the two non-blocking findings from the atmospheric-refraction QA:

1. Consumer wiring was protected by source-string assertions rather than rendered behavior.
2. Independently rounded Explain operands appeared to produce an incorrect apparent altitude.

No ephemeris/provider, refraction model, rise/set solver, clock contract, location contract, dependency or production deployment changes are included.

## Explain correction

The spherical formula now explicitly names **geometric altitude**. The exact symbolic relationship remains:

`h apparent = h geometric + R(h geometric)`

The worked numerical addition uses degrees throughout, shows three decimal places, and uses approximation signs. For the reviewed near-horizon example it reads:

`h apparent ≈ −0.259° + 0.522° ≈ 0.263°`

A note says the worked values are rounded and explains that the correction in the results table is expressed in arcminutes (`60′ = 1°`). Main stats, the results grid and sharing retain their existing one-decimal presentation; the table still exposes the refraction lift in arcminutes.

The change is confined to the existing Explain calculation area. No new resting-workspace control or panel was added. Additional changes in `moon-app.tsx` are Prettier reformatting of existing JSX, without intentional behavior changes.

## Behavioral regression coverage

New suite: `app/scripts/refraction-ui.test.mjs`.

It runs automatically through the existing recursive `npm test` discovery, or alone with:

```sh
npm run test:refraction
```

The suite launches the real local application and Chromium, not mocked astronomy or UI components. It owns a loopback Vite server on an OS-assigned port and closes its own browser contexts, browser and server. It neither uses nor stops an existing development/preview server. Authentication is disabled only in the isolated test worker; an inherited database URL is removed for the fixture and both environment values are restored during cleanup. Web-font CSS and the platform extension script are isolated so external integrations do not determine the result.

Chromium is an explicit test prerequisite, already installed on the verified machine. The README documents `npx playwright install chromium` for fresh environments. Missing Chromium fails the suite; there is no environment-dependent silent skip.

### Fixed near-horizon fixture

- Latitude/longitude: **51.5°, 0°**.
- Mean solar time and UTC: **19 November 2026, 00:39**.
- Geometric altitude: **−0.2594699989925938°**.
- Standard correction: **+0.5223603736631297°**.
- Apparent altitude: **+0.2628903746705359°**.
- Expected main apparent altitude: **0.3°**.
- Expected top of apparent path: **33.1°**.
- Frozen-path rise/set labels: **13:34 / 00:41** mean solar.
- Canonical rendered Moon point: **(43.61, 185.18)** in the existing SVG viewBox.

These expected values are saved fixtures, not derived by the UI under test. The Moon is below the geometric horizon but above the apparent horizon, so replacing apparent altitude with geometric altitude produces an observable failure.

### Ten browser cases

1. Actual main stats, apparent-centre events, Explain summary/calculation values, SVG coordinates and dot-on-rendered-path agreement.
2. Explicit geometric formula, exact symbolic refraction relationship, approximate same-unit numerical addition and rounding/unit disclosure.
3. Orientation-preview visibility and heading-adjusted projection, canonical north-up share chart, and a real exported **1600×900 PNG**.
4. Pixel 7 emulation: apparent visibility, chart agreement, no page overflow, and a readable wrapped Explain calculation with no horizontal content overflow.
5. A real time-input edit from **00:39** to **00:49**, moving the Moon below the apparent horizon: main/Explain status, numerical altitudes, marker disappearance and orientation guidance update together.
6. Deliberately wrong geometric main-altitude wiring is rejected.
7. Deliberately wrong geometric Explain-prop wiring is rejected—the specific mutation the old source assertions missed.
8. Deliberately wrong geometric sky-dot wiring is rejected.
9. Deliberately wrong geometric orientation visibility is rejected.
10. Deliberately wrong geometric export altitude is rejected by the actual PNG text-pixel assertion.

Fault injection changes only a module response in the relevant fresh browser context. It does not edit the repository, inject fake numerical responses, or contaminate other contexts. Each negative case requires the intended behavioral assertion to fail; module/hydration failures are not accepted as evidence. The sky-dot fault is restricted to the below-geometric-horizon fixture so the initial server-rendered seed is not intentionally made inconsistent with hydration. All cases capture browser runtime and console errors rather than suppressing hydration warnings.

### Real PNG assertions

The export test invokes the actual Share flow, decodes the resulting PNG, checks its dimensions, and compares its altitude-value pixels with the expected **0.3°** glyphs rendered using the controlled browser font. It also checks a filled Moon-marker neighborhood at the canonical apparent position after orientation preview has rotated the live chart. Thus a correctly formatted thumbnail alone cannot satisfy the export regression.

The previous source-text consumer checks were removed. The remaining source-text test is explicitly a backstop for current documentation/convention wording, not a substitute for runtime consumer coverage. Existing numerical tests remain.

## Red / green and cleanup evidence

- Before the UI correction, the rendered calculation test failed on the unlabeled `h = asin(...)` formula and observed the misleading rounded `−0.3° + 31.3′ = 0.3°` presentation.
- The response-only Explain-prop mutation was detected even though the previous source-string assertions would accept it.
- All five intentionally wrong consumer-wiring variants are rejected by the new behavioral guards.
- An early sky-dot fault intentionally changed initial hydration; the harness correctly reported it as a browser error. The fault was narrowed to the actual fixture rather than weakening the error check.
- An initial 30-second after-hook budget proved too short for occasional Chromium shutdown on this Windows host. Diagnostics showed zero remaining contexts, slow browser-process exit, and Vite shutdown completing in milliseconds. Cleanup now has a bounded 120-second budget and still asserts that contexts, browser and server are closed. Temporary diagnostic logs were removed.

## Verification

Environment exercised: Windows, Node `v24.14.1`, installed Playwright Chromium. No package or browser installation was needed during this change.

| Gate | Result |
| --- | --- |
| Baseline `npm run typecheck` | Pass |
| Baseline focused astronomy/map tests | 34 passed |
| New browser regression | Included in the successful full suite; 10 cases passed |
| `npm test` | **38 files; 466 passed, 0 failed, 0 skipped, 0 cancelled** |
| `npm run typecheck` after changes | Pass |
| `npm run build` | Pass |
| ESLint on `moon-app.tsx`, `astro.test.ts`, `refraction-ui.test.mjs` | Pass |
| Prettier check on `moon-app.tsx`, new browser suite and `package.json` | Pass |
| `git diff --check` | Pass |

The final full-suite execution also verifies the fixture's cleanup assertions. Numerical provider, split-clock, root/tangency, geometric reconstruction and provider-call-count tests remain green. The application’s unchanged build warnings are retained in the raw build log; no new build failure was introduced.

## Visual/artifact checks

Actual captures were inspected at **1280×800**, **1440×900**, and emulated **Pixel 7** size. The new formula and precision are legible; mobile wraps without horizontal clipping. The rounding/unit note is visible in the mobile capture. The real PNG retains its north-up sky diagram, both diagram panels, apparent **0.3°** altitude, mean-solar/civil metadata and standard-atmosphere footer.

Logs, images, manifest and machine-readable gate results are stored outside the checkout at:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/refraction-followups/`

To save fresh captures during reproduction:

```sh
MOON_REFRACTION_ARTIFACT_DIR=<output-directory> npm run test:refraction
```

The output directory must be outside watched source directories. Screenshot/PNG hashes identify this verification capture; the embedded loopback port and platform font rendering mean captures are not expected to hash identically across machines or runs.

| Artifact | SHA-256 |
| --- | --- |
| `app/src/components/moon-app.tsx` (verified on-disk bytes) | `02a0bbfb88614bc8013a8dbd3b8b89484a282adf43b2d172f6fe05f7b1993c22` |
| `app/scripts/refraction-ui.test.mjs` | `27bff3ead45f33d5c8032a7a7af4e44fba39bcf7aef9981588d89210ef1419d2` |
| `refraction-worked-calculation.png` | `e97596bb86287ecf8f5c88186252b8464efc72150da90d0ace3aa88d1096d5fa` |
| `refraction-pixel-calculation.png` | `1c95665df5321f1e428bd34bd19d4a98f1c0c64ba03e1518a336739caa0f997f` |
| `refraction-share.png` | `d42822e49bd5ed37e8540145362eef83b98b2850a3343358438e42a012cb2a67` |

## Limits and preservation

- Pixel checks are emulation, not physical compass/sensor or outdoor/weather validation.
- The new browser regression exercises the development fixture; the production build is verified separately. No remote deployment is asserted.
- This checks the selected standard model and consumer consistency, not actual atmospheric conditions.
- Existing unrelated sketches, planning documents and `.hermes` work are preserved and excluded from the follow-up commit.
- Existing servers on ports 8080/8082/8083 are not process-controlled by these tests. No new fixed-port helper server is left running.
- No push, merge or production change is included.
