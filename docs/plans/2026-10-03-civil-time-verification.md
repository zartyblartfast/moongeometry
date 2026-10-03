# Civil Time Final Verification Record

**Date:** October 3, 2026
**Specification:** `docs/plans/2026-10-03-civil-time-display.md`
**Civil-time implementation range:** `25e168a969fcb86f4f31e5d6211021eebc374001..37369bba20089b44b6c1ae243c6e10cfee935fc1` (inclusive; parent baseline `e8f34d06ef1e4049ead046955901ce606514e8f7`)
**Complete unpushed verification range:** `2d8be29ba6d3a3d51da022b16bb9e1071bb52b9d..37369bba20089b44b6c1ae243c6e10cfee935fc1`
**Implementation HEAD verified:** `37369bba20089b44b6c1ae243c6e10cfee935fc1` (`feat: show local civil time`)

## Outcome and limitations

The focused civil-time gate, full test suite, typecheck, targeted lint, production build, diff check, and browser interaction scenarios passed. No production code was changed during final verification.

Two existing/non-blocking findings remain:

1. At `1280×800`, the document measured `1265×813` CSS pixels against a `1265×800` client area: there was no horizontal overflow, but the compact page retained 13 pixels of vertical scroll. The complete two-diagram layout and controls remained usable. At `1440×900`, document and client height were both 900 pixels with no overflow.
2. The repository-wide lint command remains non-clean in files outside this implementation range: `app/src/lib/app-data/client.server.ts:281:13` has `no-empty`, and `app/src/lib/auth/use-current-user.ts:59:3` has an unused eslint-disable warning. Neither path changed in `origin/main..37369bb`; the required targeted lint passed.

Time-zone resolution uses `@photostructure/tz-lookup` `11.7.0`. It is deterministic for the bundled data but coordinate-to-zone answers near political borders, coastlines, or disputed areas should not be treated as authoritative legal advice. Historical formatting is also limited by the host `Intl` time-zone data.

## Automated gate

Run from `C:/hermes/moongeometry/app` unless noted otherwise.

| Command | Result |
| --- | --- |
| `node --experimental-strip-types --test src/lib/civil-time.test.ts src/lib/use-civil-time.test.ts src/lib/civil-time-line.test.ts` | PASS — 35 tests, 35 passed, 0 failed |
| `node --experimental-strip-types --test src/lib/earth-map.test.ts src/lib/astro.test.ts` | PASS — 31 tests, 31 passed, 0 failed |
| `npm test` | PASS — script glob reported 0 tests; TypeScript suite reported 121 tests in 16 suites, 121 passed, 0 failed |
| `npm run typecheck` | PASS — `tsc --noEmit` |
| `npx eslint src/lib/civil-time.ts src/lib/civil-time.test.ts src/lib/use-civil-time.ts src/lib/use-civil-time.test.ts src/lib/civil-time-line.ts src/lib/civil-time-line.test.ts src/components/moon-app.tsx src/components/place-search.tsx src/lib/earth-map.ts src/lib/earth-map.test.ts` | PASS — no findings; Earth files were included because they changed in the complete verification range |
| `npm run build` | PASS — client, SSR, Nitro/Vercel output, and migration step completed; migration correctly skipped because `DATABASE_URL` was unset |
| `git diff --check` | PASS |
| `git status --short --branch` before adding this record | `## main...origin/main [ahead 16]`; clean working tree |

The focused hook tests emitted React's existing `react-test-renderer is deprecated` warning. The production build emitted the existing Node child-process `DEP0190` warning, a client chunk-over-500-kB warning, Rolldown `use client` module-directive warnings, and one missing `debugName` timing-report warning. None failed the build.

A diagnostic `npm run lint` was also run. It failed only on the two pre-existing findings listed above; those files are unchanged in the verified range.

## Build artifacts and time-zone separation

Relevant client artifacts from the successful production build:

```text
earth-land-BwqA2sJg.png         65.61 kB
styles-DozFniWr.css             18.63 kB  gzip 4.66 kB
rolldown-runtime-CbXtAM7H.js     0.58 kB  gzip 0.36 kB
tz-DhcNAvu4.js                  72.57 kB  gzip 29.21 kB
index-Cb1EytN8.js              431.26 kB  gzip 135.24 kB
routes-zCvTeeHa.js             638.49 kB  gzip 174.17 kB
```

Relevant server artifact:

```text
_libs/photostructure__tz-lookup.mjs  75.52 kB  gzip 29.64 kB
```

The time-zone data is therefore split from the main client route as `tz-DhcNAvu4.js`. In a fresh cache-disabled development browser, the resolver loaded `@photostructure_tz-lookup.js` as a separate resource (`179,074` decoded bytes); civil-time resolution completed from that resource. The application root returned HTTP 200.

## Fresh browser and interaction gate

The app was served locally at `http://127.0.0.1:8080/`. A fresh browser session had cache disabled through CDP. A second fresh session installed error, unhandled-rejection, `console.error`, and `console.warn` capture before navigation.

### Layout and editability

