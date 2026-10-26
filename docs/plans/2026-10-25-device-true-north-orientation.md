# Device True-North Orientation — Human UI-First Implementation Plan

> **For Hermes:** Use the `subagent-driven-development` skill to implement this plan task-by-task. Complete the Human UI mockup and real-device feasibility gate before changing production UI.

**Status:** Proposed; discussion complete enough for design and feasibility work, but not yet approved for production implementation
**Date:** October 25, 2026
**Goal:** Add an optional device-orientation mode that rotates the existing Local Sky Path beneath a fixed sighting marker, helping a person physically turn toward the Moon's calculated true azimuth without adding permanent app clutter.

**Architecture:** Keep astronomy unchanged. Add a small browser-capability layer that obtains the device's current location and a usable heading only after a user gesture, a locally evaluated WMM2025 declination wrapper that converts a known magnetic heading to true heading, and a pure orientation view model that rotates the sky projection. Integrate the feature as one compact `Orient` action in the existing Local Sky Path header; all progress, permission, unsupported-device, and active guidance appears temporarily inside that existing section rather than in a new card or permanent settings panel.

**Tech stack:** React 19, TypeScript, existing SVG `SkyChart`, Geolocation API, Device Orientation APIs where validated, pinned `magvar@2.2.0` using WMM2025, Node test runner, React test renderer, Playwright/manual real-device verification.

---

## 1. Human UI rule

This feature is governed by **Human UI first**:

> The person should understand what to do from the diagram and one short instruction, without needing to understand sensors, magnetic declination, browser APIs, or coordinate systems.

Every design and implementation decision must pass these rules:

1. **One obvious entry point.** Add one compact `Orient` button to the existing Local Sky Path header. Do not add a new global toolbar, card, settings group, or permanent compass panel.
2. **The diagram does the explaining.** The sky chart rotates beneath a fixed sighting marker. Do not make the user compare two independently moving needles or interpret raw sensor values.
3. **One instruction at a time.** Show only the next useful instruction, such as `Hold phone flat`, `Turn 24° right`, or `Aligned with Moon azimuth`.
4. **No automatic permission prompts.** Location and motion/orientation permission requests occur only after the person presses `Orient`.
5. **No technical language in the normal flow.** Do not show `WMM2025`, `declination`, `magnetometer`, or event names while the feature is operating normally. Technical provenance belongs in the Explain panel or an accessible title/details disclosure.
6. **No persistent failure clutter.** An unsupported-device or denied-permission message is concise, dismissible, and contained in the Local Sky Path section.
7. **Do not disturb ordinary use.** Before activation and after exit, the Local Sky Path must look and behave as it does now, apart from the single compact action.
8. **Never imply more accuracy than the device provides.** Prefer `Direction may be inaccurate` over a false precision claim.
9. **No silent state changes.** Do not silently replace an intentionally selected distant location or historical time.
10. **Remove before adding.** If the header becomes crowded at a target viewport, simplify or regroup its existing actions rather than accepting wrap, overlap, or another row by default.

### Human UI acceptance question

At every review, ask:

> Can a first-time user hold the phone, press one button, and understand how to turn toward the Moon without reading documentation?

If the answer is no, revise the interaction before adding more controls or explanations.

---

## 2. Scope

### 2.1 Included

- A compact `Orient` action in the existing Local Sky Path header.
- User-triggered current-location acquisition.
- User-triggered device-heading acquisition where the browser and hardware provide a validated heading source.
- Local WMM2025 magnetic-declination calculation.
- Conversion from a **known magnetic heading** to true heading.
- Rotation of the Local Sky Path beneath a fixed top sighting marker.
- Simple left/right/aligned guidance based on the Moon's azimuth.
- Clear handling of:
  - Windows desktops and laptops without a compass sensor;
  - permission denial;
  - location failure;
  - heading-source failure;
  - unstable or low-confidence readings;
  - selected location differing materially from device location;
  - selected time differing from the present;
  - the Moon being below the horizon.
- Cleanup when orientation mode exits, the tab is hidden, or the component unmounts.
- Accessibility, reduced motion, privacy, and real-device verification.

### 2.2 Not included

- A map, Google Earth, Google Maps, or landmark selection.
- Camera-based augmented reality.
- Star-field or camera overlays.
- Manual compass calibration controls in version 1.
- A permanently visible compass ring outside orientation mode.
- A new editable clock, civil-time control, or URL parameter.
- Background geolocation.
- Server-side storage or transmission of device location or heading.
- Replacing the app's astronomy provider or changing the Moon azimuth calculation.
- Promising identical support across all browsers before the real-device gate passes.

---

## 3. Existing UI and scientific invariants

The current Local Sky Path is rendered by:

- `app/src/components/moon-app.tsx`
- `app/src/components/sky-chart.tsx`

The chart is an azimuthal sky projection:

- north is at the top;
- east is to the right;
- azimuth increases clockwise from true north;
- the horizon is the outer circle;
- the zenith is the centre;
- altitude controls radius;
- Sun and Moon paths and current positions already come from the shared observed ephemeris snapshot.

