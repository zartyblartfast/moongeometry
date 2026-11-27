# Sky mode and event clock clarity implementation plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Address the two accepted comprehension findings with a small primary-result/Explain disclosure patch.

**Architecture:** Derive the visible simulation state from the existing `orbit !== instant || playing === "slide"` contract, not only whether playback is running. Name the existing mean-solar event clock without changing any formatter calculations or adding another editable clock.

**Tech Stack:** React/TypeScript, existing Zustand state, Playwright/Vite and Node's normal test discovery; no new dependencies.

## Scope and baseline

Start on `dev01` at `64d70b2`, matching main/remote refs. The accepted production app has 484 passing tests across 40 discovered files. Fresh typecheck and focused astronomy/globe tests pass. Nine unrelated existing working files are inventoried in profile scratch `moongeometry-clarity/unrelated-baseline.json` and must remain untouched.

The user accepted these findings: MG-C01, a paused independent-orbit simulation is disclosed only in Explain; MG-C02, the first rise/set value is mean solar time but is unnamed beside UTC. The read-only review and exact repro evidence are in profile scratch `moongeometry-ux-comprehension`.

## Task 1 — Primary simulation notice, vertical RED/GREEN

**Modify:** `app/src/components/moon-app.tsx` (primary Local sky path section; reuse the existing Explain state semantics).
**Test:** Prefer extending `app/scripts/ui-hardening.test.mjs` and its existing owned fixture; a small normally discovered new test file is acceptable if extension is unsuitable.

1. Add one rendered failing regression: run Slide the Moon, observe a changed declination/orbital result, pause, require a visible primary notice. Assert the control is no longer pressed so the test cannot pass solely because animation is active. Observe and archive RED before source edits.
2. Add the smallest conditional, compact readable notice near the primary sky moment/result; reuse the existing truthful meaning: the orbital position is explored separately from the observer clock, and date/time should be set again before comparing with an observation. Example shape:

```tsx
const simulated = orbit !== instant || playing === "slide";
// Inside the existing Local sky path section, outside the result dl:
{simulated && (
  <p className="text-xs leading-5 text-muted">
    <span className="font-semibold text-gold">Slide the Moon simulation.</span>{" "}
    The orbital position differs from the selected date/time. Set the date and
    time again before comparing with an observation.
  </p>
)}
```

The final copy/placement may be shortened after rendered inspection. Do not add a new card, modal, control, persistent idle banner or redundant explanation. Keep Explain consistent. Preserve plot heights and the two-view instrument.
3. GREEN, then cover active and paused states, independence retained through another playback mode, no notice on an ordinary/shared visit, no false clearing on latitude/longitude change, and clearing when an existing valid date/time/current-time/preset action synchronizes the clocks. Prefer real UI interactions; controlled existing store state can supplement them but may not replace at least one real start/pause cycle. No test globals in shipped source.

## Task 2 — Event clock wording, next RED/GREEN

**Modify:** the existing primary rise/set presentation and Explain summary in `moon-app.tsx`. Do not modify astronomy, `formatSolarAndUtc` calculation contracts, clocks, providers, URL or store actions.

1. Add and observe a new rendered RED case at New York (`lat=40.7&lon=-74&date=2026-11-27&time=20:00`). Require explicit mean-solar clock naming beside the primary events and in Explain, while retaining the UTC label/date and unchanged numeric values.
2. Use compact point-of-use text: either an explicit first-value label or a clearly associated shared caption. Keep the Moon-centre/standard-atmosphere meaning. Preserve up-all-day/does-not-rise/does-not-set fallbacks and avoid implying those phrases are numerical clock values.
3. GREEN, then check both nonzero-longitude rollover and Greenwich/date-free UTC cases. Mean solar remains the only editable clock and UTC/civil remain read-only. No new clock controls.

## Task 3 — Acceptance and reviews

- Focused commands from `app`, with portable Node:

```bash
NODE='C:/hermes/moongeometry/tools/node-v22.23.3-win-x64/node.exe'
"$NODE" --test scripts/ui-hardening.test.mjs
"$NODE" --experimental-strip-types --test src/lib/astro.test.ts src/lib/earth-map.test.ts
"$NODE" node_modules/typescript/bin/tsc --noEmit
```

- Inspect normal and simulated/paused views at 1440x900, 1280x800, 390x844 and phone landscape. Keep the 256px/208px plot heights, readable unclipped notices/labels, no horizontal overflow and compact existing layout. Check actual Spin/Slide behavior without altering it. Generate a real Share PNG to prove this patch does not regress export; do not add export features or alter its metadata/layout in this step.
- Record RED/GREEN logs, screenshots, exact commands, scope and limitations in `docs/verification/2026-11-27-sky-mode-clock-clarity.md`.
- Parent stages only task files, runs spec review first and independent code/security review second, fixes/re-reviews blockers, and performs the complete serial suite followed by build/migration, targeted lint/format and unrelated-hash checks.
- Commit verified task changes on `dev01`, open the verified local app for review, and report real totals and commit. Keep main/production unchanged pending acceptance; do not promote production automatically.
