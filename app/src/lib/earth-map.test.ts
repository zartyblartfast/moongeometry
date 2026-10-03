import assert from "node:assert/strict";
import test from "node:test";
import { ephemerisAstronomyProvider } from "./astronomy/ephemeris-provider.ts";
import {
  EARTH_DISPLAY_Z_SCALE,
  EARTH_MESH_Y_ROTATION_SIGN,
  angularSeparationDeg,
  earthMapPixel,
  earthMeshYRotation,
  earthSurfaceUnit,
  observerOverlayScaleForCameraRadius,
  wrapLongitude180,
} from "./earth-map.ts";

const CLOSE = 1e-12;

function assertClose(actual: number, expected: number, tolerance = CLOSE): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}

test("wrapLongitude180 uses a half-open antimeridian seam", () => {
  assert.equal(wrapLongitude180(0), 0);
  assert.equal(wrapLongitude180(179), 179);
  assert.equal(wrapLongitude180(-179), -179);
  assert.equal(wrapLongitude180(180), -180);
  assert.equal(wrapLongitude180(-180), -180);
  assert.equal(wrapLongitude180(540), -180);
  assert.equal(wrapLongitude180(-540), -180);
  assert.equal(wrapLongitude180(721), 1);
});

test("earthMapPixel projects standard west-left east-right source coordinates", () => {
  const width = 360;
  const height = 180;

  assert.deepEqual(earthMapPixel(0, 0, width, height), { x: 180, y: 90 });
  assert.deepEqual(earthMapPixel(0, 90, width, height), { x: 180, y: 0 });
  assert.deepEqual(earthMapPixel(0, -90, width, height), { x: 180, y: 179 });
  assert.deepEqual(earthMapPixel(-179.999, 0, width, height), { x: 0, y: 90 });
  assert.deepEqual(earthMapPixel(179.999, 0, width, height), { x: 359, y: 90 });
  assert.deepEqual(earthMapPixel(-180, 0, width, height), { x: 0, y: 90 });
  assert.deepEqual(earthMapPixel(180, 0, width, height), { x: 0, y: 90 });
  assert.deepEqual(earthMapPixel(0, 51.5, width, height), { x: 180, y: 38 });
  assert.deepEqual(earthMapPixel(151, -33.9, width, height), { x: 331, y: 123 });
  assert.deepEqual(earthMapPixel(0, 120, width, height), { x: 180, y: 0 });
  assert.deepEqual(earthMapPixel(0, -120, width, height), { x: 180, y: 179 });
});

test("Earth mesh rotation has one explicit sign after horizontal texture correction", () => {
  assert.equal(EARTH_MESH_Y_ROTATION_SIGN, -1);
  assertClose(earthMeshYRotation(0.75), -0.75);
  assertClose(earthMeshYRotation(-1.25), 1.25);
});

test("displayed Earth keeps east to the right when north is up", () => {
  assert.equal(EARTH_DISPLAY_Z_SCALE, -1);
  const outward = earthSurfaceUnit(0, 0, 0);
  const eastPoint = earthSurfaceUnit(0, 0.001, 0);
  const northPoint = earthSurfaceUnit(0.001, 0, 0);
  const east = eastPoint.map((value, index) => value - outward[index]!) as [number, number, number];
  const north = northPoint.map((value, index) => value - outward[index]!) as [number, number, number];
  const eastCrossNorth = [
    east[1] * north[2] - east[2] * north[1],
    east[2] * north[0] - east[0] * north[2],
    east[0] * north[1] - east[1] * north[0],
  ];
  const handedness = eastCrossNorth.reduce((sum, value, index) => sum + value * outward[index]!, 0);

  assert.ok(handedness > 0, `east × north must point outward, got ${handedness}`);
});

test("earthSurfaceUnit aligns displayed map geography with reflected observer zenith", () => {
  const instants = [Date.UTC(2024, 0, 15, 3, 20), Date.UTC(2026, 9, 3, 18, 45)];
  const locations = [
    { name: "Greenwich equator", lat: 0, lon: 0 },
    { name: "London", lat: 51.5, lon: -0.13 },
    { name: "Sydney", lat: -33.9, lon: 151 },
    { name: "western longitude", lat: 34.05, lon: -118.25 },
    { name: "high latitude", lat: 69.65, lon: 18.96 },
  ];

  for (const instant of instants) {
    const greenwich = ephemerisAstronomyProvider.observerZenith(instant, 0, 0);
    const greenwichSiderealAngle = Math.atan2(greenwich[2], greenwich[0]);

    for (const location of locations) {
      const actual = earthSurfaceUnit(location.lat, location.lon, greenwichSiderealAngle);
      const observer = ephemerisAstronomyProvider.observerZenith(instant, location.lat, location.lon);
      const expected: [number, number, number] = [observer[0], observer[1], -observer[2]];
      const separation = angularSeparationDeg(actual, expected);
      assert.ok(separation < 0.1, `${location.name} at ${new Date(instant).toISOString()}: ${separation}°`);
    }
  }
});

test("observer overlay scales clamp and interpolate figure and plate independently", () => {
  const minimum = {
    figure: 0.012 / 0.045,
    plate: 0.045 / 0.19,
  };

  assert.deepEqual(observerOverlayScaleForCameraRadius(1.5), minimum);
  assert.deepEqual(observerOverlayScaleForCameraRadius(1), minimum);
  assert.deepEqual(observerOverlayScaleForCameraRadius(2.25), { figure: 1, plate: 1 });
  assert.deepEqual(observerOverlayScaleForCameraRadius(10), { figure: 1, plate: 1 });

  const halfway = observerOverlayScaleForCameraRadius(1.875);
  assertClose(halfway.figure, minimum.figure + (1 - minimum.figure) / 2);
  assertClose(halfway.plate, minimum.plate + (1 - minimum.plate) / 2);
  assert.ok(halfway.figure > minimum.figure && halfway.figure < 1);
  assert.ok(halfway.plate > minimum.plate && halfway.plate < 1);
  assert.notEqual(halfway.figure, halfway.plate);
});