This feature must not change:

- Moon or Sun altitude/azimuth values;
- rise/set calculations;
- the `instant` / `orbitInstant` two-clock contract;
- mean-solar, UTC, or civil-time semantics;
- URL shape;
- diagram altitude scaling;
- the Share infographic's default north-up rendering;
- existing desktop layout dimensions;
- orbital geometry view behavior.

Orientation is a **display transform and device integration**, not an astronomy-model change.

The Share infographic remains north-up even if live orientation mode is active. A shared/exported image must not capture a transient device heading that is meaningless to another viewer.

---

## 4. Intended interaction

### 4.1 Resting state

The Local Sky Path header retains its current title, phase information, `Share`, and `Explain` actions. Add one compact action:

```text
Orient
```

Use the existing button language, radius, colours, and compact height. A restrained direction/compass icon may be used only if it improves recognition at narrow widths; text remains visible.

No compass ring, status strip, instruction, sensor value, or marker is visible before activation.

### 4.2 Activation sequence

After the person presses `Orient`:

1. Stop `Spin Earth` or `Slide the Moon` so the target does not move unexpectedly during physical alignment.
2. Show a short temporary status in the Local Sky Path section:

   ```text
   Finding your direction…
   ```

3. Request geolocation permission.
4. Request motion/orientation permission when required by the browser.
5. Begin listening for a validated heading source.
6. Evaluate whether the device position is close enough to the selected app position.
7. If location and heading are usable, enter active mode.
8. If any requirement fails, leave the diagram north-up and show one concise recovery message.

Do not open a full-screen modal for normal activation, permission progress, or unsupported-device feedback.

### 4.3 Fixed marker and rotating diagram

In active mode:

- A fixed triangular sighting marker appears slightly above the chart's north/top edge.
- The marker represents the direction of the phone's **top edge**.
- The marker never rotates.
- The sky projection rotates beneath it according to true heading.
- The Moon path, Sun path, current dots, transit tick, and cardinal anchor positions rotate as one world layer.
- `N`, `E`, `S`, and `W` move to their rotated positions but remain upright for legibility.
- `zenith`, altitude labels, status text, and interface controls remain upright.
- The horizon and altitude rings are circular and therefore need no visual rotation.

Do not rotate the entire SVG element as a single bitmap-like object; that would rotate all text and make the diagram harder to read.

### 4.4 Projection rule

For any sky point with true azimuth `A` and current device true heading `H`:

```text
displayAzimuth = normalize360(A - H)
```

The existing projection then uses `displayAzimuth`:

```text
x = cx + r × sin(displayAzimuth)
y = cy - r × cos(displayAzimuth)
```

Therefore:

- the direction currently faced by the phone is always at the fixed top marker;
- a Moon at the same azimuth as the device heading appears beneath the marker;
- changing heading rotates the diagram without changing astronomical values.

### 4.5 Human guidance

Calculate the shortest signed turn from the current true heading to the Moon's true azimuth:

```text
turnDeg = wrap180(moonAzimuthDeg - trueHeadingDeg)
```

Visible guidance:

| Condition | Message |
|---|---|
| Device needs a flatter posture | `Hold phone flat` |
| `turnDeg > 5°` | `Turn 24° right` |
| `turnDeg < -5°` | `Turn 18° left` |
| within alignment threshold | `Aligned with Moon azimuth` |
| Moon below horizon | `Moon is below the horizon in this direction` |
| selected time is not current | `Showing the selected time` with a compact `Use current time` action |
| heading unstable | `Direction may be inaccurate — move away from metal` |

Use whole degrees in instructions. Do not display rapidly changing decimal headings in the main UI.

Use hysteresis to prevent the aligned state flickering:

- enter aligned at `|turnDeg| <= 3°`;
- remain aligned until `|turnDeg| > 6°`.

### 4.6 Exit

The active `Orient` action becomes a compact `Done` or active-state toggle. On exit:

- remove orientation and geolocation listeners;
- remove the fixed marker and temporary status;
- restore the chart to north-up;
- retain the selected astronomical location and time;
- do not resume a previously running animation automatically.

---

## 5. Current location and selected location

### 5.1 Browser location

Use `navigator.geolocation.getCurrentPosition()` only after the explicit button press.

Initial options:

```ts
{
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
}
```

Treat these as implementation defaults subject to real-device testing rather than user-facing settings.

### 5.2 Privacy

- Do not request location before the user presses `Orient`.
- Do not transmit location to a map provider or MoonGeometry server.
- Do not store heading samples.
- Keep the raw geolocation result only long enough to make the matching and declination calculations.
- If the user chooses to switch the app to the device position, round coordinates to `0.001°` before placing them in normal app state; discard the raw coordinates afterward.
- Explain permission use concisely if requested: `Your location is used on this device to calculate true north and the Moon's local direction.`

### 5.3 Location match

Compute great-circle distance between the device position and selected app position with a pure helper.

Consider the location sufficiently close when:

