import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode, createElement, useEffect, useLayoutEffect, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { CivilTimeState } from "./use-civil-time.ts";

Object.defineProperty(globalThis, "window", { configurable: true, value: {} });

const {
  createUseCivilTime,
  createCivilTimeControllerState,
  reduceCivilTimeController,
  selectCivilTimeState,
} = await import("./use-civil-time.ts");

const winter = Date.UTC(2024, 0, 15, 12, 34);
const summer = Date.UTC(2024, 6, 15, 12, 34);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function synchronousDeferred<T>(): Deferred<T> {
  let onFulfilled: ((value: T) => void) | undefined;
  const promise = {
    then(fulfilled: (value: T) => unknown) {
      onFulfilled = fulfilled;
      return Promise.resolve();
    },
  } as Promise<T>;
  return {
    promise,
    resolve(value) {
      onFulfilled?.(value);
    },
  };
}

type CivilTimeHook = (instant: number, latDeg: number, lonDeg: number) => CivilTimeState;
type HookProps = { instant: number; latDeg: number; lonDeg: number };

async function mountCivilTimeHook(
  useHook: CivilTimeHook,
  initialProps: HookProps,
  options: { strict?: boolean; onCleanup?: () => void } = {},
) {
  let latestState: CivilTimeState | undefined;
  let renderCount = 0;

  function Harness({ instant, latDeg, lonDeg }: HookProps): ReactNode {
    latestState = useHook(instant, latDeg, lonDeg);
    renderCount += 1;
    useEffect(() => () => options.onCleanup?.(), []);
    return null;
  }

  function element(props: HookProps) {
    const harness = createElement(Harness, props);
    return options.strict ? createElement(StrictMode, null, harness) : harness;
  }

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element(initialProps));
  });

  return {
    get state() {
      assert.ok(latestState);
      return latestState;
    },
    get renderCount() {
      return renderCount;
    },
    async update(props: HookProps) {
      await act(async () => {
        renderer.update(element(props));
      });
    },
    async unmount() {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}

test("coordinate commit rejects a prior lookup that resolves before passive effects", async () => {
  const requests: Array<Deferred<string | null>> = [];
  const useTestCivilTime = createUseCivilTime(() => {
    const request = synchronousDeferred<string | null>();
    requests.push(request);
    return request.promise;
  });
  let latestState: CivilTimeState | undefined;

  function Harness({
    latDeg,
    lonDeg,
    afterCommit,
  }: {
    latDeg: number;
    lonDeg: number;
    afterCommit?: () => void;
  }): ReactNode {
    latestState = useTestCivilTime(winter, latDeg, lonDeg);
    useLayoutEffect(() => {
      afterCommit?.();
    }, [afterCommit, latDeg, lonDeg]);
    return null;
  }

  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Harness, { latDeg: 51.5, lonDeg: -0.1 }));
  });
  assert.equal(requests.length, 1);

  await act(async () => {
    renderer.update(
      createElement(Harness, {
        latDeg: 40.75,
        lonDeg: -73.98,
        afterCommit: () => requests[0].resolve("Europe/London"),
      }),
    );
  });

  assert.equal(requests.length, 2);
  assert.deepEqual(latestState, { status: "loading" });

  await act(async () => {
    renderer.unmount();
  });
});

test("latest lookup resolves and becomes ready", async () => {
  const request = deferred<string | null>();
  const hook = await mountCivilTimeHook(createUseCivilTime(() => request.promise), {
    instant: winter,
    latDeg: 51.5,
    lonDeg: -0.1,
  });

  assert.deepEqual(hook.state, { status: "loading" });

  await act(async () => {
    request.resolve("Europe/London");
    await request.promise;
  });

  assert.equal(hook.state.status, "ready");
  if (hook.state.status === "ready") {
    assert.equal(hook.state.value.timeZoneId, "Europe/London");
    assert.equal(hook.state.refreshingCoordinates, false);
  }
  await hook.unmount();
});

test("instant-only rerender creates no lookup and reformats the current zone", async () => {
  const requests: Array<Deferred<string | null>> = [];
  const hook = await mountCivilTimeHook(
    createUseCivilTime(() => {
      const request = deferred<string | null>();
      requests.push(request);
      return request.promise;
    }),
    { instant: winter, latDeg: 51.5, lonDeg: -0.1 },
  );

  await act(async () => {
    requests[0].resolve("Europe/London");
    await requests[0].promise;
  });
  assert.equal(hook.state.status, "ready");
  if (hook.state.status === "ready") assert.equal(hook.state.value.clock, "12:34");

  await hook.update({ instant: summer, latDeg: 51.5, lonDeg: -0.1 });

  assert.equal(requests.length, 1);
  assert.equal(hook.state.status, "ready");
  if (hook.state.status === "ready") assert.equal(hook.state.value.clock, "13:34");
  await hook.unmount();
});

test("unmount cleanup prevents a late lookup completion from taking effect", async () => {
  const request = deferred<string | null>();
  const hook = await mountCivilTimeHook(createUseCivilTime(() => request.promise), {
    instant: winter,
    latDeg: 51.5,
    lonDeg: -0.1,
  });
  const rendersBeforeUnmount = hook.renderCount;

  await hook.unmount();
  await act(async () => {
    request.resolve("Europe/London");
    await request.promise;
  });

  assert.equal(hook.renderCount, rendersBeforeUnmount);
  assert.deepEqual(hook.state, { status: "loading" });
});

test("Strict Mode replay rejects the lookup cancelled by effect cleanup", async () => {
  const requests: Array<Deferred<string | null>> = [];
  const hook = await mountCivilTimeHook(
    createUseCivilTime(() => {
      const request = synchronousDeferred<string | null>();
      requests.push(request);
      return request.promise;
    }),
    { instant: winter, latDeg: 51.5, lonDeg: -0.1 },
    {
      strict: true,
      onCleanup: () => requests[0]?.resolve("Europe/London"),
    },
  );

  assert.equal(requests.length, 2);
  assert.deepEqual(hook.state, { status: "loading" });
  await hook.unmount();
});

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
