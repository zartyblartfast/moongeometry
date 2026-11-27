# Moon Path sky-mode and clock clarity — verification

Date: November 27, 2026. Branch: `dev01`. Base commit: `64d70b28ab07f9e44ac94cd31dad498cf27c5fa7`.

This record preserves the original implementation checkpoint; subsequent parent review and final-gate results are recorded below. The parent owns the serial full suite/build and final integration sign-off. The parent’s plan at `docs/plans/2026-11-27-sky-mode-clock-clarity.md` was not edited by the implementer. No push or production deployment is part of this local checkpoint.

## Bounded changes

- **MG-C01:** One conditional paragraph immediately below the Local sky path moment/header. `orbit !== instant || playing === "slide"` matches the existing Explain condition, including paused simulation and Spin with an orbital offset. Gold “Simulated sky.” label, muted 12px/16px copy; no banner at ordinary/shared observational visits. The paragraph explains independent orbital position and how to return to comparison with an observation; it does not call the calculated values incorrect. It is outside the `dl`.
- **MG-C02:** Primary terms now read `Rise · mean solar` and `Set · mean solar`. Explain Summary reads `Rise / set · mean solar, then UTC`. Existing numerical formatter, UTC labels/date suffixes, event fallbacks, and adjacent Moon-centre/standard-refraction caveat are unchanged.
- No astronomy/provider, store, clocks, URL, renderer, plot dimensions, control behavior, dependencies, configuration, export layout, or export metadata changes. No new cards, dialogs, icons, reset action, or test globals in production.

Repository files changed/created by this task:

1. `app/src/components/moon-app.tsx`
2. `app/scripts/ui-hardening.test.mjs`
3. `app/scripts/refraction-ui.test.mjs` — only the two exact event-label selectors changed; the independent numeric fixtures and caveat/HTML assertions remain.
4. `docs/verification/2026-11-27-sky-mode-clock-clarity.md` — this record.

## Evidence location and commands

