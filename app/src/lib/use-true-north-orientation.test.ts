import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode, createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  browserTrueNorthOrientationDependencies,
  naturalTopHeadingToDisplayedPageTop,
  createTrueNorthOrientationController,
  createUseTrueNorthOrientation,
  headingSampleFromDeviceOrientation,
  orientationPermissionRequestFromConstructor,
  type HeadingSample,
  type TrueNorthOrientationDependencies,
  type TrueNorthOrientationState,
} from "./use-true-north-orientation.ts";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type PositionSuccess = Parameters<
  TrueNorthOrientationDependencies["getCurrentPosition"]
>[0];
type PositionError = Parameters<
  TrueNorthOrientationDependencies["getCurrentPosition"]
>[1];

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function createFakeDependencies(
  options: {
    secure?: boolean;
    permission?: "none" | "granted" | "denied" | "reject" | "pending" | "throw";
    declinationDeg?: number;
    declinationValid?: boolean;
  } = {},
) {
  let positionSuccess: PositionSuccess | undefined;
  let positionError: PositionError | undefined;
  const positionRequests: Array<{
    success: PositionSuccess;
    error: PositionError;
  }> = [];
  let headingListener: ((sample: HeadingSample) => void) | undefined;
  let visibilityListener: (() => void) | undefined;
  let screenOrientationListener: (() => void) | undefined;
  let visible = true;
  let timerId = 0;
  const timers = new Map<number, () => void>();
  const timerCallbacks: Array<() => void> = [];
  const headingListeners: Array<(sample: HeadingSample) => void> = [];
  const permissionRequests: Array<{
    resolve: (value: "granted" | "denied") => void;
    reject: (reason: unknown) => void;
  }> = [];
  const calls: string[] = [];
  const permission = options.permission ?? "none";

  const dependencies: TrueNorthOrientationDependencies = {
    isSecureContext: () => options.secure ?? true,
    requestOrientationPermission:
      permission === "none"
        ? null
        : () => {
            calls.push("permission");
            if (permission === "throw") throw new Error("thrown");
            if (permission === "granted") return Promise.resolve("granted");
            if (permission === "denied") return Promise.resolve("denied");
            if (permission === "reject")
              return Promise.reject(new Error("rejected"));
            return new Promise((resolve, reject) => {
              permissionRequests.push({ resolve, reject });
            });
          },
    getCurrentPosition(success, error, geolocationOptions) {
      calls.push("geolocation");
      assert.deepEqual(geolocationOptions, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      });
      positionSuccess = success;
      positionError = error;
      positionRequests.push({ success, error });
    },
    addHeadingListener(listener) {
      calls.push("heading-listener-added");
      headingListener = listener;
      headingListeners.push(listener);
      return () => {
        calls.push("heading-listener-removed");
        if (headingListener === listener) headingListener = undefined;
      };
    },
    addVisibilityListener(listener) {
      calls.push("visibility-listener-added");
      visibilityListener = listener;
      return () => {
        calls.push("visibility-listener-removed");
        if (visibilityListener === listener) visibilityListener = undefined;
      };
    },
    addScreenOrientationListener(listener) {
      calls.push("screen-orientation-listener-added");
      screenOrientationListener = listener;
      return () => {
        calls.push("screen-orientation-listener-removed");
        if (screenOrientationListener === listener)
          screenOrientationListener = undefined;
      };
    },
    isDocumentVisible: () => visible,
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      timerCallbacks.push(callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    now: () => new Date("2026-06-01T12:00:00Z"),
    geomagneticDeclination: () => ({
      declinationDeg: options.declinationDeg ?? 0,
      model: "WMM2025",
      valid: options.declinationValid ?? true,
    }),
  };

  return {
    dependencies,
    calls,
    get headingListener() {
      return headingListener;
    },
    get hasScreenOrientationListener() {
      return screenOrientationListener !== undefined;
    },
    get hasVisibilityListener() {
      return visibilityListener !== undefined;
    },
    locate(
      latitude = 51.5007,
      longitude = -0.1246,
      accuracy = 10,
      altitude: number | null = 25,
    ) {
      assert.ok(positionSuccess);
      positionSuccess({ latitude, longitude, accuracy, altitude });
    },
    locateRequest(
      index: number,
      latitude = 51.5007,
      longitude = -0.1246,
      accuracy = 10,
      altitude: number | null = 25,
    ) {
      const request = positionRequests[index];
      assert.ok(request);
      request.success({ latitude, longitude, accuracy, altitude });
    },
    locationError(code: number) {
      assert.ok(positionError);
      positionError({ code });
    },
    emit(sample: HeadingSample) {
      assert.ok(headingListener);
      headingListener(sample);
    },
    emitHeadingRequest(index: number, sample: HeadingSample) {
      const listener = headingListeners[index];
      assert.ok(listener);
      listener(sample);
    },
    fireTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      for (const callback of callbacks) callback();
    },
    fireTimerRequest(index: number) {
      const callback = timerCallbacks[index];
      assert.ok(callback);
      callback();
    },
    hide() {
      visible = false;
      visibilityListener?.();
    },
    show() {
      visible = true;
      visibilityListener?.();
    },
    rotateScreen() {
      screenOrientationListener?.();
    },
    grantPermission(index = permissionRequests.length - 1) {
      const request = permissionRequests[index];
      assert.ok(request);
      request.resolve("granted");
    },
    rejectPermission(index = permissionRequests.length - 1) {
      const request = permissionRequests[index];
      assert.ok(request);
      request.reject(new Error("rejected"));
    },
  };
}

