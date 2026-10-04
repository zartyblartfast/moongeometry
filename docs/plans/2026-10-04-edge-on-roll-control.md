# Edge-on Plane-Level Roll Control — Technical Specification

> **For Hermes:** Use the `subagent-driven-development` skill to implement this specification task-by-task with test-first changes and separate specification/code-quality review.

**Status:** Implemented; revised after interaction testing  
**Date:** October 4, 2026  
**Goal:** In the edge-on orbital view, let the user roll the complete displayed model continuously between equator-horizontal and ecliptic-horizontal orientations, while explaining the 23.4° relationship with a restrained angle annotation rather than additional permanent labels.

**Architecture:** Keep the camera position on the common line of the equatorial and ecliptic planes and alter only the camera's roll around its viewing axis. Represent the roll as a bounded value from `0°` to `OBLIQUITY_DEG`, derive the correct signed camera-up direction from the displayed equatorial and ecliptic poles, and expose the interaction through a small screen-space overlay around the projected north-axis tip. Do not rotate the Earth independently or change any astronomical geometry.

**Tech stack:** React 19, TypeScript, Three.js, SVG/DOM overlay, Zustand only for the existing view-snap trigger, Node test runner.

---

## 1. Existing behavior and terminology

The orbital model currently provides three view snaps:

- `Three-quarter`
- `Edge-on ecliptic`
- `From the north`

The edge-on preset uses approximately:

```ts
theta = 1.57;
phi = 1.57;
radius = 6.6;
```

This places the camera along the common line where the equatorial and ecliptic planes intersect. Consequently:

- the equator is edge-on;
- the ecliptic is also edge-on;
- the current camera-up direction makes celestial/geographical north vertical;
- the equator appears horizontal;
- the ecliptic appears inclined by Earth's obliquity, approximately `23.4°`.

The distinction is therefore not between an “edge-on equator” view and an “edge-on ecliptic” view. Both planes are edge-on simultaneously. The useful choice is which plane is level on the screen.

Rename the existing preset button from `Edge-on ecliptic` to:

```text
Edge-on
```

Do not add separate `Edge-on equator` and `Edge-on ecliptic` preset buttons.

---

## 2. Scientific and rendering invariants

This feature is a display-orientation control only. It must not change:

- the Earth mesh's physical or sidereal rotation;
- the observer marker's latitude or longitude;
- the equator, ecliptic, or lunar-orbit geometry;
- the Sun or Moon vectors;
- the Moon's phase or displayed illumination;
- the astronomy-provider inputs or outputs;
- the `instant`/`orbit` two-clock contract;
- the selected date, mean solar time, UTC, or civil time;
- the URL or URL-restoration behavior;
- the current `EARTH_DISPLAY_Z_SCALE` handedness correction;
- the other two snap positions;
- wheel zoom limits;
- the page layout or diagram dimensions.

Do **not** implement this by rotating only the Earth mesh. That would incorrectly separate the geographic axis from the equator, ecliptic, Moon orbit, observer marker, and sunlight.

Do **not** add a new physical axial tilt to the model. The equatorial and ecliptic planes already contain the real obliquity relationship.

Do **not** rotate only the Three.js scene unless every world-space shader and light vector is transformed consistently. Camera roll is the preferred implementation because it changes only the presentation and leaves the model's reference frame intact.

---

## 3. Orientation model

### 3.1 Bounded roll value

Represent the user-facing value as:

```ts
0 <= rollDeg <= OBLIQUITY_DEG
```

Use the existing exported constant:

```ts
OBLIQUITY_DEG = 23.4392911
```

Display it as `23.4°` at normal UI precision. Do not introduce a second hard-coded `23.4` or `23.5` constant.

The endpoint meanings are:

| Roll | Screen result |
|---|---|
| `0°` | North is vertical; equator is horizontal |
| `OBLIQUITY_DEG` | Ecliptic pole is vertical; ecliptic is horizontal |
| Intermediate | Continuous roll between the two level orientations |

The roll direction must be chosen from the actual displayed geometry, not assumed from an unreflected mathematical coordinate system. The existing Z reflection can reverse the apparent sign of a screen rotation.

### 3.2 Camera-up derivation

Create a small pure helper module:

```text
app/src/lib/edge-on-roll.ts
```

Its responsibilities are:

