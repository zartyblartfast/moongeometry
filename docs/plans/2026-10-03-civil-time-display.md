# Local Civil Time Display — Technical Specification

> **For Hermes:** Use the `subagent-driven-development` skill to implement this specification task-by-task with test-first changes and separate specification/code-quality review.

**Status:** Revised after technical review; ready for implementation
**Date:** October 3, 2026
**Goal:** Keep mean solar time as MoonGeometry's only editable clock while also showing the UTC and local civil time that represent the same instant at the selected latitude and longitude.

**Architecture:** Resolve the selected coordinates to an IANA time-zone identifier locally with `@photostructure/tz-lookup`. Format the existing absolute `instant` with the browser's `Intl.DateTimeFormat` implementation so daylight-saving and historical offset rules are applied for that exact date. Perform the lookup and civil-time formatting on the client to avoid server/client ICU differences and keep the URL and solar-time model unchanged.

**Tech stack:** React 19, TypeScript, Vite, `@photostructure/tz-lookup`, `Intl.DateTimeFormat`, Node test runner.

---

## 1. Existing behavior and invariants

MoonGeometry currently stores one absolute instant and presents it through several views:

- `instant` is the authoritative clock/Earth-rotation instant.
- `orbit` remains the continuously advancing orbital instant used by Slide the Moon.
- During Slide the Moon, `instant` advances in whole-day steps. The mean-solar and UTC time of day stay fixed while their calendar dates advance; civil time follows the advancing date and may change its time of day when a step crosses a daylight-saving transition.
- The editable date and time controls are mean solar time at the selected longitude.
- `fromLocal()` converts the editable mean-solar date/time back to an absolute instant.
- `formatUtcMomentLine()` shows UTC as a read-only description of that same instant.
- The URL remains `?lat=...&lon=...&date=YYYY-MM-DD&time=HH:MM`, where `date` and `time` are mean solar values.
- Current Time continues to call `setInstant(Date.now())`.

This change must not alter:

- the meaning or editability of mean solar time;
- the `instant`/`orbit` two-clock contract;
- UTC calculations;
- astronomy-provider inputs or outputs;
- sky-chart, rise/set, Moon phase, Earth rotation, or globe geometry;
- URL parameters or URL restoration;
- saved latitude, longitude, or spin settings;
- place-search provider or geocoding requests;
- one-page desktop layout.

Civil time is an additional derived, read-only representation of the existing instant. It must never become a second editable clock.

## 2. Why an IANA zone is required

A fixed numeric offset is insufficient because civil offsets depend on the place and represented date. The same location may use different offsets during standard time and daylight-saving time, and governments can change their rules.

The implementation must therefore derive and retain an IANA identifier such as:

```text
Europe/London
America/New_York
Australia/Sydney
Asia/Kathmandu
```

The identifier, not `BST`, `EDT`, or a fixed offset, is the input to civil-time formatting. Zone abbreviations are presentation-only.

## 3. Coordinate-to-zone lookup

### 3.1 Dependency

Add the current maintained package:

```json
"@photostructure/tz-lookup": "^11.7.0"
```

Update and commit `app/package-lock.json`. The lockfile must resolve an exact version.

Rationale:

- it works locally in the browser;
- it needs no API key or paid service;
- it performs no runtime network request;
- it accepts latitude and longitude and returns an IANA time-zone identifier;
- it includes ocean handling;
- it is the maintained fork of the archived original `tz-lookup` package.

The package is intentionally approximate. Its published benchmark reports roughly 90% agreement on exact zone names for random inhabited points and roughly 95% agreement on current UTC offsets. Mismatches are most relevant near boundaries and where neighbouring zones currently share an offset but have different rule histories. This is acceptable only because MoonGeometry presents the value as informational. The limitation must be recorded in the Explain/caveats copy; do not claim legal, survey-grade, or border-accurate zone resolution.

If future requirements demand authoritative civil-zone identification, replace this resolver with full boundary polygons or a maintained time-zone service without changing the downstream `CivilTimeInfo` contract.

### 3.2 Loading strategy

Do not place the boundary data in the initial route bundle. Load it with a cached dynamic import after the app mounts:

```ts
let timeZoneLookupPromise: Promise<(lat: number, lon: number) => string> | null = null;

function loadTimeZoneLookup() {
  timeZoneLookupPromise ??= import("@photostructure/tz-lookup").then((module) => module.default);
  return timeZoneLookupPromise;
}
```