function createController(
  fake: ReturnType<typeof createFakeDependencies>,
  options: Partial<{
    selectedLatDeg: number;
    selectedLonDeg: number;
    moonTrueAzimuthDeg: number;
  }> = {},
) {
  return createTrueNorthOrientationController(
    {
      selectedLatDeg: options.selectedLatDeg ?? 51.5,
      selectedLonDeg: options.selectedLonDeg ?? -0.12,
      moonTrueAzimuthDeg: options.moonTrueAzimuthDeg ?? 10,
    },
    fake.dependencies,
  );
}

function assertUnavailable(
  state: TrueNorthOrientationState,
  reason: string,
): void {
  assert.deepEqual(state, { status: "unavailable", reason });
}

test("does not touch permissions, location, or listeners before start", () => {
  const fake = createFakeDependencies({ permission: "granted" });
  createController(fake);
  assert.deepEqual(fake.calls, []);
});

test("start calls orientation permission synchronously and starts geolocation in the same action", () => {
  const fake = createFakeDependencies({ permission: "pending" });
  const controller = createController(fake);
  controller.start();
  assert.deepEqual(
    fake.calls.filter(
      (call) => call === "permission" || call === "geolocation",
    ),
    ["permission", "geolocation"],
  );
  assert.deepEqual(controller.getState(), { status: "requesting" });
});

test("permission grant and close geolocation acquire heading", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  assert.equal(controller.getState().status, "acquiring-heading");
  assert.ok(fake.headingListener);
});

test("permission denial and rejection are orientation-denied", async () => {
  for (const permission of ["denied", "reject"] as const) {
    const fake = createFakeDependencies({ permission });
    const controller = createController(fake);
    controller.start();
    fake.locate();
    await flushPromises();
    assertUnavailable(controller.getState(), "orientation-denied");
  }
});

test("geolocation denial and other errors remain distinct", async () => {
  for (const [code, reason] of [
    [1, "location-denied"],
    [2, "location-unavailable"],
    [3, "location-unavailable"],
  ] as const) {
    const fake = createFakeDependencies({ permission: "granted" });
    const controller = createController(fake);
    controller.start();
    fake.locationError(code);
    await flushPromises();
    assertUnavailable(controller.getState(), reason);
  }
});

test("unavailable failures remove run listeners and stale prerequisites cannot recover", async () => {
  const fake = createFakeDependencies({ permission: "pending" });
  const controller = createController(fake);
  controller.start();
  assert.equal(fake.hasVisibilityListener, true);
  assert.equal(fake.hasScreenOrientationListener, true);

  fake.locationError(1);
  assertUnavailable(controller.getState(), "location-denied");
  assert.equal(fake.hasVisibilityListener, false);
  assert.equal(fake.hasScreenOrientationListener, false);

  fake.grantPermission();
  await flushPromises();
  fake.show();
  fake.rotateScreen();
  assertUnavailable(controller.getState(), "location-denied");
});