1. Accept the camera viewing direction and the relevant displayed pole vectors.
2. Project celestial north onto the plane perpendicular to the viewing direction to obtain the `0°` camera-up vector.
3. Apply `EARTH_DISPLAY_Z_SCALE` to model vectors before deriving their displayed orientation.
4. Project the displayed ecliptic pole onto the same camera plane to obtain the ecliptic-level camera-up vector.
5. Calculate the signed shortest rotation from the north-up vector to the ecliptic-up vector around the viewing axis.
6. Interpolate from north-up to ecliptic-up using a clamped `rollDeg / OBLIQUITY_DEG` fraction.
7. Return a normalized camera-up vector suitable for `camera.up.copy(...)` before `camera.lookAt(0, 0, 0)`.

The helper must avoid relying on the approximate preset values alone. It must normalize vectors and guard against a degenerate projection, even though the edge preset should not normally produce one.

At the edge-on preset, tests must prove that:

- `0°` makes the projected equator horizontal;
- `OBLIQUITY_DEG` makes the projected ecliptic horizontal;
- the camera position, target, and radius are unchanged by roll;
- the angular separation of the two level orientations is approximately `OBLIQUITY_DEG`;
- the result remains correct with `EARTH_DISPLAY_Z_SCALE = -1`.

### 3.3 Local state

Keep the roll state local to `SpaceScene`. Do not add it to the URL, persisted settings, or the global astronomy state.

Required local concepts:

```ts
type ViewMode = "oblique" | "edge" | "north" | "free";

rollDeg: number;
viewMode: ViewMode;
```

Behavior:

- Selecting `Edge-on` sets `viewMode = "edge"` and resets `rollDeg = 0`.
- Selecting `Three-quarter` or `From the north` sets the corresponding mode and resets `rollDeg = 0`.
- Starting the existing free-orbit canvas drag exits edge mode, sets `viewMode = "free"`, and hides the roll control, but preserves the live rolled camera-up orientation so the model does not jump back to north-up on the first movement.
- Continued free-orbit dragging evolves continuously from that preserved camera-up orientation. The numeric edge-roll value is no longer presented outside edge mode because the projected perspective angle is not the same measurement.
- Wheel zoom does not exit edge mode and preserves the current roll.
- Re-entering `Edge-on` always starts from the clear equator-horizontal `0°` baseline rather than reviving a hidden prior value.
- A page reload starts with the existing default three-quarter view and no retained roll.

---

## 4. Interaction design

### 4.1 Where interaction is available

The roll interaction is available only while `viewMode === "edge"`.

Do not show it in:

- the three-quarter preset;
- the north preset;
- a free-orbit view reached by dragging the main canvas;
- the static WebGL-failure stand-in.

In non-edge views, the projected angle is affected by perspective and would not be a direct visual statement of Earth's obliquity.

### 4.2 Primary pointer interaction

The interaction target is the outer end of the existing white north-axis line and its nearby annotation area.

Use a transparent pointer hit target of at least `40 × 40` CSS pixels around the projected north-axis tip. The visible pole marker does not need to become larger.

Pointer behavior:

1. Hovering the hit target shows a grab cursor and reveals the quiet interaction preview described in section 5.
2. Pointer down captures the pointer and starts roll dragging without starting the existing orbit drag.
3. Convert the pointer's bearing around the projected Earth centre into a candidate roll angle along the permitted sweep.
4. Clamp the result to `[0, OBLIQUITY_DEG]`.
5. Update the camera roll continuously while dragging.
6. On release, snap to an endpoint when the value is within `1.5°` of that endpoint.
7. Values outside those endpoint zones remain at their intermediate angle.

The control must not allow negative roll, a full 360° camera roll, or overshoot beyond the ecliptic-level endpoint. Those behaviors add freedom without supporting the explanatory goal.

### 4.3 Keyboard interaction

The same hit target must be keyboard focusable and expose slider semantics:

```text
role="slider"
aria-label="Edge-on level angle"
aria-valuemin="0"
aria-valuemax="23.4"
aria-valuenow="…"
```

Use an `aria-valuetext` that explains the endpoints without adding those words to the visible diagram:

- `Camera roll 0 degrees; equator horizontal`
- `Camera roll 23.4 degrees; ecliptic horizontal`
- intermediate example: `Camera roll 12.0 degrees toward ecliptic horizontal`

Keyboard behavior:

- `ArrowLeft` / `ArrowDown`: decrease by `0.5°`.
- `ArrowRight` / `ArrowUp`: increase by `0.5°`.
- `Home`: set `0°`.
- `End`: set `OBLIQUITY_DEG`.
- Clamp all values to the allowed range.

Show a visible focus treatment around the pole-tip hit area only while keyboard focus is visible.

### 4.4 Touch behavior