The exact default-export interop must be confirmed against the installed package and TypeScript declarations. If Vite exposes a CommonJS namespace rather than `module.default`, normalize it inside this loader only; do not spread interop workarounds through React code.

### 3.3 Lookup contract

Create:

```text
app/src/lib/civil-time.ts
```

Export:

```ts
export async function lookupTimeZone(latDeg: number, lonDeg: number): Promise<string | null>
```

Behavior:

1. Reject non-finite or out-of-range coordinates before calling the dependency.
2. Valid latitude range is `[-90, 90]`.
3. Valid longitude range is `[-180, 180]`.
4. Return the IANA identifier for valid coordinates.
5. Catch package/import failures and return `null`; UI rendering must not fail.
6. Do not call a remote API as fallback.

The MoonGeometry sliders already constrain coordinates, but the library boundary must still validate its own inputs.

## 4. Civil-time formatting

### 4.1 Pure formatter

In `app/src/lib/civil-time.ts`, export:

```ts
export type CivilTimeInfo = {
  timeZoneId: string;
  clock: string;
  date: string;
  year: number;
  zoneName: string | null;
  utcOffsetMinutes: number;
  utcOffsetLabel: string;
};

export function formatCivilTime(
  instant: number,
  timeZoneId: string,
): CivilTimeInfo | null;
```

The formatter must:

- accept the existing Unix-millisecond `instant`;
- use locale `en-GB`;
- use `hourCycle: "h23"`;
- display a 24-hour `HH:MM` clock;
- include day and abbreviated month;
- return the civil calendar year as a number;
- request `timeZoneName: "short"` for a compact zone label such as `BST`, `GMT`, `EDT`, or the runtime's equivalent fallback;
- derive the numeric offset for that exact instant;
- normalize the numeric result to `UTC±HH:MM`, including half-hour and quarter-hour offsets;
- return `null` rather than throw when the zone is unsupported by the runtime or the instant is invalid.

Use `Intl.DateTimeFormat(...).formatToParts()` instead of parsing a fully formatted sentence. The helper must control punctuation and ordering itself.

The implementation may use a second formatter with `timeZoneName: "longOffset"` to obtain `GMT+01:00`, but the normalization helper must handle:

```text
GMT
UTC
GMT+1
GMT+01:00
GMT-04:00
GMT+00:09:21
GMT+000921
```

Historical offsets may include seconds. Accept colon-separated or compact second-precision forms, round the absolute offset to the nearest displayed minute, and then apply the sign so negative half-minute values round away from zero consistently. The public contract remains minute-based.

The final user-facing offset always uses `UTC`, two-digit hours, and two-digit minutes:

```text
UTC+00:00
UTC+01:00
UTC-04:00
UTC+05:30
UTC+05:45
```

Do not calculate daylight-saving rules manually. Do not hard-code BST dates or regional offset tables.

### 4.2 Abbreviation behavior

`Intl.DateTimeFormat` may return a localized abbreviation such as `BST`, or a GMT-style fallback such as `GMT+1`. Both are valid.

If the short name is absent, set `zoneName` to `null`; the UI already shows the normalized numeric offset. Tests must not require a particular abbreviation when the runtime is allowed to return a fallback.

For fixed-offset ocean identifiers such as `Etc/GMT+5`, do not expose the raw identifier as a place name and do not infer its offset from the identifier text: the IANA `Etc/GMT` sign convention is inverted. Let `Intl.DateTimeFormat` calculate the offset, set `zoneName` to `null`, and show only the normalized `UTC±HH:MM` value in the visible line. A diagnostic tooltip may identify it explicitly as an IANA zone, for example `IANA zone: Etc/GMT+5`.

### 4.3 Date boundaries

Civil time may have a different calendar date from both mean solar time and UTC. Always include the civil day and month in the compact civil-time line.

`formatCivilTime()` must always return the civil year. It does not receive the mean-solar year and must not decide whether the year is visible. `MoonApp` obtains the mean-solar year from `localParts(instant, lon).y` and includes the returned civil year only when those years differ.

## 5. React integration

### 5.1 Hook

Create:

```text
app/src/lib/use-civil-time.ts
```

Export a client hook:

```ts
export type CivilTimeState =
  | { status: "loading" }
  | { status: "ready"; value: CivilTimeInfo; refreshingCoordinates: boolean }
  | { status: "unavailable" };

export function useCivilTime(
  instant: number,
  latDeg: number,
  lonDeg: number,
): CivilTimeState;
```

Required behavior:

1. Begin lookup only after React mounts in the browser.
2. Show `loading` only when no civil-time result has ever been resolved in the mounted component.
3. When latitude or longitude changes after a result exists, keep displaying the previous line with `refreshingCoordinates: true` until the replacement is ready. Do not flash `calculating…` during ordinary slider movement.
4. Ignore a completed lookup result unless its latitude and longitude still match the latest request. A result for an older slider or place-search position must never replace the current line.
5. Reuse the cached module import. After the module has loaded, later coordinate lookups are local and should normally replace the line without a perceptible loading state.
6. Re-run formatting when `instant` changes without repeating the coordinate lookup when the coordinates are unchanged.
7. Return `unavailable` if the current coordinate lookup or formatting fails; do not leave a known-stale result indefinitely after failure.
8. Do not write the zone identifier to the URL or local storage.

A suitable internal split is:

- effect keyed by `latDeg` and `lonDeg` resolves `timeZoneId`;
- memo keyed by `instant` and resolved `timeZoneId` calls `formatCivilTime()`.

### 5.2 SSR and hydration

Civil time must be client-derived. The server-rendered markup should use a stable placeholder or omit the civil line until mounted.

Do not render a server-derived abbreviation and then suppress a hydration mismatch. Browser and server ICU/time-zone database versions may differ; the UI should intentionally wait for the browser result.

## 6. User interface

Modify:

```text
app/src/components/moon-app.tsx
```

Keep the current editable field and UTC line:

```text
Mean solar time
17:49
At this longitude. Not a time zone or a watch.
Same moment: 18:10 UTC, 3 Oct · 21 min ahead of this clock.
```

Add one compact read-only line immediately after the UTC line:

```text
Civil time: 19:10 BST, 3 Oct · UTC+01:00.
```

Compose the visible line as:

```text
Civil time: {clock}{optional zoneName}, {day month}{optional civil year} · {UTC offset}.
```

The component appends the civil year only when `value.year !== localParts(instant, lon).y`. It omits `zoneName` when the formatter returns `null`.

Examples:

```text
Civil time: 18:10 GMT, 3 Dec · UTC+00:00.
Civil time: 14:10 EDT, 3 Oct · UTC-04:00.
Civil time: 23:55 GMT+5:45, 3 Oct · UTC+05:45.
Civil time: 13:10, 3 Oct · UTC-05:00.   # fixed-offset ocean zone
```

Loading state:

```text
Civil time: calculating…
```

This text is used only for the first client-side module load, before any civil-time result exists. Later coordinate changes retain the previous civil-time line until the matching replacement is ready.

Unavailable state:

```text
Civil time: unavailable for these coordinates.
```

Requirements:

- use the existing `text-xs text-muted` visual treatment;
- allow natural line wrapping in the current compact control panel;
- do not add another input;
- do not add a time-zone selector;
- do not move or widen the existing mean-solar control unless visual testing proves wrapping makes it unreadable;
- use a `title` such as `IANA zone: Europe/London` so the resolved identifier can be inspected without presenting it as a place name; the same prefix applies to ocean identifiers such as `Etc/GMT+5`;
- preserve keyboard and screen-reader behavior;
- prefix the line with the explicit text `Civil time:` rather than relying on color or position alone.

Update Place Search helper text from:

```text
Sets latitude/longitude only.
```

To wording that remains accurate while explaining the derived display, for example:

```text
Sets latitude/longitude; civil time is derived from the selected position.
```

## 7. Explain/caveats copy

Add a short note to the existing caveats section:

```text
Civil time is derived from an approximate coordinate-to-IANA-zone lookup and the browser's time-zone rules. Verify the named zone when legal, travel, scheduling, or operational precision matters, especially near time-zone borders.
```

Retain the existing statement that mean solar time is the editable clock and UTC is a reference. Extend it to state that civil time is also read-only.

Do not describe civil time as astronomical solar time. Do not imply that the displayed abbreviation is globally unique.

## 8. URL, persistence, and interaction behavior

The following behavior is mandatory:

- No `tz`, zone, offset, or civil-time parameter is added to the URL.
- Shared URLs continue to restore the same latitude, longitude and mean-solar instant.
- The zone is recalculated from restored coordinates.
- Manual latitude/longitude slider changes start a replacement lookup while retaining the previous civil line. Only the result matching the latest coordinates may replace it.
- Place Search continues to return only latitude and longitude; it does not need a different geocoding API.
- Current Time continues to select `Date.now()` and then displays that instant as solar, UTC and civil time.
- Spin Earth updates all three displayed clocks from the moving `instant`.
- Slide the Moon advances `orbit` continuously and advances `instant` in whole-day steps. Mean-solar and UTC times of day remain fixed while their dates advance. Civil date advances too; civil time of day changes by the offset difference if a whole-day step crosses a daylight-saving transition.
- Editing solar date/time recalculates `instant`; UTC and civil time update from the new instant.

## 9. Files

### Create

```text
app/src/lib/civil-time.ts
app/src/lib/civil-time.test.ts
app/src/lib/use-civil-time.ts
app/src/lib/use-civil-time.test.ts
```

If testing the React hook would require adding a new DOM test framework, keep asynchronous stale-result logic in a pure controller/helper inside `civil-time.ts` and test that instead. Do not add a large test dependency solely for this hook.

### Modify

```text
app/package.json
app/package-lock.json
app/src/components/moon-app.tsx
app/src/components/place-search.tsx
app/src/lib/astro.test.ts          # only if existing UTC-line coverage needs adjustment
app/package.json                   # add civil-time tests to npm test
```

Do not place civil-time formatting in `astro.ts`. Civil-zone lookup and legal clock formatting are not astronomy calculations and should remain isolated from the ephemeris module.

## 10. Test-first implementation sequence

### Task 1: Define civil formatting

1. Add `civil-time.test.ts` with fixed-instant tests that fail because `formatCivilTime()` does not exist.
2. Run the focused test and confirm RED.
3. Implement the formatter and offset normalization.
4. Run the focused test and confirm GREEN.
5. Commit the formatter and tests.

Required cases:

- `Europe/London` in January: UTC+00:00;
- `Europe/London` in July: UTC+01:00;
- `America/New_York` in January and July;
- `Australia/Sydney` in January and July;
- `America/Phoenix` with no DST change;
- `Asia/Kathmandu`: UTC+05:45;
- `Australia/Lord_Howe`: standard and daylight offsets including the 30-minute seasonal difference;
- a civil calendar date different from UTC;
- a civil year different from the mean-solar year, verifying that the formatter returns its year and the component decides whether to show it;
- `Etc/GMT+5`, verifying that `Intl` supplies `UTC-05:00`, `zoneName` is `null`, and the raw identifier is not used as a visible place label;
- invalid instant;
- unsupported zone identifier.

### Task 2: Add coordinate lookup

1. Install `@photostructure/tz-lookup@^11.7.0` and update the lockfile.
2. Add failing coordinate-lookup tests.
3. Implement the cached dynamic import and validated wrapper.
4. Verify no network call is present.
5. Commit dependency, wrapper and tests.

Required coordinates:

- `51.5, -0.1` (well inside the UK zone) → `Europe/London`;
- `40.75, -73.98` → `America/New_York`;
- `-33.9, 151.2` → `Australia/Sydney`;
- `27.7, 85.3` → `Asia/Kathmandu`;
- a documented open-ocean coordinate → an `Etc/GMT±n` identifier, followed by a formatting assertion that the identifier is not presented as a place name;
- invalid latitude/longitude → `null`.

Only exact identifiers documented by the installed lookup version should be asserted. Avoid border coordinates.

### Task 3: Add client state integration

1. Add failing tests for stale-result suppression and instant-only reformatting through a pure helper/controller.
2. Implement `useCivilTime()`.
3. Confirm no civil line is server-formatted.
4. Run focused tests and typecheck.
5. Commit hook and tests.

### Task 4: Add the UI

1. Add the hook to `MoonApp`.
2. Render first-load, retained-while-refreshing, ready and unavailable states beneath the existing UTC line.
3. Add the resolved identifier as a diagnostic title prefixed with `IANA zone:`; do not present the identifier as a visible place name.
4. Update Place Search helper text and Explain/caveat wording.
5. Run typecheck and targeted ESLint.
6. Commit UI integration.

### Task 5: Verify interaction and build behavior