test("failed run cannot reuse permission or location acceptance on restart", async () => {
  const fake = createFakeDependencies({ permission: "pending" });
  fake.dependencies.geomagneticDeclination = () => ({
    declinationDeg: 0,
    model: "WMM2025",
    valid: false,
  });
  const controller = createController(fake);

  controller.start();
  fake.locateRequest(0);
  fake.grantPermission(0);
  await flushPromises();
  fake.emit({ headingDeg: 20, reference: "magnetic" });
  assertUnavailable(controller.getState(), "model-expired");

  controller.start();
  fake.locateRequest(1, 40.7128, -74.006, 8);
  assert.deepEqual(controller.getState(), { status: "requesting" });
  assert.equal(fake.headingListener, undefined);

  fake.grantPermission(1);
  await flushPromises();
  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 40.713, lonDeg: -74.006 },
  });
  assert.equal(fake.headingListener, undefined);
});

test("synchronous orientation permission failure terminates before geolocation", () => {
  const fake = createFakeDependencies({ permission: "throw" });
  const controller = createController(fake);
  controller.start();
  assertUnavailable(controller.getState(), "orientation-denied");
  assert.deepEqual(
    fake.calls.filter((call) => call === "geolocation"),
    [],
  );
  assert.equal(fake.hasVisibilityListener, false);
  assert.equal(fake.hasScreenOrientationListener, false);
});

test("insecure context is rejected without requesting browser APIs", () => {
  const fake = createFakeDependencies({ secure: false, permission: "granted" });
  const controller = createController(fake);
  controller.start();
  assertUnavailable(controller.getState(), "insecure-context");
  assert.deepEqual(fake.calls, []);
});

test("accepting a mismatched device location retains only reduced coordinates for declination", async () => {
  let declinationPosition: [number, number, number | null] | undefined;
  const fake = createFakeDependencies({ permission: "granted" });
  fake.dependencies.geomagneticDeclination = (latDeg, lonDeg, altitude) => {
    declinationPosition = [latDeg, lonDeg, altitude];
    return { declinationDeg: 2, model: "WMM2025", valid: true };
  };
  const controller = createController(fake);
  controller.start();
  fake.locate(40.712776, -74.005974, 8);
  await flushPromises();
  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 40.713, lonDeg: -74.006 },
  });
  assert.equal(fake.headingListener, undefined);

  controller.acceptDeviceLocation();
  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 40.713, lonDeg: -74.006 },
  });
  assert.equal(fake.headingListener, undefined);

  controller.updateOptions({
    selectedLatDeg: 40.713,
    selectedLonDeg: -74.006,
    moonTrueAzimuthDeg: 10,
  });
  assert.equal(controller.getState().status, "acquiring-heading");
  fake.emit({
    headingDeg: 100,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01"),
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 10,
  });
  assert.deepEqual(declinationPosition, [40.713, -74.006, 30]);
  assert.equal(controller.getState().status, "active");
});

test("changing selected coordinates while acquiring invalidates heading acquisition", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  assert.equal(controller.getState().status, "acquiring-heading");
  assert.ok(fake.headingListener);

  controller.updateOptions({
    selectedLatDeg: 40.7128,
    selectedLonDeg: -74.006,
    moonTrueAzimuthDeg: 200,
  });

  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 51.501, lonDeg: -0.125 },
  });
  assert.equal(fake.headingListener, undefined);
  fake.emitHeadingRequest(0, {
    headingDeg: 200,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  assert.equal(controller.getState().status, "location-mismatch");
});

test("changing selected coordinates while active invalidates alignment and heading", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake, { moonTrueAzimuthDeg: 10 });
  controller.start();
  fake.locate();
  await flushPromises();
  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  assert.equal(controller.getState().status, "active");

  controller.updateOptions({
    selectedLatDeg: 40.7128,
    selectedLonDeg: -74.006,
    moonTrueAzimuthDeg: 10,
  });

  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 51.501, lonDeg: -0.125 },
  });
  assert.equal(fake.headingListener, undefined);

  fake.hide();
  fake.show();
  assert.deepEqual(controller.getState(), {
    status: "location-mismatch",
    deviceLocation: { latDeg: 51.501, lonDeg: -0.125 },
  });
  assert.equal(fake.headingListener, undefined);
});

