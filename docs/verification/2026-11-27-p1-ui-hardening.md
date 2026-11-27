# P1 UI hardening verification — 2026-11-27

Scope: `dev01`, starting at `770e03b`. The implementer handoff below was uncommitted for independent review; the final parent gate is recorded at the end. This patch does not include chart-legibility changes, astronomy/model or dependency changes, unrelated user work, push or deployment.

## Behaviour

- Native time inputs report `""` while an hour/minute segment is incomplete. Previously `split(":").map(Number)` produced an undefined minute, which passed `Number.isNaN` and reached `fromLocal`, invalidating the astronomical instant and unmounting the workbench.
- Reuse the existing strict `HH:mm`/range validator before converting or committing. Keep an editable local draft associated with its source instant/longitude. Incomplete edits retain the last valid astronomical answer and URL; blur restores the authoritative clock. External instant/longitude changes take display precedence. Midnight and 23:59 remain valid.
- The render-error screen now explains recovery, offers **Reload this view** without clearing state or changing the URL, and puts the exception in a technical-details disclosure.
- Explain and Share use a thin shared Radix Dialog wrapper. Original panel/overlay classes, sizes, sections and export operations are retained. Focus enters the dialog, remains contained with Tab/Shift+Tab, Escape closes, and focus returns without scrolling. Explain retains its non-dismissable backdrop; Share retains backdrop dismissal. Title/description associations and `aria-modal` are explicit.

## Real RED → GREEN evidence

Commands below run from `C:/hermes/moongeometry/app` using:

```sh
NODE=C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe
"$NODE" --test scripts/ui-hardening.test.mjs
"$NODE" --test --test-name-pattern='Explain supports' scripts/ui-hardening.test.mjs
"$NODE" --test --test-name-pattern='Share contains' scripts/ui-hardening.test.mjs
```

Evidence directory (local, not committed):
`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/moongeometry-hardening/`

| Slice                                         | Before implementation                                                                      | After implementation                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Clear native time segment with Home/Backspace | `time-red.log`: 0/1; workbench heading absent, Astronomy Engine rejects invalid instant    | `time-green.log`: 1/1                                                         |
| Actionable render-error recovery              | `recovery-red.log`: error screen contains only exception; helpful recovery assertion fails | `recovery-green.log`: 3/3, real button reload restores seeded place/date/time |
| Explain keyboard behaviour                    | `explain-red.log`: 0/1, opening leaves focus outside                                       | `explain-green.log`: 1/1                                                      |
| Share keyboard behaviour                      | `share-red.log`: 0/1, opening leaves focus outside                                         | `share-green.log`: 1/1, loading/ready and real PNG decoding exercised         |

The initial recovery run also exposed an incorrect test expectation for the existing Summer preset (22:00, not 21:00); the expectation was corrected from the actual preset implementation, not by changing production behaviour. Subsequent matrix checks caught missing explicit `aria-modal` and added it. Radix preserves live regions and their ancestor landmark; background accessibility assertions therefore check interactive buttons, navigation and sliders, rather than requiring the entire ancestor `main` to disappear.

## Focused acceptance

`focused-green.log`: **10 tests passed, 0 failed, 0 skipped**, exit 0.

- Seed: `?lat=51.5&lon=-0.1&date=2026-12-21&time=21:00`; wait for client civil-zone resolution before interaction.
- Real keyboard hour/minute deletion and correction; native replacement; blur restoration; 00:00, 23:59 and 09:05; date preservation; URL reload restoration; exact UTC/civil readouts. Longitude 15° midnight case proves the preceding UTC date is retained correctly.
- Scrubber, preset, date, longitude and running Spin Earth update the clock without a stale draft overwriting newer state. Phone scrubber URL edits retain scroll and history length. UTC/civil remain text; mean solar time is the only time input.
- Both dialogs: repeated Escape/Close/backdrop cycles, focus containment and return, accessible title/description, inaccessible background controls, unchanged observation URL, exact before/after workspace bounds/scroll/history.
- Desktop 1280×800 and 1440×900; phone 390×844 with mobile/touch emulation; no horizontal page overflow.
- PNG preview generated and decoded; no Copy/Download/external share action clicked and no location/sensor permissions granted.
- Isolated OS-assigned loopback Vite server, auth disabled/database environment removed then restored, fresh owned browser contexts, bounded cleanup. Unexpected page/console errors fail; only the explicitly injected render fault is allowed in its single test. Fault injection and export delay affect served responses only.
- Screenshots: `desktop-1280-*`, `desktop-1440-*`, `phone-390-*` (Explain, Share and resting workbench). Inspected desktop resting workspace, desktop Explanation and phone Share; incumbent composition retained. Open/close geometry equality is automated, not a claim of pixel-identical before/after baseline screenshots.

## Static gates and discovery

All exit 0; individual command/output logs are in the evidence directory:

