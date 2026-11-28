# Orbital sightline context — 2026-11-28

## Approved scope

Add a short contextual explanation beside the orbital diagram, without a dashed line or renderer change. Base: `c2fcf5ed2d76a62ecac514cab1a7af072a55150c`, branch `dev01`.

- Below the native canvas, before its existing controls: **Moon below your horizon — Earth blocks the sightline.**
- Use the already shared apparent-altitude value, strictly below zero, consistent with Local sky path. No note at/above zero; no new astronomical calculation.
- Active or paused independent-orbit states use **Simulated Moon below your horizon** with the existing `orbit !== instant || playing === "slide"` convention.
- Ordinary muted paragraph, no alert/live-region churn, tooltip, toggle, overlay or extra legend. The note can wrap on phones without shrinking either chart.
- No changes to scene geometry, line style/depth, clock/store/URL/provider, exports, styles or dependencies. Production remains behind preview acceptance.

## Evidence

Profile scratch: `moongeometry-orbital-context/`.

- `red.log`: rendered London `51.5, 0`, November 28, 2026, mean solar `18:11`, failed because the orbital note was absent (`0 !== 1`).
- `green-1.log`: real note and outside-canvas placement passed at 1440×900, 390×844 and 340×452.
- `red-2.log`: real Slide activation failed because ordinary copy did not identify the simulated Moon; corresponding prefix was then added.
- `green.log`: **4/4** rendered tests pass with zero failures/skips. Native time edits remove/restore the note while retaining the exact canvas node; at/above-zero boundary fixtures omit it; real Slide and pause retain simulation wording.
- `green/evidence.json`: native canvas **388px desktop / 320px phone**, sky **256px / 208px**, no horizontal overflow or note/canvas overlap, all owned contexts/browser/server closed and environment restored.
- Baseline typecheck and astronomy/map **34/34** passed before implementation. Changed-source/test ESLint, Prettier and typecheck pass.
- An early response-only boundary fixture incorrectly changed the hydration seed. `harness-boundary-ssr-failed.log` retains that failure; the fixture now changes only after mount and retains browser-error assertions. Context cleanup uses `finally` even if an assertion fails. No application change was made to suppress the harness-induced warning.

## Parent release gates

Independent spec/code/security review `deleg_9e512b55` / `sa-0-66355ee6`: **PASS**, no security concerns, logic errors or suggestions. The reviewer read the complete three-file staged diff and component context, matched staged/working source hashes, and checked archived RED/GREEN and cleanup evidence. No implementation/test changes followed review.

Full serial gate `proc_a6f60f5609df`: **PASS**, `ORBITAL_CONTEXT_FINAL_EXIT=0`. Actual totals: **516/516 tests**, **43 discovered files**, zero failed/cancelled/skipped. Typecheck and production build passed; migration safely skipped without `DATABASE_URL`. Nonfatal module-directive build warnings remain in the log. The new fixture read-back confirms zero contexts, closed browser/server and restored environment.

The first full run passed 515/516: the existing `fallback-390x844-expanded` archived layout comparison differed by 21px in the time-group height. The unchanged focused outside-gate rerun passed all 14 archived comparisons, and the unchanged complete retry passed. No baseline, application code or existing test was weakened/changed to obtain that result; its intermittent cause is not established. Evidence: `first-full-suite-failed.log`, `layout-diagnostic.log`, `layout-diagnostic/`, `final-suite.log`, `final-build.log`, `final-migrate.log`, `full-context/evidence.json`, `full-layout/`.

From `app`, the complete gate ran serially with portable Node: `tsc --noEmit`, then `scripts/run-tests.mjs --test-concurrency=1` with `MOON_ORBIT_CONTEXT_ARTIFACT_DIR` and `MOON_LAYOUT_ARTIFACT_DIR` set to this task's artifact folders, and `MOON_LAYOUT_BASELINE_DIR` set to the original layout integration's `supplemental-baseline`; then `scripts/with-app-env.mjs <node> node_modules/vite/bin/vite.js build` and `scripts/migrate.mjs`. Source/test fingerprints and all 9 unrelated, 16 immutable and 11 study-file hashes are checked in `final-attestation.json`.

At this commit boundary, exact-SHA dev01 preview read-back follows as a post-commit release gate; production promotion remains unapproved. Browser checks are Chromium, not physical-device/Safari/screen-reader certification.