```text
distance <= max(5 km, 2 × reported geolocation accuracy)
```

The exact threshold must be verified against real position accuracy and may be adjusted before implementation approval.

If sufficiently close:

- keep the user's selected coordinates unchanged;
- use the device coordinates for magnetic-declination correction;
- use the selected coordinates for the already-calculated Moon path.

If materially different, show an inline choice:

```text
The diagram is set to a different location.
[Use my current location] [Cancel]
```

Do not attempt physical orientation for a distant selected location. Accepting `Use my current location` must:

- stop animation;
- set latitude and longitude to rounded device coordinates;
- clear a stale selected-place label;
- let existing URL and location-memory behavior update normally;
- recompute the observed Moon path before heading alignment is presented as ready.

### 5.4 Selected time

Do not silently replace the selected time.

If the represented `instant` differs from `Date.now()` by more than ten minutes, orientation may still rotate the chart, but the temporary status must say:

```text
Showing the selected time
```

Provide one compact action:

```text
Use current time
```

That action uses the existing `setInstant(Date.now())`, which also restores `orbit` to the same current instant and stops animation.

---

## 6. Heading sources and correctness boundary

### 6.1 Capability, not operating-system detection

Do not implement rules such as:

```text
Windows = unsupported
Android/iPhone = supported
```

Instead, attempt to acquire an actual usable heading after the user gesture.

This allows:

- a Windows tablet with sensors to work if its browser exposes a valid heading;
- a Windows desktop without a compass to fail gracefully;
- a phone whose browser blocks orientation access to report that limitation honestly.

### 6.2 Heading-source contract

Create an internal source contract:

```ts
type HeadingReference = "magnetic" | "true" | "unknown";

type DeviceHeadingSample = {
  headingDeg: number;
  reference: HeadingReference;
  accuracyDeg: number | null;
  tiltDeg: number | null;
  timestampMs: number;
};
```

The browser adapter must not label a source `magnetic` or `true` unless that meaning has been validated for the API/platform path.

- Apply WMM declination only to a `magnetic` sample.
- Use a `true` sample directly.
- Do not enter a confidently labelled true-north mode from an `unknown` sample.

This prevents double-correcting an already true-referenced heading or falsely correcting an ambiguous orientation angle.

### 6.3 Supported posture for version 1

Version 1 is a flat-phone sighting tool:

```text
Hold the phone roughly flat, screen upward, with its top edge pointing forward.
```

The hook may read `beta`/`gamma` or equivalent tilt data to determine whether the phone is sufficiently flat. When outside the supported posture, freeze or de-emphasize turn guidance and show `Hold phone flat`.

Do not attempt camera-like upright augmented-reality pointing in this version.

### 6.4 Screen orientation

Compensate for portrait and landscape screen orientation. The top edge used by the sighting marker must remain the physical top edge of the displayed page after a screen rotation.

On `screen.orientation.change` or the supported fallback event:

- recompute screen-angle compensation;
- do not reset astronomy state;
- do not request permissions again;
- retain active mode if the source remains valid.

### 6.5 Smoothing

Raw headings wrap at `0°/360°`; ordinary arithmetic averaging is invalid there.

Implement circular smoothing in a pure helper using unit vectors or a circular exponential moving average. Smoothing must:

- handle `359° → 1°` without jumping through `180°`;
- reduce visible jitter;
- remain responsive enough that the diagram does not lag conspicuously behind the phone;
- reset after a long sample gap or source restart.

Tune the smoothing constant through real-device testing. Do not expose it as a user setting.

### 6.6 Feasibility gate

Before production integration, validate actual heading semantics on at least:

- iPhone Safari;
- Android Chrome;
- a Windows laptop/desktop without a compass;
- a sensor-equipped tablet or convertible if one is available.

Record for each:

- secure-context requirement;
- permission flow;
- event/API used;
- whether a heading arrives;
- whether its reference is known to be magnetic or true;
- portrait/landscape behavior;
- stationary stability;
- cleanup after exit;
- behavior when permissions are denied.

If a target browser cannot provide a heading with a defensible reference, do not guess. Mark that path unsupported or approximate, and revise visible wording before proceeding.

---

## 7. Magnetic north to true north

### 7.1 Model

Pin:

```text
magvar@2.2.0
```

The package uses WMM2025 and is small enough for client-side evaluation. Add it as an exact dependency rather than a floating range because geomagnetic coefficients and sign conventions are part of the feature's scientific contract.

Create a narrow wrapper so app code does not import the package directly:

```text
app/src/lib/geomagnetic-declination.ts
```

The wrapper accepts:

```ts
type DeclinationInput = {
  latDeg: number;
  lonDeg: number;
  altitudeMetres: number | null;
  measuredAt: Date;
};
```

It returns:

```ts
type DeclinationResult = {
  declinationDeg: number;
  model: "WMM2025";
  valid: boolean;
};
```

### 7.2 Date choice

Use the **real measurement date**, not the app's selected astronomical date.