- `1280×800`: two diagrams remained side-by-side, controls and labels were usable, and `scrollWidth === clientWidth === 1265`; the 13-pixel vertical-scroll limitation is recorded above.
- `1440×900`: two diagrams and controls fit in one screen; `scrollWidth === clientWidth === 1440` and `scrollHeight === clientHeight === 900`.
- The only `type="time"` input was **Mean solar time**. UTC and civil values were rendered as read-only text, not form controls.

### Civil-time scenarios

All values below were observed in the rendered browser UI after the resolver reached ready state.

| Scenario | Mean solar / UTC line | Civil line | Resolver zone |
| --- | --- | --- | --- |
| London summer, `51.5, 0.0`, `2026-07-15 12:34` | `Same moment: 12:34 UTC, 15 Jul · same as this clock.` | `Civil time: 13:34 BST, 15 Jul · UTC+01:00.` | `Europe/London` |
| London winter, `51.5, 0.0`, `2026-01-15 12:34` | `Same moment: 12:34 UTC, 15 Jan · same as this clock.` | `Civil time: 12:34 GMT, 15 Jan · UTC+00:00.` | `Europe/London` |
| Kathmandu, `27.7, 85.3`, `2026-01-15 18:15` | `Same moment: 12:33 UTC, 15 Jan · 5h 41m behind this clock.` | `Civil time: 18:18 GMT+5:45, 15 Jan · UTC+05:45.` | `Asia/Kathmandu` |
| Open Pacific, `0.0, -140.0`, `2026-01-15 02:40` | `Same moment: 12:00 UTC, 15 Jan · 9h 20m ahead of this clock.` | `Civil time: 03:00, 15 Jan · UTC-09:00.` | `Etc/GMT+9` |

The ocean line did not expose `Etc/GMT+9` as a rendered place/zone name. The identifier remained available only in the diagnostic title attribute (`IANA zone: Etc/GMT+9`).

### Current Time

Starting from London `2026-01-15 12:34`, **Current time** updated the date, mean-solar clock, UTC line, and civil line together. The exact observed post-click state was:

```text
Date: 2026-10-03
Mean solar: 20:29
Same moment: 20:29 UTC, 3 Oct · same as this clock.
Civil time: 21:29 BST, 3 Oct · UTC+01:00.
URL: ?lat=51.5&lon=0.0&date=2026-10-03&time=20%3A29
```

### Spin Earth

At the default `2 h each second` speed, atomic UI samples advanced coherently:

```text
12:34 -> 13:35 -> 14:35 -> 15:36 -> 16:36
```

At every sample, mean-solar input, UTC line, civil line, and sky-chart headline showed the same minute. Animation was visually continuous enough for smoke validation. While playing, the URL stayed at the pre-animation moment; when stopped it updated to `date=2026-01-15&time=16%3A36`.

### Slide the Moon across London DST

Starting immediately before the 2026 UK daylight-saving transition:

```text
Before:
Date: 2026-03-28
Mean solar: 12:34
UTC: 12:34 UTC, 28 Mar
Civil: 12:34 GMT, 28 Mar · UTC+00:00
Headline: 79% lit · 28 Mar 2026 12:34

After the first whole-day step:
Date: 2026-03-29
Mean solar: 12:34
UTC: 12:34 UTC, 29 Mar
Civil: 13:34 BST, 29 Mar · UTC+01:00
Headline: 88% lit · 29 Mar 2026 12:34
```

The mean-solar and UTC times of day stayed fixed, the date advanced by exactly one day, and the civil clock advanced by one hour across the DST transition. After stopping, the URL updated to `date=2026-03-29&time=12%3A34`.

### Coordinate refresh

A mutation observer was attached to the resolved London civil line before changing longitude from `0.0` to `85.3`. The observed text sequence went directly from:

```text
Civil time: 12:34 GMT, 15 Jan · UTC+00:00.
```

to:

```text
Civil time: 19:34 GMT+7, 15 Jan · UTC+07:00.
```

No `Civil time: calculating…` mutation was observed after the first resolution. The lookup completed too quickly to expose a long-lived retained intermediate line, but the required no-flash behavior was observable.

### URL and reload

For Kathmandu, both before and after a full reload:

```text
URL: ?lat=27.7&lon=85.3&date=2026-01-15&time=18%3A15
Mean solar: 2026-01-15 18:15
UTC: 12:33 UTC, 15 Jan
Civil: 18:18 GMT+5:45, 15 Jan · UTC+05:45
```

The query key list was exactly `lat`, `lon`, `date`, `time`; reload restored the same represented moment and location.

### Runtime errors

After initial load plus Spin Earth and Slide the Moon interactions, the fresh instrumented session captured:

```text
window error events: 0
unhandled rejections: 0
console.error calls: 0
console.warn calls: 0
```

No hydration error was observed.

## Repository state at recording

Before adding this record, `main` was clean and `16` commits ahead / `0` behind `origin/main`. The verified implementation had not been pushed. Committing this document is expected to make the local branch `17` commits ahead / `0` behind; pushing is intentionally outside this verification task.
