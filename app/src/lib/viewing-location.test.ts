import assert from "node:assert/strict";
import test from "node:test";
import { locationMemoryValue } from "./location-memory.ts";
import {
  initialViewingLocationSource,
  roundDeviceLocation,
  requestCurrentDevicePosition,
  transitionViewingLocationSource,
} from "./viewing-location.ts";

test("device locations are rounded to privacy precision with finite range checks", () => {
  assert.deepEqual(roundDeviceLocation(51.501234, -0.125876), {
    latDeg: 51.501,
    lonDeg: -0.126,
  });
  assert.deepEqual(roundDeviceLocation(-0.0004, -0.0004), {
    latDeg: 0,
    lonDeg: 0,
  });
  for (const [latDeg, lonDeg] of [
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [90.0001, 0],
    [0, -180.0001],
  ]) {
    assert.equal(roundDeviceLocation(latDeg, lonDeg), null);
  }
});

test("geolocation success makes the one viewing location current-device and requests orientation stop", async () => {
  const result = await requestCurrentDevicePosition({
    isSecureContext: () => true,
    getCurrentPosition(success) {
      success({ latitude: 51.501234, longitude: -0.125876 });
    },
  });
  assert.deepEqual(result, {
    ok: true,
    location: { latDeg: 51.501, lonDeg: -0.126 },
  });

  const requesting = transitionViewingLocationSource(
    initialViewingLocationSource,
    {
      type: "request",
    },
  );
  assert.equal(requesting.state.status, "requesting");
  assert.equal(requesting.stopOrientation, false);

  const success = transitionViewingLocationSource(requesting.state, {
    type: "success",
  });
  assert.deepEqual(success.state, { status: "current-device" });
  assert.equal(success.stopOrientation, true);
});

test("the localStorage location payload cannot retain extra device precision", async () => {
  const result = await requestCurrentDevicePosition({
    isSecureContext: () => true,
    getCurrentPosition(success) {
      success({ latitude: 40.712776, longitude: -74.005974 });
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const payload = JSON.stringify(
    locationMemoryValue(
      result.location.latDeg,
      result.location.lonDeg,
      2,
      null,
    ),
  );
  assert.equal(payload, '{"lat":40.713,"lon":-74.006,"spinHours":2}');
  assert.doesNotMatch(payload, /40\.712776|-74\.005974/);
});

test("invalid browser coordinates are rejected instead of rounded into range", async () => {
  assert.deepEqual(
    await requestCurrentDevicePosition({
      isSecureContext: () => true,
      getCurrentPosition(success) {
        success({ latitude: 91, longitude: 0 });
      },
    }),
    { ok: false, reason: "unavailable" },
  );
});

test("geolocation failure preserves coordinates and leaves orientation unavailable", async () => {
  const priorLocation = { latDeg: 40.7, lonDeg: -74 };
  const result = await requestCurrentDevicePosition({
    isSecureContext: () => true,
    getCurrentPosition(_success, error) {
      error({ code: 1 });
    },
  });
  assert.deepEqual(result, { ok: false, reason: "denied" });
  assert.deepEqual(priorLocation, { latDeg: 40.7, lonDeg: -74 });

  const failed = transitionViewingLocationSource(
    { status: "requesting" },
    { type: "failure", reason: result.reason },
  );
  assert.deepEqual(failed.state, { status: "unavailable", reason: "denied" });
  assert.equal(failed.stopOrientation, false);
});

test("search or manual coordinate changes clear current-device source and request orientation stop", () => {
  for (const change of ["search", "manual"] as const) {
    const result = transitionViewingLocationSource(
      { status: "current-device" },
      { type: "external-change", change },
    );
    assert.deepEqual(result.state, { status: "idle" });
    assert.equal(result.stopOrientation, true);
  }
});

test("current-location request reports insecure and unavailable browser support inline", async () => {
  assert.deepEqual(
    await requestCurrentDevicePosition({
      isSecureContext: () => false,
      getCurrentPosition() {
        throw new Error("must not be called");
      },
    }),
    { ok: false, reason: "insecure-context" },
  );
  assert.deepEqual(
    await requestCurrentDevicePosition({
      isSecureContext: () => true,
      getCurrentPosition: null,
    }),
    { ok: false, reason: "unavailable" },
  );
});