test("material selected-location mismatch clears heading stability history", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake, { moonTrueAzimuthDeg: 10 });
  controller.start();
  fake.locate();
  await flushPromises();
  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 10,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  let state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") assert.equal(state.quality, "good");

  controller.updateOptions({
    selectedLatDeg: 40.7128,
    selectedLonDeg: -74.006,
    moonTrueAzimuthDeg: 10,
  });
  controller.updateOptions({
    selectedLatDeg: 51.5,
    selectedLonDeg: -0.12,
    moonTrueAzimuthDeg: 10,
  });
  assert.equal(controller.getState().status, "acquiring-heading");

  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.quality, "unknown");
    assert.equal(state.aligned, false);
  }
});

test("heading acquisition timeout reports no-heading-source", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  fake.fireTimers();
  assertUnavailable(controller.getState(), "no-heading-source");
});

test("valid samples rearm heading freshness and stale watchdog callbacks are ignored", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();

  fake.emit({ headingDeg: 20, reference: "true" });
  assert.equal(controller.getState().status, "active");

  fake.fireTimerRequest(0);
  assert.equal(controller.getState().status, "active");

  fake.fireTimerRequest(1);
  assertUnavailable(controller.getState(), "no-heading-source");
  assert.equal(fake.headingListener, undefined);
});

test("known magnetic heading applies WMM and real sample date", async () => {
  let measuredAt: Date | undefined;
  const fake = createFakeDependencies({
    permission: "granted",
    declinationDeg: 5,
  });
  fake.dependencies.geomagneticDeclination = (_lat, _lon, _altitude, date) => {
    measuredAt = date;
    return { declinationDeg: 5, model: "WMM2025", valid: true };
  };
  const controller = createController(fake, { moonTrueAzimuthDeg: 120 });
  controller.start();
  fake.locate();
  await flushPromises();
  const sampleDate = new Date("2027-01-02T03:04:05Z");
  fake.emit({ headingDeg: 100, reference: "magnetic", measuredAt: sampleDate });
  assert.equal(measuredAt, sampleDate);
  assert.deepEqual(controller.getState(), {
    status: "active",
    trueHeadingDeg: 105,
    displayAzimuthDeg: 15,
    turnToMoonDeg: 15,
    aligned: false,
    posture: "unknown",
    quality: "unknown",
    headingReference: "magnetic",
  });
});

test("repeated same-day magnetic samples reuse one WMM calculation", async () => {
  let declinationCalls = 0;
  const fake = createFakeDependencies({ permission: "granted" });
  fake.dependencies.geomagneticDeclination = () => {
    declinationCalls += 1;
    return { declinationDeg: 5, model: "WMM2025", valid: true };
  };
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();

  fake.emit({
    headingDeg: 10,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T00:00:01Z"),
  });
  fake.hide();
  fake.show();
  fake.emit({
    headingDeg: 20,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T12:00:00Z"),
  });
  fake.rotateScreen();
  fake.emit({
    headingDeg: 30,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T23:59:59Z"),
  });

  assert.equal(declinationCalls, 1);
});

test("magnetic samples on the next UTC day recalculate WMM", async () => {
  let declinationCalls = 0;
  const fake = createFakeDependencies({ permission: "granted" });
  fake.dependencies.geomagneticDeclination = () => {
    declinationCalls += 1;
    return { declinationDeg: 5, model: "WMM2025", valid: true };
  };
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();

  fake.emit({
    headingDeg: 10,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T23:59:59Z"),
  });
  fake.emit({
    headingDeg: 20,
    reference: "magnetic",
    measuredAt: new Date("2026-06-02T00:00:00Z"),
  });

  assert.equal(declinationCalls, 2);
});

