import assert from "node:assert/strict";
import test from "node:test";
import {
  createCivilTimeControllerState,
  reduceCivilTimeController,
  selectCivilTimeState,
} from "./use-civil-time.ts";

const winter = Date.UTC(2024, 0, 15, 12, 34);
const summer = Date.UTC(2024, 6, 15, 12, 34);

test("first unresolved lookup remains loading", () => {
  const initial = createCivilTimeControllerState();
  const pending = reduceCivilTimeController(initial, {
    type: "coordinates-requested",
    requestId: 1,
  });

  assert.deepEqual(selectCivilTimeState(pending, winter), { status: "loading" });
});

test("first successful lookup becomes ready", () => {
  const pending = reduceCivilTimeController(createCivilTimeControllerState(), {
    type: "coordinates-requested",
    requestId: 1,
  });
  const resolved = reduceCivilTimeController(pending, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });

  const selected = selectCivilTimeState(resolved, winter);
  assert.equal(selected.status, "ready");
  if (selected.status !== "ready") return;
  assert.equal(selected.value.clock, "12:34");
  assert.equal(selected.value.timeZoneId, "Europe/London");
  assert.equal(selected.refreshingCoordinates, false);
});

test("coordinate refresh retains and reformats the previous zone", () => {
  const resolved = reduceCivilTimeController(
    reduceCivilTimeController(createCivilTimeControllerState(), {
      type: "coordinates-requested",
      requestId: 1,
    }),
    {
      type: "lookup-succeeded",
      requestId: 1,
      timeZoneId: "Europe/London",
    },
  );
  const refreshing = reduceCivilTimeController(resolved, {
    type: "coordinates-requested",
    requestId: 2,
  });

  const selected = selectCivilTimeState(refreshing, summer);
  assert.equal(selected.status, "ready");
  if (selected.status !== "ready") return;
  assert.equal(selected.value.clock, "13:34");
  assert.equal(selected.value.timeZoneId, "Europe/London");
  assert.equal(selected.refreshingCoordinates, true);
});

test("stale lookup completion is ignored", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });

  const staleCompletion = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });

  assert.equal(staleCompletion, state);
  assert.deepEqual(selectCivilTimeState(staleCompletion, winter), { status: "loading" });
});

test("latest lookup completion replaces the zone", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 2,
    timeZoneId: "America/New_York",
  });

  const selected = selectCivilTimeState(state, winter);
  assert.equal(selected.status, "ready");
  if (selected.status !== "ready") return;
  assert.equal(selected.value.clock, "07:34");
  assert.equal(selected.value.timeZoneId, "America/New_York");
  assert.equal(selected.refreshingCoordinates, false);
});

test("latest lookup failure becomes unavailable instead of retaining stale data", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });
  state = reduceCivilTimeController(state, { type: "lookup-failed", requestId: 2 });

  assert.deepEqual(selectCivilTimeState(state, winter), { status: "unavailable" });
});

test("instant-only changes reformat the resolved zone without a new request", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });

  const before = selectCivilTimeState(state, winter);
  const after = selectCivilTimeState(state, summer);

  assert.equal(state.latestRequestId, 1);
  assert.equal(before.status, "ready");
  assert.equal(after.status, "ready");
  if (before.status !== "ready" || after.status !== "ready") return;
  assert.equal(before.value.clock, "12:34");
  assert.equal(after.value.clock, "13:34");
});