The pole-tip hit target must support touch through the same pointer-event path. It must capture the pointer so that rolling the model does not scroll the page or trigger the underlying canvas orbit gesture.

Do not require hover for discovery or operation on touch devices.

---

## 5. Angle annotation and clutter control

### 5.1 General principle

Do not add permanent in-diagram labels such as:

- `Equator level`
- `Ecliptic level`
- `Axial tilt`

The existing colored geometry and legend already identify the equator and ecliptic. Additional words inside the orbital diagram would compete with the geometry.

The only new visible text inside the diagram is the compact roll value. Prefix it with `Roll` so intermediate values cannot be mistaken for a changing angle between the equator and ecliptic.

### 5.2 Arc geometry

Render the annotation in a screen-space SVG/DOM overlay above the WebGL canvas.

The measured angle is between:

- the screen's vertical-up direction; and
- the displayed white north-axis direction.

Construct the arc using the projected Earth centre as its angular centre, but place it at a radius slightly beyond the projected north-axis tip. This makes it appear as a small arc at the top of the white north line without placing graphics across the Earth itself.

The arc must:

- use a thin dashed or dotted cream/neutral stroke;
- remain visually quieter than the solid equator, ecliptic, and lunar-orbit lines;
- use round dash caps where supported;
- avoid a filled wedge;
- avoid arrowheads;
- avoid adding a second permanent reference line;
- scale in CSS pixels so it remains legible without becoming larger when zooming the 3D camera.

Suggested starting values, subject to visual review:

```text
stroke width: 1–1.25 CSS px
opacity at rest: 0.45–0.6
dash pattern: approximately 3 px dash / 3 px gap
arc offset beyond pole tip: approximately 8–14 CSS px
```

These are visual tuning ranges, not astronomical parameters.

### 5.3 Numeric label

Place the numeric angle below the arc, centred near its midpoint.

Formatting:

- exactly `Roll 0°` at the north-up endpoint;
- exactly `Roll 23.4°` at the ecliptic-level endpoint;
- one decimal place for intermediate values, for example `Roll 12.0°`.

Use the existing small muted-text styling. The value must remain readable but must not have the visual weight of the diagram legend.

### 5.4 Visibility states

To prevent persistent clutter:

**At rest at `0°`:**

- hide the measured arc and numeric label;
- retain the invisible pointer/focus hit target at the north-axis tip.

**On hover or keyboard focus at `0°`:**

- show a faint preview of the permitted sweep from `0°` to `23.4°`;
- show `Roll 0°` beneath it;
- do not add endpoint words.

**While dragging or changing by keyboard:**

- show the measured arc from vertical to the current north-axis direction;
- show the live numeric value at full annotation opacity.

**At rest above `0°`:**

- keep the measured arc and numeric value visible at the quieter resting opacity;
- at the endpoint, show `Roll 23.4°`.

**After returning to `0°`:**

- allow the annotation to fade out after a short delay of roughly `500–800 ms` so the completed interaction remains perceptible;
- when `prefers-reduced-motion` is enabled, change visibility immediately rather than animating the fade.

### 5.5 Discovery outside the diagram

Update the existing low-priority instruction line below the controls rather than adding a new panel, legend item, or persistent diagram label.

Add one concise sentence along these lines:

```text
In Edge-on view, drag the north-axis tip to level the equator or ecliptic.
```

Keep this in the existing explanatory/caveat line. Do not create another control row.

---

## 6. Overlay synchronization

The current static SVG stand-in uses a fixed default projection and is not sufficient for this control. The interactive annotation must use the live Three.js camera projection.

For each camera placement, roll update, and resize:

1. Project the world origin to obtain the Earth centre in CSS pixels.
2. Project the north-axis tip used by the existing white axis/pole marker.
3. Calculate the displayed north-axis bearing.
4. Update the hit target, arc path, label position, and focus indicator.

The overlay must stay aligned when:

- entering edge-on view;
- rolling between endpoints;
- wheel-zooming;
- resizing the diagram or browser window;
- changing device pixel ratio;
- entering or leaving fullscreen browser presentation, if applicable.

Use CSS-pixel coordinates based on the host element's rendered size. Do not use renderer backing-buffer pixels directly without converting for device pixel ratio.

Do not update React state on every animation frame when nothing about the camera or overlay has changed. Update overlay geometry only from camera placement, interaction, and resize paths.

The existing non-interactive SVG stand-in can remain `pointer-events: none`. The new interaction layer must be a separate overlay with pointer events limited to the pole-tip hit target, not the entire diagram.