test("restarting a run clears the same-day WMM cache", async () => {
  let declinationCalls = 0;
  const fake = createFakeDependencies({ permission: "granted" });
  fake.dependencies.geomagneticDeclination = () => {
    declinationCalls += 1;
    return { declinationDeg: 5, model: "WMM2025", valid: true };
  };
  const controller = createController(fake);

  controller.start();
  fake.locateRequest(0);
  await flushPromises();
  fake.emit({
    headingDeg: 10,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T12:00:00Z"),
  });

  controller.start();
  fake.locateRequest(1);
  await flushPromises();
  fake.emit({
    headingDeg: 20,
    reference: "magnetic",
    measuredAt: new Date("2026-06-01T12:01:00Z"),
  });

  assert.equal(declinationCalls, 2);
});

test("injected known true heading bypasses WMM", async () => {
  let declinationCalls = 0;
  const fake = createFakeDependencies({ permission: "granted" });
  fake.dependencies.geomagneticDeclination = () => {
    declinationCalls += 1;
    return { declinationDeg: 99, model: "WMM2025", valid: true };
  };
  const controller = createController(fake, { moonTrueAzimuthDeg: 25 });
  controller.start();
  fake.locate();
  await flushPromises();
  fake.emit({ headingDeg: 20, reference: "true" });
  assert.equal(declinationCalls, 0);
  const state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.trueHeadingDeg, 20);
  }
});

test("unknown heading reference terminates the run and invalidates queued callbacks", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  fake.emit({ headingDeg: 20, reference: "unknown" });
  assertUnavailable(controller.getState(), "unknown-heading-reference");
  assert.equal(fake.headingListener, undefined);

  fake.show();
  fake.emitHeadingRequest(0, { headingDeg: 40, reference: "true" });
  fake.fireTimerRequest(0);
  assertUnavailable(controller.getState(), "unknown-heading-reference");
});

test("expired WMM and exact geographic poles are unavailable", async () => {
  const expired = createFakeDependencies({
    permission: "granted",
    declinationValid: false,
  });
  const expiredController = createController(expired);
  expiredController.start();
  expired.locate();
  await flushPromises();
  expired.emit({ headingDeg: 20, reference: "magnetic" });
  assertUnavailable(expiredController.getState(), "model-expired");

  for (const latitude of [-90, 90]) {
    const polar = createFakeDependencies({ permission: "granted" });
    const polarController = createController(polar, {
      selectedLatDeg: latitude,
    });
    polarController.start();
    polar.locate(latitude, 0);
    await flushPromises();
    assertUnavailable(polarController.getState(), "polar-location");
  }
});

test("a stable 359/1 heading window is recognized across circular wrap", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake, { moonTrueAzimuthDeg: 2 });
  controller.start();
  fake.locate();
  await flushPromises();
  for (const headingDeg of [359, 1, 0, 2]) {
    fake.emit({
      headingDeg,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  let state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.ok(state.trueHeadingDeg > 359 || state.trueHeadingDeg < 2);
  assert.equal(state.quality, "good");
  assert.equal(state.aligned, true);

  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 8,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.aligned, true);

  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 30,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.aligned, false);
});

test("natural-top heading conversion follows the displayed page top edge", () => {
  assert.equal(naturalTopHeadingToDisplayedPageTop(10, 0), 10);
  assert.equal(naturalTopHeadingToDisplayedPageTop(10, 90), 100);
  assert.equal(naturalTopHeadingToDisplayedPageTop(10, 270), 280);
});

