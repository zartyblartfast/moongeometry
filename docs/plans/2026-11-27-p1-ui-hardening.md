# MoonGeometry P1 Hardening Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make mean-solar time editing resilient and Explain/Share keyboard-accessible without intentionally changing the resting UI, astronomical model, clock contract or production deployment.

**Architecture:** Keep the last valid shared simulation instant authoritative while incomplete native time input remains a local draft. Reuse installed Radix Dialog primitives through a thin presentation-preserving wrapper where suitable; keep existing appearance and close affordances. Add browser-backed regressions to the normal discovered test suite, plus focused unit coverage where a pure time-validation helper is justified. Add an actionable error fallback without exposing technical exception text as the primary message.

**Tech Stack:** React 19, TypeScript, TanStack Router, Zustand, existing @radix-ui/react-dialog, Node test runner and Playwright Chromium. Portable Node executable: `C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe`.

## Scope and preservation

- Work on `dev01`; do not change `main`, deploy, push, or stage unrelated existing sketch/plan files.
- Existing user files are recorded in the profile scratch `moongeometry-hardening/unrelated-baseline.json`; compare hashes before completion.
- Preserve two clocks, mean-solar-only editable time, UTC/civil read-only references, URL date/time semantics, place/coordinate behaviour, compact two-diagram layout and export.
- Do not implement chart/layout/typographic redesigns in this hardening patch. The later sky-chart comparison is a disposable prototype with production unchanged until user approval.
- No new dependency is required. Playwright's missing matching Chromium runtime was installed as a test prerequisite. Baseline typecheck and 34 focused astronomy/globe tests passed before any production edit; the initial full-suite failures were missing-browser hook failures, not app assertion failures. Re-run the baseline suite after provisioning.

## Task 1 — Safe mean-solar time editing (vertical TDD slices)

**Files:** `app/src/components/moon-app.tsx`; optional focused `app/src/components/mean-solar-time-input.tsx` and/or `app/src/lib/mean-solar-time-input.ts`; tests in `app/scripts/ui-hardening.test.mjs` and a matching `.test.ts` for any new pure helper.

1. Add a real-browser regression on a seeded URL (`lat=51.5&lon=-0.1&date=2026-12-21&time=21:00`). Wait for client readiness, clear a native time segment using keyboard input, and assert the workbench remains mounted, last valid answer and URL are preserved, and a corrected valid value can be entered. Run it on the old code and capture the expected red failure outside the repository.
2. Immediately before editing UI, read Impeccable `reference/craft-floor.md`. Keep the existing UI classes/identity.
3. Implement only the missing resilience: validate a complete HH:mm before calling `fromLocal`/changing the store. An empty/partial/out-of-range value must never reach the ephemeris provider. Keep an editable draft and deterministic blur/recovery behaviour; valid edits remain responsive. Do not permit a draft to silently override subsequent external time changes from presets, scrubber, coordinates, URL restore or animation.
4. Run the same browser regression green. Add the next tests for midnight `00:00`, `23:59`, replacement/correction, and external moment changes while/between editing. Unit validation examples if extracted: `''`, `'21'`, `'21:'`, `'24:00'`, `'12:60'`, nonfinite values must not produce a new instant; `'00:00'` and `'23:59'` must preserve the selected mean-solar date. Avoid changing valid URL parsing rules unnecessarily.
5. Verify UTC/civil references, latitude/longitude/date and the shared URL still describe the same last/next valid instant; no browser/hydration errors.

## Task 2 — Actionable fallback for an unexpected render failure

**Files:** `app/src/lib/error-component.tsx`; associated component/browser tests (normally `app/scripts/ui-hardening.test.mjs`).

1. Write a failing behavioural test that renders or response-only fault-injects the route error state. Assert a clear user-facing message and a working recovery action; do not rely only on source regex assertions.
2. Add the minimal safe recovery (e.g. reload the valid shared view), preserving coordinates/time in the URL. Technical details may be optional disclosure, not the only guidance. Do not reset user state indiscriminately or create retry loops.
3. Demonstrate recovery in a real browser. Explicitly allow only the deliberately induced expected exception in this test; all ordinary tests still fail on console/page/hydration errors.

## Task 3 — Explain and Share modal keyboard behaviour (sequential TDD)

**Files:** `app/src/components/moon-app.tsx`, `app/src/components/share-infographic-dialog.tsx`, optional shared `app/src/components/app-dialog.tsx`, and `app/scripts/ui-hardening.test.mjs`.

1. Add an Explain keyboard regression FIRST. Open via native keyboard/real click; assert initial focus inside, forward/backward Tab cannot reach background controls, Escape closes, and focus returns to Explain. Watch it fail on the old behaviour before implementation.
2. Implement with the existing installed Radix package rather than a homemade incomplete focus trap where practical. Keep meaningful accessible title/description, visible Close, existing panel dimensions/classes, scrollable content and existing explanation sections. Background must be inaccessible during the modal. Preserve existing outside-click policy unless a minimal accessibility implementation requires an explicit documented adjustment.
3. Run Explain regression green.
4. Add Share-specific regressions FIRST: initial focus, containment in loading and ready states, Escape/Close/backdrop where already supported, return to Share. Watch fail, then apply the shared solution. Generating the local PNG preview is allowed; do not trigger external sharing, clipboard or permission requests.
5. Verify repeated opening/closing, both desktop and phone viewports, disabled loading buttons and scroll restoration. The original moment, URL and resting layout must be unchanged after close; avoid focus-return scrolling the viewport unexpectedly.

## Browser test fixture requirements

- Follow the lifecycle pattern in `app/scripts/refraction-ui.test.mjs`: loopback OS-assigned port, auth-disabled isolated fixture, fresh owned browser contexts, bounded cleanup.
- Wait for client readiness, not just SSR input visibility. Capture pageerror and console errors for each context; do not hide failures globally.
- Tests must be discovered by the maintained `scripts/run-tests.mjs` (`scripts/**/*.test.mjs` / `src/**/*.test.ts`). Do not append a suite outside normal discovery.
- Use real keyboard modifiers/keycodes. Test phone as emulation and state the physical-device limitation.
- Save RED/GREEN logs and screenshots under the profile scratch path; record a concise reproducible verification note under `docs/verification/` for the committed patch.

## Task 4 — Reviews and verification gate

1. Implementer leaves an uncommitted, explicit file list. Parent stages only task-owned files.
2. Spec review: verify all requirements above, no scope creep and preserved invariants. Resolve issues before code-quality review.
3. Independent code-quality/security review of the complete staged diff, including new files. Resolve important issues and re-review; do not label a commit verified prematurely.
4. Run typecheck; focused astronomy/globe tests; normal complete discovered suite (serial concurrency for deterministic baseline comparison); targeted ESLint/Prettier for every touched TS/TSX; `git diff --check`; then build AFTER browser-backed tests finish (never overlap the Vite fixture and build).
5. Start a local inspection preview, verify HTTP200, exercise clearing/correcting time and both dialogs, inspect 1280x800, 1440x900 and phone layout, then stop owned resources unless explicitly retained for user inspection.
6. Compare unrelated file hashes and git status against baseline. Commit task-owned changes on `dev01` only after both review gates and actual verification. Report commit hash, ahead/behind counts, tests, limitations and that nothing was pushed/deployed.

## Task 5 — Disposable chart-legibility comparison (after hardening checkpoint)

Create a separate prototype outside production sources, comparing the current sky chart with a restrained margin/label-size improvement using identical geometry and data. Inspect desktop and phone-sized results. Present comparison for user approval; no production chart/layout changes until accepted. This is a visual candidate, not an already validated final design.