The phone is measuring the physical magnetic field now. Therefore WMM correction must use the date of the heading sample or current device time, even if the chart is displaying a historical or future Moon position.

### 7.3 Altitude

If geolocation altitude is finite, convert metres to kilometres for the package. Otherwise use sea level (`0 km`). Surface-level altitude differences are not important enough to block the feature.

### 7.4 Conversion

With east-positive declination:

```text
trueHeadingDeg = normalize360(magneticHeadingDeg + declinationDeg)
```

Keep the sign convention in one tested helper. Do not duplicate this formula in the component or hook.

### 7.5 Validation

Tests must compare the wrapper against official NOAA WMM2025 published test values, including:

- northern and southern latitudes;
- eastern and western longitudes;
- values near the `0°/360°` heading wrap;
- more than one decimal year inside the WMM2025 validity period.

Also test the package's model-validity boundary. If orientation is used after WMM2025's validity period, do not silently continue with a confidence claim. The UI should state that true-north correction is unavailable until the model is updated.

### 7.6 Model metadata

Technical details belong in the Explain panel's limits/scientific material, not beside the live chart. Add a concise statement such as:

```text
When the device supplies magnetic heading, MoonGeometry converts it to true heading locally using the World Magnetic Model. Phone compasses can still be disturbed by nearby metal and electronics.
```

Do not add a permanent WMM badge or model-version label to the Local Sky Path.

---

## 8. State model

Create a reducer-backed controller rather than scattering permission and sensor booleans through `MoonApp`.

Suggested public state:

```ts
type OrientationState =
  | { status: "idle" }
  | { status: "requesting-location" }
  | { status: "requesting-orientation" }
  | { status: "location-mismatch"; deviceLocation: RoundedLocation }
  | { status: "acquiring-heading" }
  | {
      status: "active";
      trueHeadingDeg: number;
      turnDeg: number;
      quality: "good" | "limited";
      needsFlatPosture: boolean;
    }
  | {
      status: "unavailable";
      reason:
        | "insecure-context"
        | "location-denied"
        | "location-unavailable"
        | "orientation-denied"
        | "no-heading-source"
        | "unknown-heading-reference"
        | "model-expired";
    };
```

Reducer requirements:

- ignore late geolocation or permission results after cancellation;
- ignore stale heading-source callbacks after restart;
- support React Strict Mode effect replay;
- preserve no listeners after `stop()` or unmount;
- avoid entering active state until location, heading reference, model validity, and posture rules are satisfied;
- separate machine reasons from short user-facing copy.

Do not add orientation state to Zustand, the URL, local storage, or share state. It is session-local and component-local.

---

## 9. Unsupported and failure behavior

### 9.1 Windows desktop/laptop without heading sensor

Expected message:

```text
Automatic orientation isn't available on this device.
Your location may be available, but no compass direction was reported.
```

Actions:

```text
[Close]
```

Do not add a permanent manual-heading interface in version 1. The existing azimuth value remains available.

### 9.2 Permission denied

Use specific messages:

- `Location permission is needed to orient the local sky.`
- `Motion and orientation permission is needed to read the device direction.`

Do not repeatedly re-trigger the browser prompt. Offer `Try again` only when retrying can produce a new browser prompt or after the user has changed browser permissions.

### 9.3 Insecure context

If not in a secure context, do not request sensors. Show:

```text
Device orientation requires a secure connection.
```

Localhost remains acceptable for development where browser rules permit it.

### 9.4 Unstable heading

If heading samples fluctuate beyond the verified quality threshold while the phone is stationary, show:

```text
Direction may be inaccurate — move away from metal or electronics.
```

Keep the diagram usable but avoid the strong `Aligned` state while quality is limited.

### 9.5 Hidden tab and interruption

When `document.visibilityState !== "visible"`:

- pause or remove orientation listeners;
- do not update heading in the background;
- reacquire on return only if the previous permission/source path remains valid;
- return to `acquiring-heading` until a fresh sample arrives.

---

## 10. Accessibility and reduced motion

- `Orient` is a native button with clear focus styling.
- Active state uses `aria-pressed="true"` or an equivalent explicit label.
- Status changes use a restrained `aria-live="polite"` region.
- Do not announce every heading sample or every degree change.
- Announce only meaningful state transitions: acquiring, permission failure, turn direction changing materially, aligned, below horizon, and exit.
- The fixed marker is not the sole cue; text states the turn direction.
- Do not use colour alone for alignment.
- Respect `prefers-reduced-motion` by updating diagram orientation without decorative transitions. Sensor-driven movement itself remains necessary feedback, but CSS easing must not create lag or sweeping animation.
- Touch targets remain at least approximately `40 × 40` CSS pixels without making desktop controls visually oversized.
- Ensure instructions remain readable at 200% browser zoom.

---

## 11. Files

### New production files

- Create: `app/src/lib/true-north-orientation.ts`
  - normalization, shortest-turn calculation, alignment hysteresis, circular smoothing, location-distance/match helpers, reducer and public types.