---

## 7. Camera behavior

Refactor the current `place()` operation so every camera placement follows this order:

1. Set camera position from `theta`, `phi`, and `radius`.
2. Determine the camera-up vector:
   - edge mode: derive it from `rollDeg`;
   - all other modes: use celestial north/default north-up behavior.
3. Assign `camera.up`.
4. Call `camera.lookAt(0, 0, 0)`.
5. Update observer-overlay scale.
6. Update the interactive annotation overlay.
7. Render on the next existing draw path.

Rolling must not change:

- `theta`;
- `phi`;
- `radius`;
- field of view;
- near/far planes;
- Earth or Moon positions.

Endpoint correctness is more important than preserving a hard-coded sign. At `OBLIQUITY_DEG`, the rendered ecliptic line must be horizontal within visual/test tolerance.

If a short endpoint snap animation is used, keep it at approximately `100–150 ms`, apply it only to the camera roll, and disable it under `prefers-reduced-motion`. Do not introduce spring motion or overshoot.

---

## 8. Files and responsibilities

### Create

```text
app/src/lib/edge-on-roll.ts
app/src/lib/edge-on-roll.test.ts
```

`edge-on-roll.ts` contains pure vector/angle calculations only. It must not import React or access the DOM.

### Modify

```text
app/src/components/space-scene.tsx
app/src/components/moon-app.tsx
app/package.json
```

Responsibilities:

- `space-scene.tsx`
  - local edge/free view mode;
  - local roll state;
  - camera-up application;
  - live projection of centre and pole tip;
  - interactive SVG/DOM overlay;
  - pointer, touch, and keyboard handling;
  - cleanup of listeners, pointer capture, and any animation frame/timer.

- `moon-app.tsx`
  - rename the preset button to `Edge-on`;
  - add the concise instruction to the existing low-priority helper line;
  - do not add a new control row or legend entry.

- `package.json`
  - add the new pure-helper test file to the existing explicit test command if the project test script still enumerates test files.

Do not modify `app/src/lib/store.ts` unless implementation proves that `SpaceScene` cannot reliably distinguish a snap from free dragging locally. The preferred design keeps this presentation-only value out of global state.

---

## 9. Test requirements

### 9.1 Pure geometry tests

Add deterministic tests for:

1. `0°` returns a normalized north-up vector.
2. `OBLIQUITY_DEG` returns a normalized ecliptic-pole-up vector.
3. Half the allowed roll produces the correct halfway angular orientation.
4. Inputs below `0°` clamp to `0°`.
5. Inputs above `OBLIQUITY_DEG` clamp to the endpoint.
6. The signed direction remains correct after applying `EARTH_DISPLAY_Z_SCALE`.
7. At the edge-on camera direction, the projected equator is horizontal at `0°`.
8. At the same camera direction, the projected ecliptic is horizontal at `OBLIQUITY_DEG`.
9. The helper does not mutate its input vectors.
10. Degenerate projection input returns a safe fallback rather than `NaN` or a zero camera-up vector.

Use angular/vector tolerances rather than string or screenshot comparisons for these tests.

### 9.2 Interaction tests

Where practical with the existing test environment, test the interaction controller separately from Three.js rendering:

- pointer-derived angle clamps to the allowed sweep;
- endpoint release snapping uses the specified `1.5°` threshold;
- keyboard increments and endpoint keys behave correctly;
- displayed value formatting uses `0°`, one decimal for intermediate values, and `23.4°` at maximum;
- accessible value text names the correct level condition;
- leaving edge mode resets roll and hides the annotation.

If direct DOM component testing would require a large new framework, keep the logic pure and test it in `edge-on-roll.test.ts`; verify DOM wiring in the browser rather than adding a broad dependency solely for this feature.

### 9.3 Regression tests

Existing tests must continue to prove:

- displayed Earth handedness is correct;
- observer geography remains aligned;
- equator/ecliptic/lunar geometry is unchanged;
- all astronomy and civil-time tests pass.

---

## 10. Browser verification scenarios

Verify at minimum in the locally served production build at 100% browser zoom.

### Scenario A — default and unrelated views

1. Load the page fresh.
2. Confirm the default three-quarter view is unchanged.
3. Confirm no roll arc or angle value is visible.
4. Select `From the north`; confirm no roll control appears.
5. Confirm ordinary model dragging and wheel zoom still work.

### Scenario B — edge-on baseline