test("browser samples classify heading reference and map valid WebKit accuracy", () => {
  const measuredAt = new Date("2026-06-01T12:00:00Z");
  assert.deepEqual(
    headingSampleFromDeviceOrientation(
      {
        alpha: 123,
        beta: 4,
        gamma: 5,
        webkitCompassHeading: 210,
        webkitCompassAccuracy: 12,
      },
      90,
      measuredAt,
    ),
    {
      headingDeg: 210,
      reference: "magnetic",
      measuredAt,
      betaDeg: 4,
      gammaDeg: 5,
      accuracyDeg: 12,
      screenAngleDeg: 90,
    },
  );
  for (const invalidAccuracy of [
    undefined,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    const sample = headingSampleFromDeviceOrientation(
      {
        alpha: 123,
        beta: 4,
        gamma: 5,
        webkitCompassHeading: 210,
        webkitCompassAccuracy: invalidAccuracy,
      },
      0,
      measuredAt,
    );
    assert.equal(sample?.reference, "magnetic");
    assert.equal(sample?.accuracyDeg, undefined);
  }
  assert.deepEqual(
    headingSampleFromDeviceOrientation(
      { alpha: 123, beta: 0, gamma: 0, absolute: true },
      0,
      measuredAt,
    ),
    {
      headingDeg: 237,
      reference: "magnetic",
      measuredAt,
      betaDeg: 0,
      gammaDeg: 0,
      screenAngleDeg: 0,
    },
  );
  assert.equal(
    headingSampleFromDeviceOrientation(
      { alpha: 123, beta: 4, gamma: 5, absolute: false },
      0,
      measuredAt,
    )?.reference,
    "unknown",
  );
  assert.equal(
    headingSampleFromDeviceOrientation(
      { alpha: null, beta: 0, gamma: 0 },
      0,
      measuredAt,
    ),
    null,
  );
});

test("browser samples reject invalid WebKit compass values and reject 360", () => {
  const measuredAt = new Date("2026-06-01T12:00:00Z");
  for (const invalidHeading of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    360,
    361,
  ]) {
    const sample = headingSampleFromDeviceOrientation(
      { alpha: 123, beta: 4, gamma: 5, webkitCompassHeading: invalidHeading },
      0,
      measuredAt,
    );
    assert.equal(sample?.reference, "unknown");
    assert.equal(sample?.headingDeg, 123);
  }
  for (const validHeading of [0, 359.999]) {
    const sample = headingSampleFromDeviceOrientation(
      { alpha: 123, beta: 4, gamma: 5, webkitCompassHeading: validHeading },
      0,
      measuredAt,
    );
    assert.equal(sample?.reference, "magnetic");
    assert.equal(sample?.headingDeg, validHeading);
  }
});

test("browser heading listener ignores ambiguous generic events around an absolute source", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    const fakeWindow = new EventTarget() as EventTarget & {
      screen: { orientation: { angle: number } };
    };
    fakeWindow.screen = { orientation: { angle: 0 } };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const samples: HeadingSample[] = [];
    const remove =
      browserTrueNorthOrientationDependencies.addHeadingListener((sample) => {
        samples.push(sample);
      });

    fakeWindow.dispatchEvent(
      Object.assign(new Event("deviceorientation"), {
        alpha: 40,
        beta: 0,
        gamma: 0,
        absolute: false,
      }),
    );
    fakeWindow.dispatchEvent(
      Object.assign(new Event("deviceorientationabsolute"), {
        alpha: 90,
        beta: 0,
        gamma: 0,
        absolute: true,
      }),
    );
    fakeWindow.dispatchEvent(
      Object.assign(new Event("deviceorientation"), {
        alpha: 50,
        beta: 0,
        gamma: 0,
        absolute: false,
      }),
    );

    assert.equal(samples.length, 1);
    assert.equal(samples[0]?.reference, "magnetic");
    assert.equal(samples[0]?.headingDeg, 270);
    remove();
  } finally {
    if (previousWindow === undefined)
      delete (globalThis as { window?: unknown }).window;
    else Object.defineProperty(globalThis, "window", previousWindow);
  }
});

test("orientation permission requests absolute sensor access", async () => {
  const argumentsSeen: boolean[] = [];
  const request = orientationPermissionRequestFromConstructor({
    requestPermission(absolute) {
      argumentsSeen.push(absolute ?? false);
      return Promise.resolve("granted");
    },
  });
  assert.ok(request);
  assert.equal(await request(), "granted");
  assert.deepEqual(argumentsSeen, [true]);
  assert.equal(orientationPermissionRequestFromConstructor({}), null);
});