- Create: `app/src/lib/true-north-orientation.test.ts`
- Create: `app/src/lib/geomagnetic-declination.ts`
- Create: `app/src/lib/geomagnetic-declination.test.ts`
- Create: `app/src/lib/use-true-north-orientation.ts`
  - browser APIs, permissions, listeners, cancellation, source adapters.
- Create: `app/src/lib/use-true-north-orientation.test.ts`
- Create: `app/src/components/orientation-control.tsx`
  - compact button, temporary status/guidance, mismatch confirmation.
- Create: `app/src/types/magvar.d.ts` only if the pinned package still ships without TypeScript declarations.

### Existing production files

- Modify: `app/src/components/sky-chart.tsx`
  - accept optional true-heading display rotation;
  - project paths and markers with display azimuth;
  - add fixed marker only while active;
  - keep labels upright;
  - preserve north-up share export.
- Modify: `app/src/components/moon-app.tsx`
  - own the hook;
  - stop animation on activation;
  - integrate the compact control;
  - handle location/time choices;
  - pass display heading to `SkyChart`.
- Modify: `app/src/styles.css` only if existing utilities cannot express the marker/focus/status treatment cleanly.
- Modify: `app/src/lib/share-infographic.ts` only if tests prove the existing SVG clone accidentally captures active orientation state; preferred behavior is to pass/clone a north-up chart without orientation markup.
- Modify: `app/package.json`
  - pin `magvar@2.2.0`;
  - add all new `*.test.ts` files to the explicit `npm test` list.
- Modify: `app/package-lock.json`.
- Modify: `UI_UX_SPEC.md`
  - record the Human UI orientation rule and temporary active-state behavior.
- Modify: `PRODUCT_SPEC.md`
  - record optional physical orientation as a progressive-enhancement observation aid.

### Disposable design and verification files

- Created: `sketches/004-orientation-precision-bezel/index.html`
  - complete fixed 360° bezel around the rotating sky.
- Created: `sketches/005-orientation-quiet-arc/index.html`
  - restrained fixed forward arc around the rotating sky.
- Created: `sketches/006-orientation-focus-instrument/index.html`
  - larger active instrument that becomes a focused mobile view.
- Each variant currently demonstrates the active, rotating, aligned, and inactive interaction. Add acquiring, hold-flat, location-mismatch, denied, and unsupported states to the selected direction before production implementation.
- Create during implementation verification: `docs/verification/2026-10-25-device-orientation-matrix.md`
  - tested devices/browsers, permission paths, heading semantics, screenshots, failures, and known limits.

---

## 12. Implementation tasks

### Task 1: Produce and approve the Human UI interaction mockup

**Objective:** Compare the three completed rotating-instrument sketches, select one direction, and then prove its complete state sequence can be understood without adding app clutter before production code changes.

**Files:**

- Review/refine: `sketches/004-orientation-precision-bezel/index.html`
- Review/refine: `sketches/005-orientation-quiet-arc/index.html`
- Review/refine: `sketches/006-orientation-focus-instrument/index.html`

**Steps:**

1. Reproduce only the existing Local Sky Path section closely enough to judge hierarchy and fit.
2. Add a state switcher inside the disposable sketch for:
   - resting;
   - finding direction;
   - hold phone flat;
   - turn right;
   - aligned;
   - location mismatch;
   - unsupported desktop.
3. Show the fixed marker and rotated chart behavior.
4. Inspect at:
   - `390 × 844` mobile portrait;
   - `844 × 390` mobile landscape;
   - `1280 × 800` desktop;
   - `1440 × 900` desktop.
5. Reject any version that:
   - adds a permanent status panel;
   - creates a second compass diagram;
   - pushes the chart or statistics substantially downward;
   - makes `Share`, `Explain`, and `Orient` wrap awkwardly;
   - relies on technical explanation for basic operation.
6. Obtain user approval of the interaction direction before Task 2.

**Verification:** The resting state differs from the current Local Sky Path only by one compact action; active state can be understood from the fixed marker and one instruction.

**Commit:**

```bash
git add sketches/004-orientation-precision-bezel sketches/005-orientation-quiet-arc sketches/006-orientation-focus-instrument sketches/index.html
git commit -m "design: prototype human-first device orientation"
```

### Task 2: Complete the real-device heading feasibility gate

**Objective:** Establish which browser paths provide a defensible magnetic or true heading before production architecture depends on them.

**Files:**

- Create: `docs/verification/2026-10-25-device-orientation-matrix.md`
- Optionally create a temporary probe under the scratch directory; do not add a probe to the production bundle.

**Steps:**

1. Serve a minimal HTTPS-capable probe or use the deployed test environment.
2. Record the exact API/event and permission path on each target device.
3. Compare reported north/east/south/west behavior against a trusted compass reference in an open area.
4. Test portrait and landscape.
5. Test denied permission and missing sensor.
6. Verify whether each heading is magnetic, true, or not defensibly classifiable.
7. Record a go/no-go result per browser.
8. If no supported path supplies a defensible reference on a major target, revise scope or wording rather than guessing.