1. Select `Edge-on`.
2. Confirm the equator is horizontal.
3. Confirm the ecliptic is inclined by approximately `23.4°`.
4. Confirm north is vertically up.
5. Confirm the annotation is absent at rest until the pole-tip control is hovered or focused.
6. Hover or focus the pole-tip target; confirm the faint sweep and `0°` appear.

### Scenario C — full roll

1. Drag the pole-tip control to its far endpoint.
2. Confirm the camera direction and zoom do not change.
3. Confirm the entire model rolls together.
4. Confirm the ecliptic becomes horizontal.
5. Confirm the equator is inclined by approximately `23.4°` in the opposite screen relationship.
6. Confirm the white north axis is tilted by approximately `23.4°`.
7. Confirm the arc and value read `23.4°`.
8. Confirm the observer marker, coastline, sunlight, Moon, and all three orbital hoops remain mutually aligned.

### Scenario D — intermediate roll and snapping

1. Stop near `12°`; confirm the intermediate position remains and reads one decimal place.
2. Release within `1.5°` of `0°`; confirm it snaps to `0°`.
3. Release within `1.5°` of `23.4°`; confirm it snaps to `23.4°`.
4. Confirm the annotation fades away after returning to rest at `0°`.

### Scenario E — interaction separation

1. While edge roll is non-zero, wheel-zoom; confirm the roll is preserved and overlay remains aligned.
2. Start a normal drag away from the edge view; confirm roll mode exits, the annotation disappears, and the diagram continues from its rolled orientation without jumping back to north-up.
3. Select `Edge-on` again; confirm it starts at `0°`.
4. Confirm dragging the pole-tip control never also orbits the model.

### Scenario F — keyboard and touch

1. Focus the pole-tip control with the keyboard.
2. Confirm a visible focus indication appears.
3. Exercise arrow keys, Home, and End.
4. Inspect the accessibility tree for slider name, range, value, and endpoint descriptions.
5. Test the same control with touch/pointer emulation and confirm the page does not scroll during the gesture.

### Scenario G — responsive alignment

Verify the baseline and `23.4°` endpoint at the existing supported desktop sizes, including approximately:

- `1280 × 800`
- `1440 × 900`
- `1920 × 1080`

Confirm the arc remains near the pole tip, does not overlap the header or legend, and does not introduce horizontal overflow.

---

## 11. Acceptance criteria

The feature is complete only when all of the following are true:

- [ ] The existing preset is labelled `Edge-on`.
- [ ] Entering edge-on view starts with the equator horizontal and roll `0°`.
- [ ] The user can drag the north-axis tip continuously from `0°` to `23.4°`.
- [ ] At `23.4°`, the ecliptic is horizontal without changing the camera direction or astronomical model.
- [ ] Earth, observer, hoops, Moon, sunlight, and coastline roll together with no relative misalignment.
- [ ] Roll is bounded and cannot continue beyond the two meaningful endpoints.
- [ ] Endpoint snapping works without spring overshoot.
- [ ] No new permanent descriptive labels are added inside the diagram.
- [ ] The only new in-diagram text is the numeric angle.
- [ ] The dashed angle arc is subtle and appears at the top of the north-axis line.
- [ ] At rest at `0°`, the annotation does not clutter the diagram.
- [ ] Hover, focus, drag, and non-zero states provide sufficient interaction feedback.
- [ ] Keyboard and touch operation are supported.
- [ ] Free model dragging exits roll mode and hides its annotation without resetting the live camera-up orientation or causing a visual jump.
- [ ] Wheel zoom preserves roll and overlay alignment.
- [ ] The feature adds no URL parameter, persisted preference, astronomy state, or runtime dependency.
- [ ] Existing automated tests pass.
- [ ] New geometry/interaction tests pass.
- [ ] Production build, TypeScript, targeted ESLint, and `git diff --check` pass.
- [ ] Browser verification passes at 100% zoom with no console, hydration, or unhandled errors.

---

## 12. Explicit non-goals

This specification does not include:

- arbitrary 360° camera roll;
- negative roll angles;
- a general-purpose orientation gizmo;
- separate Equator/Ecliptic level buttons;
- a new settings panel or control row;
- persistent `Equator level` or `Ecliptic level` labels in the diagram;
- changing the actual obliquity of Earth;
- animating precession or long-term obliquity variation;
- persisting the roll in the URL or browser storage;
- applying the angle annotation to perspective/three-quarter views;
- changing the sky-path diagram.

The feature exists to make one relationship directly explorable: in the common edge-on direction, rolling the presentation by Earth's obliquity changes which of the equatorial and ecliptic planes is horizontal.