Run:

```bash
cd C:/hermes/moongeometry/app
node --experimental-strip-types --test src/lib/civil-time.test.ts
node --experimental-strip-types --test src/lib/use-civil-time.test.ts
npm test
npm run typecheck
npm run build
npx eslint src/lib/civil-time.ts src/lib/civil-time.test.ts src/lib/use-civil-time.ts src/lib/use-civil-time.test.ts src/components/moon-app.tsx src/components/place-search.tsx
git -C C:/hermes/moongeometry diff --check
git -C C:/hermes/moongeometry status --short --branch
```

If no separate hook test file is created, omit that file from the commands rather than creating an empty test.

## 11. Manual acceptance checks

Use a fresh browser context at both `1280×800` and `1440×900`.

### London

Check one winter date and one summer date:

- winter displays GMT and UTC+00:00;
- summer displays BST or an allowed GMT-style fallback and UTC+01:00;
- mean solar remains editable;
- UTC and civil lines remain read-only.

### Non-hour offsets

- Kathmandu displays UTC+05:45.
- Kolkata displays UTC+05:30.
- Lord Howe Island displays the correct seasonal half-hour DST behavior.

### DST and hemispheres

- New York changes between standard and daylight offsets on appropriate dates.
- Sydney's seasonal behavior is opposite the northern hemisphere.
- Phoenix remains unchanged between winter and summer.

### Date boundaries

Use a location near the International Date Line and confirm the civil day can differ from UTC and mean solar without changing the represented instant.

### Interactions

- Current Time updates solar, UTC and civil displays together.
- Spin Earth advances all three time representations.
- Slide the Moon keeps mean-solar and UTC time of day fixed while their dates advance in whole-day steps. Civil date advances; crossing a daylight-saving boundary changes civil time of day by the offset change.
- Changing latitude or longitude retains the previous civil line until the matching replacement is ready.
- Dragging sliders rapidly never flashes a completed result from an earlier location.
- Only the first lookup displays `Civil time: calculating…`; subsequent local lookups do not flash the loading text.
- Shared URL reload restores the same instant and recalculates the civil zone.
- Place search behavior and OpenStreetMap attribution remain unchanged.
- No runtime request is made for time-zone lookup data.
- No hydration warning, page error, or unhandled import failure appears.

## 12. Acceptance criteria

The change is complete only when all of the following are true:

- Mean solar date/time remains the only editable clock.
- UTC remains visible and unchanged in meaning.
- Civil time appears as a third, clearly labelled read-only representation.
- Civil time is derived from latitude, longitude, the exact instant, and an IANA identifier.
- The formatter always returns the civil year; `MoonApp` alone decides whether it differs enough from the mean-solar year to display it.
- BST/GMT and other daylight-saving changes follow the represented date automatically.
- Numeric offsets support whole-hour, half-hour and quarter-hour zones.
- No API key, paid service or runtime time-zone network request is introduced.
- URL and local-storage formats remain unchanged.
- Slide the Moon advances displayed dates in whole-day steps while preserving mean-solar and UTC time of day; civil time of day changes only when the applicable UTC offset changes.
- The package's approximate-border limitation is disclosed.
- Focused tests, full tests, typecheck, production build, targeted ESLint and `git diff --check` pass.
- Desktop visual checks show no regression to the compact one-page layout.

## 13. Known limitations

- Coordinate-to-zone boundaries are compressed and approximate. The lookup package's own benchmark is about 90% exact-zone agreement for random inhabited points and about 95% agreement on current offsets; inspect the resolved zone when precision matters.
- `Intl.DateTimeFormat` uses the browser's installed ICU/IANA data. A browser with stale time-zone data may temporarily lag a very recent government rule change.
- Zone abbreviations are locale/runtime presentation and may fall back to `GMT+1` instead of `BST`.
- Present-day coordinate boundaries are used to select a zone. This is not a historical reconstruction of territorial time-zone borders.
- Civil time is informational and should not be presented as suitable for legal, transport, safety-critical or navigational use.

## 14. Sources

- IANA Time Zone Database: `https://www.iana.org/time-zones/tz-link`
- Maintained lookup package: `https://www.npmjs.com/package/@photostructure/tz-lookup`
- Lookup source repository: `https://github.com/photostructure/tz-lookup`
- `Intl.DateTimeFormat` options: `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat`