**Verification:** The matrix contains reproducible observations and identifies the supported source adapter for each shipping target.

**Commit:**

```bash
git add docs/verification/2026-10-25-device-orientation-matrix.md
git commit -m "docs: verify device heading support"
```

### Task 3: Add pure orientation mathematics test-first

**Objective:** Implement all heading and display calculations independently of browser APIs and React.

**Files:**

- Create: `app/src/lib/true-north-orientation.ts`
- Create: `app/src/lib/true-north-orientation.test.ts`
- Modify: `app/package.json`

**Test cases:**

- `normalize360(-1) === 359`.
- Magnetic plus east-positive declination produces correct true heading.
- Magnetic plus west-negative declination produces correct true heading.
- Moon at device heading projects to chart top.
- Shortest turn chooses left/right correctly across north wrap.
- Circular smoothing treats `359°` and `1°` as neighbours.
- Alignment hysteresis enters at `3°` and exits after `6°`.
- Location matching handles geolocation accuracy and the 5 km floor.
- Invalid or non-finite inputs do not produce active-state values.

**Commands:**

```bash
node --experimental-strip-types --test src/lib/true-north-orientation.test.ts
npm test
```

**Expected:** Focused tests pass; normal suite includes the new file.

**Commit:**

```bash
git add app/src/lib/true-north-orientation.ts app/src/lib/true-north-orientation.test.ts app/package.json
git commit -m "test: define true north orientation math"
```

### Task 4: Add and validate WMM2025 declination

**Objective:** Calculate magnetic declination locally behind a narrow, tested app-owned interface.

**Files:**

- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Create: `app/src/lib/geomagnetic-declination.ts`
- Create: `app/src/lib/geomagnetic-declination.test.ts`
- Create if required: `app/src/types/magvar.d.ts`

**Steps:**

1. Install the exact dependency:

   ```bash
   npm install --save-exact magvar@2.2.0
   ```

2. Write failing tests from official NOAA WMM2025 test values.
3. Add the narrow wrapper and unit conversion.
4. Test valid-period and expired-model behavior.
5. Confirm the production bundle contains no runtime network call.
6. Add the test file to `npm test`.

**Commands:**

```bash
node --experimental-strip-types --test src/lib/geomagnetic-declination.test.ts
npm run typecheck
npm test
```

**Expected:** NOAA fixtures pass within their published precision; typecheck passes.

**Commit:**

```bash
git add app/package.json app/package-lock.json app/src/lib/geomagnetic-declination.ts app/src/lib/geomagnetic-declination.test.ts app/src/types/magvar.d.ts
git commit -m "feat: add validated WMM2025 declination"
```

### Task 5: Build the browser orientation controller test-first

**Objective:** Isolate permissions, geolocation, heading events, lifecycle, and cancellation from presentation.

**Files:**

- Create: `app/src/lib/use-true-north-orientation.ts`
- Create: `app/src/lib/use-true-north-orientation.test.ts`
- Modify: `app/package.json`

**Test cases:**

- No API access occurs before explicit `start()`.
- Location denial reaches the specific unavailable reason.
- Orientation denial reaches the specific unavailable reason.
- Location success followed by no heading times out cleanly.
- A Windows-like environment with geolocation but no heading reports `no-heading-source`.
- Stale callbacks after stop/restart are ignored.
- Unmount and Strict Mode replay leave no listeners.
- Screen-orientation changes recalculate compensation without a new permission prompt.
- Hidden-tab behavior pauses and reacquires.
- Magnetic samples invoke WMM correction once per location/date need, not once per animation frame.
- True samples bypass WMM correction.
- Unknown-reference samples never claim true heading.

**Commands:**

```bash
node --experimental-strip-types --test src/lib/use-true-north-orientation.test.ts
npm test
npm run typecheck
```

**Expected:** Hook/controller lifecycle tests pass with controlled fake APIs and no leaked listeners.

**Commit:**

```bash
git add app/src/lib/use-true-north-orientation.ts app/src/lib/use-true-north-orientation.test.ts app/package.json
git commit -m "feat: add device orientation controller"
```

### Task 6: Make SkyChart orientation-aware without changing astronomy

**Objective:** Rotate the projected sky beneath a fixed marker while keeping labels legible and north-up behavior unchanged by default.

**Files:**

- Modify: `app/src/components/sky-chart.tsx`
- Extend tests in: `app/src/lib/true-north-orientation.test.ts`
- Add a component/render test only if pure projection tests cannot prove the DOM contract.

**Steps:**

1. Add optional props for display heading and active orientation state.
2. Route every azimuth-bearing object through the same display-azimuth helper.
3. Reposition cardinals from true azimuths while keeping glyphs upright.
4. Add the fixed marker only in active mode.
5. Keep ring labels, horizon label, and zenith label upright.
6. Preserve `data-share-sky-chart` north-up export behavior.
7. Verify the Moon dot remains on its rotated path.

**Acceptance cases:**