test("posture is flat, tilted, or unknown and only flat can align", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 10,
      reference: "true",
      betaDeg: 5,
      gammaDeg: -10,
      accuracyDeg: 5,
    });
  }
  let state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.posture, "flat");
    assert.equal(state.aligned, true);
  }
  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: 45,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  state = controller.getState();
  if (state.status === "active") {
    assert.equal(state.posture, "tilted");
    assert.equal(state.aligned, false);
  }
  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: null,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  state = controller.getState();
  if (state.status === "active") {
    assert.equal(state.posture, "unknown");
    assert.equal(state.aligned, false);
  }
});

test("a first good-accuracy sample cannot claim strong alignment", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();

  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 20,
  });
  let state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.quality, "unknown");
    assert.equal(state.aligned, false);
  }

  fake.emit({
    headingDeg: 10,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 21,
  });
  state = controller.getState();
  if (state.status === "active") {
    assert.equal(state.quality, "limited");
    assert.equal(state.aligned, false);
  }

  for (const accuracyDeg of [undefined, -1, Number.NaN]) {
    fake.emit({
      headingDeg: 10,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg,
    });
    state = controller.getState();
    if (state.status === "active") {
      assert.equal(state.quality, "unknown");
      assert.equal(state.aligned, false);
    }
  }
});

test("a stable heading window becomes good and aligned", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake, { moonTrueAzimuthDeg: 10 });
  controller.start();
  fake.locate();
  await flushPromises();

  for (const headingDeg of [9, 10, 11, 10]) {
    fake.emit({
      headingDeg,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }

  const state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.quality, "good");
    assert.equal(state.aligned, true);
  }
});

test("a full jittering heading window is limited and unaligned", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake, { moonTrueAzimuthDeg: 10 });
  controller.start();
  fake.locate();
  await flushPromises();

  for (const headingDeg of [350, 30, 340, 40]) {
    fake.emit({
      headingDeg,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }

  const state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.quality, "limited");
    assert.equal(state.aligned, false);
  }
});

test("stale callbacks after restart and stop cannot mutate state", async () => {
  const fake = createFakeDependencies({ permission: "pending" });
  const controller = createController(fake);
  controller.start();
  controller.start();
  fake.grantPermission(0);
  fake.locateRequest(0);
  await flushPromises();
  assert.deepEqual(controller.getState(), { status: "requesting" });

  fake.grantPermission(1);
  fake.locateRequest(1);
  await flushPromises();
  assert.equal(controller.getState().status, "acquiring-heading");
  controller.stop();
  fake.emitHeadingRequest(0, { headingDeg: 20, reference: "true" });
  fake.fireTimerRequest(0);
  assert.deepEqual(controller.getState(), { status: "idle" });
});

test("hidden document removes heading listener and visible document reacquires without permission", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  assert.ok(fake.headingListener);
  const permissionCalls = fake.calls.filter(
    (call) => call === "permission",
  ).length;

  fake.hide();
  assert.equal(fake.headingListener, undefined);
  fake.show();
  assert.ok(fake.headingListener);
  assert.equal(controller.getState().status, "acquiring-heading");
  assert.equal(
    fake.calls.filter((call) => call === "permission").length,
    permissionCalls,
  );
});

test("hide and show reset smoothing and heading stability history", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 0,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  const stableState = controller.getState();
  assert.equal(stableState.status, "active");
  if (stableState.status === "active")
    assert.equal(stableState.quality, "good");

  fake.hide();
  fake.show();
  assert.deepEqual(controller.getState(), { status: "acquiring-heading" });

  fake.emitHeadingRequest(0, { headingDeg: 180, reference: "true" });
  fake.fireTimerRequest(0);
  assert.deepEqual(controller.getState(), { status: "acquiring-heading" });

  fake.emitHeadingRequest(1, {
    headingDeg: 100,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  const state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.trueHeadingDeg, 100);
    assert.equal(state.quality, "unknown");
    assert.equal(state.aligned, false);
  }
});