All logs/images and the supplementary font visual script are in:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-clarity`

For the commands below, cwd was `C:/hermes/moongeometry/app`; `N` denotes the exact executable `C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe`, and `A` denotes the artifact directory above. Actual shell commands used that executable/path, with `set -o pipefail` and `2>&1 | tee` to preserve logs.

| Execution                                                       | Command (N/A as defined above)                                                                                                                                                                               | Observed result / log                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MG-C01 RED, before production edit                              | `MOON_HARDENING_ARTIFACT_DIR=$A $N --test --test-name-pattern='primary simulation disclosure' scripts/ui-hardening.test.mjs`                                                                                 | 0/1; expected missing primary disclosure (`0 !== 1`) **after real start, observable declination change, pause and button-off assertion**. `red-simulation.log`      |
| MG-C01 first GREEN                                              | `$N --test --test-name-pattern='primary simulation disclosure' scripts/ui-hardening.test.mjs`                                                                                                                | 1/1. `green-simulation.log`                                                                                                                                         |
| MG-C02 RED, before event-label production edit                  | `$N --test --test-name-pattern='New York rise/set' scripts/ui-hardening.test.mjs`                                                                                                                            | 0/1; existing event numbers passed, then `Rise` did not equal `Rise · mean solar`. `red-event-clocks.log`                                                           |
| Second slice + simulation edges GREEN                           | `$N --test --test-name-pattern='New York rise/set\|simulation disclosure\|resynchronizes' scripts/ui-hardening.test.mjs`                                                                                     | 9/9. `green-clarity.log`                                                                                                                                            |
| Entire focused hardening file, old + new rendered checks        | `MOON_HARDENING_ARTIFACT_DIR=$A $N --test scripts/ui-hardening.test.mjs`                                                                                                                                     | **28/28**, no skips. `ui-hardening.log`                                                                                                                             |
| Existing rendered refraction/orientation/export regression file | `$N --test scripts/refraction-ui.test.mjs`                                                                                                                                                                   | **10/10**, no skips. `refraction-ui.log`                                                                                                                            |
| Focused unit/integration contracts                              | `$N --experimental-strip-types --test --test-concurrency=1 src/lib/astro.test.ts src/lib/earth-map.test.ts src/lib/orientation-ui.test.ts src/lib/share-infographic.test.ts src/lib/initial-instant.test.ts` | **54/54**, no skips. `focused-regression.log`                                                                                                                       |
| Typecheck                                                       | `$N node_modules/typescript/bin/tsc --noEmit`                                                                                                                                                                | PASS. `static-validation.log`                                                                                                                                       |
| Targeted lint                                                   | `$N node_modules/eslint/bin/eslint.js src/components/moon-app.tsx scripts/ui-hardening.test.mjs scripts/refraction-ui.test.mjs`                                                                              | PASS. `static-validation.log`                                                                                                                                       |
| Targeted format                                                 | `$N node_modules/prettier/bin/prettier.cjs --check src/components/moon-app.tsx scripts/ui-hardening.test.mjs scripts/refraction-ui.test.mjs`                                                                 | PASS. `static-validation.log`                                                                                                                                       |
| Diff whitespace                                                 | `git diff --check`                                                                                                                                                                                           | PASS; Git reports its existing LF-to-CRLF conversion advisory for the edited app files.                                                                             |
| Loaded-font supplement                                          | `$N $A/check-loaded-fonts.mjs`                                                                                                                                                                               | Four viewport scenarios passed, both font families confirmed loaded, no browser errors, owned resources closed. `loaded-font-visual.log`, `loaded-font-layout.json` |

Final focused test groups total **92 passing tests**, no skips or failures. This is not the full project suite. The parent supplied a passing pre-edit typecheck/astro/earth-map baseline; this worker did not rerun a local full suite or build.

### Coverage and test-harness corrections

The real Slide button is exercised, waiting for changed rendered declination rather than sleeping for an assumed animation duration; playback is paused and its `aria-pressed` state is checked. Final tests also check active disclosure, persistence through coordinate edits and switching/pausing Spin, absence on ordinary/shared/reloaded observational visits, and separate date, valid time, current-time, preset and scrubber resets. Deterministic supplemental offsets import the existing Zustand module only in the browser test, without altering shipped source.

The event fixture uses `?lat=40.7&lon=-74&date=2026-11-27&time=20:00`. It preserves Rise **19:49 / 00:45 UTC, 28 Nov** and Set **10:40 / 15:36 UTC** in primary results and Explain. Greenwich retains **13:23 / 13:23 UTC** and **05:58 / 05:58 UTC**, without unnecessary date suffixes. Polar `Up all day`, `Does not rise`, and `Does not set` fallbacks pass.

The first clock-test draft expected an actual space where the incumbent uses a CSS margin before `·`; the test expectation was corrected **before** the intended missing-label RED was recorded. The initial refraction run was 9/10 because its old exact `Rise` selector no longer matched the approved label; `refraction-ui-before-label-selector-update.log` preserves that result. Only those two label selectors were updated and all 10 tests reran green. The loaded-font scratch script initially waited for a hidden phone civil marker to become visible; it was corrected to wait for attachment, not visibility, then all four scenarios reran green. Neither correction required an extra production change.

The existing deliberate render-error test still logs its expected recovery fault in `ui-hardening.log`; unexpected browser/hydration errors remain test failures. Focused orientation tests emit the existing react-test-renderer deprecation warning.

## Rendered layout and visual inspection

Captured normal, real paused simulation, and Explain states at **1280×800, 1440×900, 390×844, and 844×390 landscape**. Tests deliberately block external fonts for deterministic system-fallback coverage. A separate scratch fixture fetched the app’s Google Fonts stylesheet/font bytes, fulfilled that stylesheet with embedded actual Outfit/Fraunces fonts, and confirmed loaded font faces before capturing the same viewport states plus New York event/Explain examples. No fonts or dependencies were installed or added to the repository.

| Viewport | Native chart stage (unchanged normal → paused) | Conditional notice height | Added panel height |
| -------- | ---------------------------------------------- | ------------------------- | ------------------ |
| 1280×800 | 473.0625×256 CSS px                            | 32px                      | 40px               |
| 1440×900 | 473.0625×256 CSS px                            | 32px                      | 40px               |
| 390×844  | 334×208 CSS px                                 | 48px                      | 56px               |
| 844×390  | 788×208 CSS px                                 | 32px                      | 40px               |

The normal-to-simulated panel growth in this table is only the conditional text plus the existing 8px flex gap; the plot does not shrink or grow. All four viewports have no horizontal overflow in normal or paused states. Primary event terms remain one 20px line in the deterministic layout tests. Ordinary visits have no simulation paragraph or its conditional height. This does not assert that clock-label wrapping can never affect the card: the parent measured a 0px normal-desktop and 4px normal-phone card difference in the matched New York before/after captures, with 0px change to either plot height. Loaded fonts retain the same stage/notice measurements. Existing responsive vertical scrolling is preserved; full-page screenshots do not mean the entire app fits in one short viewport.

The new muted copy is `rgb(154,163,178)` and the gold label `rgb(212,162,76)` on the existing `rgb(21,28,44)` surface: calculated contrast is **6.69:1** and **7.35:1**, respectively. Screenshots were actually opened and inspected, including original-resolution phone notice/event crops, desktop/phone Explain, landscape and New York UTC rollover. No clipping/collisions were observed in the changed text. Existing unrelated styles were not redesigned.

Artifact naming:

- Pre-change incumbent capture: `baseline-1280.png`.
- Deterministic/fallback states: `clarity-{1280,1440,phone,landscape}-{normal,paused,explain}.png`; corresponding `clarity-*-layout.json` records.
- Loaded-font states: `loaded-{1280,1440,phone,landscape}-{normal,paused,explain}.png`; native-resolution panel captures `loaded-*-{normal,paused}-sky.png`.
- Loaded-font New York labels/rollover: `loaded-*-ny-events.png` and `loaded-*-ny-explain.png`.
- Representative inspected files: `loaded-phone-paused-sky.png`, `loaded-phone-ny-events.png`, `loaded-phone-ny-explain.png`, `loaded-1280-normal-sky.png`, `loaded-1280-explain.png`, `loaded-1440-paused-sky.png`, `loaded-1440-normal.png`, `loaded-landscape-paused-sky.png`.

### Actual Share PNG

`clarity-share.png` was generated through the real Share dialog and **Download PNG** action, decoded with pngjs, verified **1600×900**, and opened for visual inspection. Both diagrams, moment/location metadata, mean-solar/civil time lines and footer remain intact and legible. This patch intentionally does not add the UI-only notice or rise/set labels to the infographic or change its existing export disclosure/layout. Existing rendered refraction tests also pass real PNG/orientation nonregression checks.

PNG SHA-256: `c4ae0475303674f37b052ec73c37e8037ef19268c8114a9290a68130f63e5f0a`.

## Integrity, tooling, resources and remaining gate

- Compared all **9** unrelated files against `unrelated-baseline.json` using SHA-256: **zero mismatches**. Unrelated sketches, index and plans remain untouched. No staging, commit, push, deployment, package/config changes, or fixed-port fixture was performed.
- Fixtures use loopback with OS-assigned ports and close only their own browser contexts/browser/server through APIs. The focused test cleanup assertions passed. The loaded-font script explicitly reported contexts=0, browser disconnected and server closed. The parent’s server on 58211 was not controlled, stopped or modified.
- Impeccable context allowed this narrow incumbent refinement without new product/design documents. As a delegated subagent, the accepted task brief supplied direction rather than a new interactive interview. The changed-file detector was run once from the repository root: **87** findings, all in unrelated sketches (37 in 008, 48 in 009, 2 in sketches/index.html), **zero** attributed to edited app files. `impeccable-detector.log` preserves the result; no unrelated styles were changed to satisfy it.
- Procedural lesson added to this active profile’s existing `moongeometry-ephemeris` skill: real start/pause/observable-change evidence, persistent offset disclosure, and attachment-based readiness for collapsed phone controls. No other profile was modified.
- The implementer's remaining parent gates are completed in the final section below. No physical-device, sensor, Safari/WebKit or deployment certification is claimed. Scratch evidence is local and subject to the profile cache retention policy; preserve selected artifacts elsewhere if permanent binary evidence is required.

### Final source SHA-256 (raw working-tree bytes)

| File                                 | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `app/src/components/moon-app.tsx`    | `3bbc1c581eccaa7ad6731ebfdfbb1d1ae61b2dbb15b3cccebcdf7c8622559567` |
| `app/scripts/ui-hardening.test.mjs`  | `9f3e8541c2ec6d97378a56d673249fffa7788df9045dce43f3156e85f82a78b8` |
| `app/scripts/refraction-ui.test.mjs` | `277d9802468d031a9f3113edba60978fa9596611b2c0cc61497c573002c97c4a` |

The verification document is excluded from its own hash table. The parent confirmed these three source/test hashes remained unchanged throughout both reviews and the complete final gate; only documentation was corrected and completed afterward.

## Final parent verification and review

Final task-owned commit scope consists of the four implementation files listed above plus `docs/plans/2026-11-27-sky-mode-clock-clarity.md`. No unrelated file is staged.

- **Spec review PASS:** `sa-0-f99dc418`, no gaps or scope creep. Independently read all five staged files, the intended RED failures, GREEN logs, visual/PNG artifacts and source hashes.
- **Independent code/security and integration review PASS:** `sa-0-6c89553e`, no blocking security concerns or logic errors. Parent added-line security scan also had no findings. Both reviewers' documentation nits were corrected: escaped command-table regex pipes, checkpoint wording, and the separate normal-phone versus conditional-copy height measurements.
- **Full serial gate PASS: 500 tests, 500 passed, 0 failed, 0 skipped, 40 discovered files.** Baseline was 484 tests in 40 files; this patch extends an existing normally discovered test file rather than adding a new test root. No browser-backed tests overlapped the build.
- Final typecheck, targeted ESLint/Prettier on all three edited source/test files, production build and staged whitespace check passed. Migration safely skipped without `DATABASE_URL`; the existing PGLite fallback migrates itself. Existing upstream deprecation/build/line-ending warnings remain non-fatal.
- Parent independently verified the actual local app at 1440x900, 1280x800, 390x844 and 844x390. Normal visits have no simulation notice; the event basis is named. Matched New York normal visits have identical physical SVG attributes to the accepted production baseline. Plot heights remain 256px desktop / 208px phone, with no horizontal overflow or browser/hydration errors in the checks.
- Real Slide playback and pause retain the primary notice with the playback button off; Explain retains its consistent warning and clock label; the existing Current time action clears the independent state and notice. Evidence: `parent-normal-acceptance.json`, `parent-mode-acceptance.json`, `parent-after-*.png`, `parent-paused-phone.png`.
- Reviewer suggested optional automated false-positive coverage for synchronized Spin. The parent additionally exercised actual Spin from a clean synchronized URL: time advanced, every sample had no simulation notice, pause stayed quiet, and interaction error capture was empty. Evidence: `parent-synchronized-spin.json`. This is a manual smoke supplement, not an additional counted automated test. Initial supplemental driver attempts had a DOM-value CDP serialization error and an absent old navigation hook; the clean retry used Boolean readiness and verified an interaction-scoped hook on each sample, without application changes.
- The actual downloaded `clarity-share.png` was opened and inspected by the parent as an export nonregression check. No export source, metadata or geometry was changed by this UI-only task.
- All **9/9 unrelated SHA-256 baselines remain unchanged**. Only the five task files are included in the verified `dev01` commit. Main and production remain at the previously accepted `64d70b2`; no push or deployment is part of this local checkpoint.

The final gate used portable Node from `app`, in this order:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
OUT='C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-clarity'
"$NODE" node_modules/typescript/bin/tsc --noEmit
MOON_HARDENING_ARTIFACT_DIR="$OUT/parent-full-browser" MOON_REFRACTION_ARTIFACT_DIR="$OUT/parent-full-refraction" \
  "$NODE" scripts/run-tests.mjs --test-concurrency=1
"$NODE" scripts/with-app-env.mjs "$NODE" node_modules/vite/bin/vite.js build
"$NODE" scripts/migrate.mjs
```

Evidence: `parent-final-typecheck.log`, `parent-final-suite.log`, `parent-final-build.log`, `parent-final-migrate.log`, `parent-final-gate.json`, `parent-reviewed-source-hashes.json`, `parent-reviews.json` and `parent-staging.json` in the artifact directory above. This verifies the scoped implementation and its recorded automated/rendered checks, not physical-device or assistive-technology certification.