- Heading `0°`: chart matches current rendering.
- Heading `90°`: east is at the fixed top marker and north appears at screen left.
- Heading `180°`: south is at the fixed top marker.
- Heading `270°`: west is at the fixed top marker.
- A Moon whose azimuth equals heading sits directly beneath the marker at the correct altitude radius.

**Commands:**

```bash
node --experimental-strip-types --test src/lib/true-north-orientation.test.ts
npm run typecheck
npx eslint src/components/sky-chart.tsx src/lib/true-north-orientation.ts src/lib/true-north-orientation.test.ts
```

**Commit:**

```bash
git add app/src/components/sky-chart.tsx app/src/lib/true-north-orientation.test.ts
git commit -m "feat: rotate local sky by true heading"
```

### Task 7: Add the compact Human UI control and integrate MoonApp

**Objective:** Connect the verified controller to the existing Local Sky Path without introducing a new permanent panel.

**Files:**

- Create: `app/src/components/orientation-control.tsx`
- Modify: `app/src/components/moon-app.tsx`
- Modify only if needed: `app/src/styles.css`

**Steps:**

1. Add the compact `Orient` action beside existing Local Sky Path actions.
2. Stop current animation when orientation starts.
3. Render temporary status/guidance inside the existing section.
4. Implement the location-mismatch inline choice.
5. Add the selected-time warning and `Use current time` action.
6. Pass active true heading to `SkyChart`.
7. Exit cleanly with `Done`.
8. Keep all technical detail out of the normal active state.
9. Verify no layout jump in the resting state.

**Commands:**

```bash
npm run typecheck
npm test
npx eslint src/components/orientation-control.tsx src/components/moon-app.tsx src/components/sky-chart.tsx src/lib/use-true-north-orientation.ts
```

**Commit:**

```bash
git add app/src/components/orientation-control.tsx app/src/components/moon-app.tsx app/src/components/sky-chart.tsx app/src/styles.css
git commit -m "feat: add human-first sky orientation control"
```

### Task 8: Protect Share output and document the model limits

**Objective:** Ensure transient device state does not leak into shared artifacts and explain limitations through progressive disclosure.

**Files:**

- Modify if required: `app/src/lib/share-infographic.ts`
- Modify/add tests: `app/src/lib/share-infographic.test.ts`
- Modify: `app/src/components/moon-app.tsx`
- Modify: `PRODUCT_SPEC.md`
- Modify: `UI_UX_SPEC.md`

**Steps:**

1. Generate a Share PNG while orientation mode is active.
2. Require the exported sky chart to remain north-up with no fixed device marker.
3. Add concise magnetic-sensor/WMM limitations to the existing Explain material.
4. Record Human UI and no-clutter rules in the product/UI specifications.
5. Do not add technical copy to the resting Local Sky Path.

**Commands:**

```bash
node --experimental-strip-types --test src/lib/share-infographic.test.ts
npm run typecheck
npm test
```

**Commit:**

```bash
git add app/src/lib/share-infographic.ts app/src/lib/share-infographic.test.ts app/src/components/moon-app.tsx PRODUCT_SPEC.md UI_UX_SPEC.md
git commit -m "docs: define device orientation behavior and limits"
```

### Task 9: Complete automated and visual verification

**Objective:** Prove correctness, Human UI quality, lifecycle cleanup, and unsupported-device behavior.

**Files:**

- Update: `docs/verification/2026-10-25-device-orientation-matrix.md`

**Automated commands:**

```bash
npm run typecheck
node --experimental-strip-types --test src/lib/true-north-orientation.test.ts
node --experimental-strip-types --test src/lib/geomagnetic-declination.test.ts
node --experimental-strip-types --test src/lib/use-true-north-orientation.test.ts
node --experimental-strip-types --test src/lib/astro.test.ts
npm test
npm run build
npx eslint src/components/orientation-control.tsx src/components/sky-chart.tsx src/components/moon-app.tsx src/lib/true-north-orientation.ts src/lib/true-north-orientation.test.ts src/lib/geomagnetic-declination.ts src/lib/geomagnetic-declination.test.ts src/lib/use-true-north-orientation.ts src/lib/use-true-north-orientation.test.ts
git diff --check
git status --short --branch
```

**Expected:** All commands pass; new tests are included in the normal suite; build contains no runtime NOAA/map dependency.

**Browser and device checks:**

- iPhone Safari, supported version from feasibility matrix.
- Android Chrome, supported version from feasibility matrix.
- Windows desktop/laptop without heading sensor.
- Sensor-equipped tablet/convertible if available.
- Permission accepted, denied, and previously denied.
- Portrait and landscape rotation.
- Screen locked/unlocked and tab hidden/restored.
- Nearby metal interference warning behavior.
- Moon above horizon and below horizon.
- Selected location close to and far from device location.
- Selected time current and historical/future.
- Share PNG generated while live orientation is active.

**Viewport checks:**

- `390 × 844`
- `844 × 390`
- `1280 × 800`
- `1440 × 900`
- `1920 × 1080`

