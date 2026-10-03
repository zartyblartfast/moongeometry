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

test("initial lookup failure becomes unavailable and retry returns to loading", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, { type: "lookup-failed", requestId: 1 });

  assert.deepEqual(selectCivilTimeState(state, winter), { status: "unavailable" });

  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });

  assert.deepEqual(selectCivilTimeState(state, winter), { status: "loading" });
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

test("stale lookup failure is ignored", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });

  const staleFailure = reduceCivilTimeController(state, {
    type: "lookup-failed",
    requestId: 1,
  });

  assert.equal(staleFailure, state);
  assert.deepEqual(selectCivilTimeState(staleFailure, winter), { status: "loading" });
});

test("stale retained-zone success is ignored while the latest request keeps refreshing", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 3 });

  const staleCompletion = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 2,
    timeZoneId: "America/New_York",
  });

  assert.equal(staleCompletion, state);
  const refreshing = selectCivilTimeState(staleCompletion, winter);
  assert.equal(refreshing.status, "ready");
  if (refreshing.status !== "ready") return;
  assert.equal(refreshing.value.timeZoneId, "Europe/London");
  assert.equal(refreshing.refreshingCoordinates, true);

  const latestCompletion = reduceCivilTimeController(staleCompletion, {
    type: "lookup-succeeded",
    requestId: 3,
    timeZoneId: "Asia/Tokyo",
  });
  const selected = selectCivilTimeState(latestCompletion, winter);
  assert.equal(selected.status, "ready");
  if (selected.status !== "ready") return;
  assert.equal(selected.value.timeZoneId, "Asia/Tokyo");
  assert.equal(selected.refreshingCoordinates, false);
});

test("stale retained-zone failure is ignored while the latest request keeps refreshing", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 3 });

  const staleFailure = reduceCivilTimeController(state, {
    type: "lookup-failed",
    requestId: 2,
  });

  assert.equal(staleFailure, state);
  const refreshing = selectCivilTimeState(staleFailure, winter);
  assert.equal(refreshing.status, "ready");
  if (refreshing.status !== "ready") return;
  assert.equal(refreshing.value.timeZoneId, "Europe/London");
  assert.equal(refreshing.refreshingCoordinates, true);
});

test("latest lookup completion replaces the retained zone", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });

  const refreshing = selectCivilTimeState(state, winter);
  assert.equal(refreshing.status, "ready");
  if (refreshing.status !== "ready") return;
  assert.equal(refreshing.value.timeZoneId, "Europe/London");
  assert.equal(refreshing.refreshingCoordinates, true);

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

test("latest lookup completion formats the latest instant", () => {
  let state = createCivilTimeControllerState();
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 1 });
  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 1,
    timeZoneId: "Europe/London",
  });
  state = reduceCivilTimeController(state, { type: "coordinates-requested", requestId: 2 });

  const atRequestStart = selectCivilTimeState(state, winter);
  assert.equal(atRequestStart.status, "ready");
  if (atRequestStart.status !== "ready") return;
  assert.equal(atRequestStart.value.clock, "12:34");
  assert.equal(atRequestStart.refreshingCoordinates, true);

  const whilePending = selectCivilTimeState(state, summer);
  assert.equal(whilePending.status, "ready");
  if (whilePending.status !== "ready") return;
  assert.equal(whilePending.value.clock, "13:34");
  assert.equal(whilePending.refreshingCoordinates, true);

  state = reduceCivilTimeController(state, {
    type: "lookup-succeeded",
    requestId: 2,
    timeZoneId: "America/New_York",
  });

  const selected = selectCivilTimeState(state, summer);
  assert.equal(selected.status, "ready");
  if (selected.status !== "ready") return;
  assert.equal(selected.value.timeZoneId, "America/New_York");
  assert.equal(selected.value.clock, "08:34");
  assert.equal(selected.value.utcOffsetMinutes, -240);
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