- `typecheck.log`: portable Node + `node_modules/typescript/bin/tsc --noEmit`.
- `targeted-eslint.log`: portable Node + `node_modules/eslint/bin/eslint.js` on all four touched TSX files and `scripts/ui-hardening.test.mjs`.
- `targeted-prettier.log`: portable Node + `node_modules/prettier/bin/prettier.cjs --check` on the same five files.
- `diff-check.log`: `git diff --check` (only standard Windows LF→CRLF advisory warnings).
- Normal runner discovery: **39 files**, up from baseline **38**, including the new suite; no runner/package-script edits.
- `unrelated-final.json`: all **9** files in the parent's unrelated SHA-256 baseline unchanged. No unrelated files staged or modified by this task.

## Independent-review follow-up: actual-trigger focus return

- Review found that a mount-time `document.activeElement` snapshot is not necessarily the opening button: pointer activation can leave the body or an unrelated control focused. Preventing Radix's default close autofocus then restored the wrong element.
- Strict TDD: added the two `without prefocus` browser regressions before production edits. Native DOM `mousedown` prevention suppresses only focus transfer; Playwright drives a real, trusted click. Tests verify the trigger was not focused at click time and the actual dialog opened. This is deterministic Chromium **no-prefocus semantic coverage, not Safari runtime certification**; no React internals are mocked.
- `MoonApp` now records each opening event's `currentTarget` synchronously. The actual button also represents the open state, and passes through Explain/Share to `AppDialog`. On close, the captured connected button receives `focus({ preventScroll: true })`; no active-element snapshot or render-time browser-global access remains. Every reopening captures its current trigger anew.
- Both new tests cover body and unrelated date-input starting focus, repeated opening, Escape/Close/backdrop policies, exact trigger identity, unchanged scroll/URL, focus containment and decoded Share PNGs. Existing keyboard, loading/ready, background accessibility and desktop/phone dismissal tests remain unchanged.

Reproduction from `app`, with the same portable `NODE` above:

```sh
"$NODE" --test --test-name-pattern='without prefocus' scripts/ui-hardening.test.mjs
"$NODE" --test scripts/ui-hardening.test.mjs
```

Evidence in the same profile scratch directory:

- `focus-return-red.log`: **0 passed, 2 failed**, exit 1, before production edits. Both fail with `must restore the actual opening button, not the previously focused BODY`, after the trusted no-prefocus click/open assertions pass.
- `focus-return-green.log`: **2 passed, 0 failed, 0 skipped**, exit 0; same regressions after the fix.
- `focus-return-focused-green.log`: **12 passed, 0 failed, 0 skipped**, exit 0. Only the existing deliberate recovery-fault test logs its expected exception; no unexpected browser/hydration errors.
- `focus-return-typecheck.log`, `focus-return-eslint.log`, `focus-return-prettier.log`, `focus-return-diff-check.log`: typecheck, targeted ESLint (three modified TSX files plus browser test), Prettier (same files plus this note) and diff check all exit 0. Before editing production, typecheck and the **34** focused astronomy/globe tests also passed.
- `focus-return-unrelated.json`: all **9** baseline SHA-256 hashes unchanged. Existing staged patch remains staged as supplied; these follow-up edits are unstaged. No commit, push, deployment, server shutdown, skill/config edit or change to the concurrent sky-chart sketch.
- `focus-return-design-detector.json`: optional Impeccable `detect --json --changed` exits 2 for findings in unrelated existing sketches; none in these modified production components. Those sketches were left untouched. No presentation classes, astronomy/time logic or export operations were changed by this fix.

Full suite/build are not rerun by this fix agent; the parent owns the serial post-fix rerun and re-review. Earlier verification evidence above is preserved.

## Final parent verification and review

- Independent spec review `sa-0-72b08cee`: PASS; no gaps or scope creep.
- Independent code/security review `sa-0-24b4edd7`: initial focus-return issue resolved through the RED/GREEN cycle above; re-review PASS with no remaining blocking logic errors or security concerns. Optional future coverage: switch Explain sections while repeating focus checks.
- Final normal discovered suite: **478 tests passed, 0 failed, 0 skipped**, across **39 files**. Baseline before code changes was **466 passed** across **38 files**. Evidence: `final-suite.log`, `final-results.json`.
- Final typecheck, targeted ESLint and Prettier, staged diff check: PASS.
- Production build ran only after the complete browser-backed suite exited: PASS. The package build steps were run through the portable Node executable and app-env wrapper, followed by `scripts/migrate.mjs`; the migration safely skipped without DATABASE_URL. Upstream bundler `use client` directive warnings remain non-fatal. Evidence: `final-typecheck.log`, `final-build.log`, `final-migrate.log`.
- Parent independently reproduced safe native time clearing/correction (including 00:00), unchanged last-valid URL, dialog focus entry, Escape and return to the real clicked Explain trigger. Resting 1440x900 screenshot: `parent-verified-desktop.png`.
- All **9** unrelated baseline file hashes still match. Only task-owned source, tests, plan and this record are staged for the verified `dev01` commit; no unrelated sketch work is included. `main` remains at `770e03b`; no push or deployment is part of this checkpoint.
- The separate chart-legibility comparison is a disposable sketch and is not a production chart change or part of this hardening patch.

Physical phone keyboard/touch/sensor behaviour, native Safari execution and screen-reader acceptance remain **untested**. Chromium emulation, no-prefocus semantic coverage and accessibility-tree checks do not establish hardware or assistive-technology certification.