test("screen rotation restarts heading with empty stability history and cleans up", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const controller = createController(fake);
  controller.start();
  fake.locate();
  await flushPromises();
  for (let index = 0; index < 4; index += 1) {
    fake.emit({
      headingDeg: 0,
      reference: "true",
      betaDeg: 0,
      gammaDeg: 0,
      accuracyDeg: 5,
    });
  }
  const stableState = controller.getState();
  assert.equal(stableState.status, "active");
  if (stableState.status === "active")
    assert.equal(stableState.quality, "good");
  const permissionCalls = fake.calls.filter(
    (call) => call === "permission",
  ).length;
  const geolocationCalls = fake.calls.filter(
    (call) => call === "geolocation",
  ).length;
  assert.equal(fake.hasScreenOrientationListener, true);

  fake.rotateScreen();
  assert.deepEqual(controller.getState(), { status: "acquiring-heading" });
  assert.equal(
    fake.calls.filter((call) => call === "permission").length,
    permissionCalls,
  );
  assert.equal(
    fake.calls.filter((call) => call === "geolocation").length,
    geolocationCalls,
  );

  fake.emitHeadingRequest(0, { headingDeg: 180, reference: "true" });
  fake.fireTimerRequest(0);
  assert.deepEqual(controller.getState(), { status: "acquiring-heading" });
  fake.emitHeadingRequest(1, {
    headingDeg: 100,
    reference: "true",
    betaDeg: 0,
    gammaDeg: 0,
    accuracyDeg: 5,
  });
  const state = controller.getState();
  assert.equal(state.status, "active");
  if (state.status === "active") {
    assert.equal(state.trueHeadingDeg, 100);
    assert.equal(state.quality, "unknown");
    assert.equal(state.aligned, false);
  }

  controller.stop();
  assert.equal(fake.hasScreenOrientationListener, false);
});

test("browser screen-orientation adapter uses change with orientationchange fallback", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    const screenOrientation = new EventTarget();
    const modernWindow = new EventTarget() as EventTarget & {
      screen: { orientation?: EventTarget };
    };
    modernWindow.screen = { orientation: screenOrientation };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: modernWindow,
    });
    let modernCalls = 0;
    const removeModern =
      browserTrueNorthOrientationDependencies.addScreenOrientationListener(
        () => {
          modernCalls += 1;
        },
      );
    screenOrientation.dispatchEvent(new Event("change"));
    removeModern();
    screenOrientation.dispatchEvent(new Event("change"));
    assert.equal(modernCalls, 1);

    const legacyWindow = new EventTarget() as EventTarget & {
      screen: { orientation?: EventTarget };
    };
    legacyWindow.screen = {};
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: legacyWindow,
    });
    let legacyCalls = 0;
    const removeLegacy =
      browserTrueNorthOrientationDependencies.addScreenOrientationListener(
        () => {
          legacyCalls += 1;
        },
      );
    legacyWindow.dispatchEvent(new Event("orientationchange"));
    removeLegacy();
    legacyWindow.dispatchEvent(new Event("orientationchange"));
    assert.equal(legacyCalls, 1);
  } finally {
    if (previousWindow === undefined)
      delete (globalThis as { window?: unknown }).window;
    else Object.defineProperty(globalThis, "window", previousWindow);
  }
});

test("hook cleanup is Strict Mode safe and ignores callbacks after unmount", async () => {
  const fake = createFakeDependencies({ permission: "granted" });
  const useOrientation = createUseTrueNorthOrientation(fake.dependencies);
  let latest: ReturnType<typeof useOrientation> | undefined;

  function Harness(): ReactNode {
    latest = useOrientation({
      selectedLatDeg: 51.5,
      selectedLonDeg: -0.12,
      moonTrueAzimuthDeg: 10,
    });
    return null;
  }

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(StrictMode, null, createElement(Harness)));
  });
  assert.ok(latest);
  act(() => latest?.start());
  fake.locate();
  await act(flushPromises);
  assert.ok(fake.headingListener);

  await act(async () => renderer.unmount());
  assert.equal(fake.headingListener, undefined);
  assert.equal(fake.hasVisibilityListener, false);
  assert.equal(fake.hasScreenOrientationListener, false);
  assert.equal(
    fake.calls.filter((call) => call === "visibility-listener-added").length,
    fake.calls.filter((call) => call === "visibility-listener-removed").length,
  );
  assert.equal(
    fake.calls.filter((call) => call === "screen-orientation-listener-added")
      .length,
    fake.calls.filter((call) => call === "screen-orientation-listener-removed")
      .length,
  );
  fake.fireTimers();
});