At desktop sizes, verify that adding `Orient` does not make the app feel touch-first, add a new row unnecessarily, reduce the chart's visual dominance, or introduce permanent failure text.

At mobile sizes, verify that the fixed marker remains aligned with the physical top of the screen and that the instruction remains visible without covering the Moon path.

**Commit:**

```bash
git add docs/verification/2026-10-25-device-orientation-matrix.md
git commit -m "test: verify device true north orientation"
```

---

## 13. Acceptance criteria

### Human UI

- [ ] The resting Local Sky Path adds only one compact `Orient` action.
- [ ] No new permanent card, map, compass panel, settings section, or technical status block is added.
- [ ] A first-time user can understand the active interaction from the fixed marker and one short instruction.
- [ ] Only one primary instruction is shown at a time.
- [ ] Failure messages are concise, local to the existing section, and dismissible.
- [ ] The desktop layout remains compact at `1280 × 800` and `1440 × 900`.
- [ ] Mobile portrait and landscape remain usable without covering the diagram.

### Scientific correctness

- [ ] Astronomy-provider altitude and azimuth values are unchanged.
- [ ] Display rotation uses `displayAzimuth = normalize360(azimuth - trueHeading)`.
- [ ] A known magnetic heading is converted with east-positive WMM declination using measurement time.
- [ ] A true-referenced heading is not corrected twice.
- [ ] An unknown-reference heading never produces a confidently labelled true-north state.
- [ ] WMM results match official NOAA fixtures within published precision.
- [ ] The model-expiry boundary is handled explicitly.
- [ ] Moon dot and path remain aligned after rotation.

### Device behavior

- [ ] No permission is requested before the user presses `Orient`.
- [ ] Missing compass hardware on a Windows desktop produces a clear non-destructive fallback.
- [ ] Permission denial and missing hardware are distinguished.
- [ ] Portrait/landscape screen orientation is compensated.
- [ ] Heading wrap and jitter do not cause large diagram jumps.
- [ ] Listeners are removed on exit, hidden tab, restart, and unmount.
- [ ] No background location tracking is introduced.

### State and privacy

- [ ] A distant selected location is never silently replaced.
- [ ] Historical/future selected time is never silently replaced.
- [ ] Raw device coordinates and heading samples are not transmitted or persisted.
- [ ] Orientation state is not added to URL, Zustand, local storage, or Share output.
- [ ] Share output remains north-up and contains no transient sighting marker.

### Accessibility

- [ ] Keyboard and screen-reader users can start, understand, and exit the feature.
- [ ] Status uses polite, non-spammy announcements.
- [ ] Colour is not the only alignment indicator.
- [ ] Focus states and touch targets are adequate.
- [ ] Reduced-motion preference does not add smoothing animations that lag behind the device.

---

## 14. Rejection criteria

Do not ship the feature if any of the following remains true:

- The app cannot determine whether the supplied heading is magnetic, true, or unknown on a claimed-supported browser.
- The implementation assumes `alpha` has the same north reference on every browser without evidence.
- The diagram rotates but text becomes sideways or unreadable.
- The normal desktop layout gains a persistent extra row or card.
- The app silently changes a distant selected location or selected time.
- The Windows no-sensor path appears broken rather than intentionally unsupported.
- The app claims `Aligned` while heading quality is known to be poor.
- WMM data is fetched over the network during normal use.
- Share output captures the user's transient phone heading.
- Real-device verification is replaced by desktop event simulation alone.

---

## 15. Source references

Use these as authoritative technical references during implementation:

- W3C Geolocation API: `https://www.w3.org/TR/geolocation/`
- W3C Device Orientation and Motion: `https://www.w3.org/TR/orientation-event/`
- MDN Device orientation events compatibility and permission notes: `https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events`
- Apple `DeviceOrientationEvent.requestPermission()`: `https://developer.apple.com/documentation/webkitjs/deviceorientationevent/3191436-requestpermission`
- NOAA/NCEI magnetic declination: `https://www.ncei.noaa.gov/products/magnetic-declination`
- NOAA/NCEI World Magnetic Model: `https://www.ncei.noaa.gov/products/world-magnetic-model`
- NOAA WMM2025 test values: `https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt`
- Pinned package source: `https://github.com/dpyeates/magvar/tree/v2.2.0`

Record downloaded fixture hashes in the verification document. Do not rely on undocumented blog formulas or unversioned online calculators as the scientific contract.

---

## 16. Implementation order and stop points

The required order is:

1. Human UI mockup.
2. User approval of the interaction.
3. Real-device heading feasibility matrix.
4. Go/no-go decision for supported browsers.
5. Pure mathematics and WMM tests.
6. Browser controller.
7. SVG integration.
8. Compact production UI.
9. Share/docs/accessibility.
10. Full automated and real-device verification.

Stop after Task 1 if the interaction adds visual clutter or is not immediately understandable.

Stop after Task 2 if browser heading semantics cannot support a defensible true-north claim. In that case, revise the feature to an explicitly approximate orientation aid or defer it rather than implementing misleading precision.
