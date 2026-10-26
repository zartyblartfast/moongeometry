import assert from "node:assert/strict";
import test from "node:test";
import {
  deviceLocationMatchesSelected,
  displayAzimuth,
  haversineDistanceKm,
  isAlignedWithHysteresis,
  magneticToTrueHeading,
  normalize360,
  smoothCircularHeading,
  wrap180,
} from "./true-north-orientation.ts";

test("normalize360 wraps angles into a north-inclusive revolution", () => {
  assert.equal(normalize360(0), 0);
  assert.equal(normalize360(360), 0);
  assert.equal(normalize360(-1), 359);
  assert.equal(normalize360(721), 1);
});

test("wrap180 returns the shortest signed turn", () => {
  assert.equal(wrap180(0), 0);
  assert.equal(wrap180(181), -179);
  assert.equal(wrap180(-181), 179);
  assert.equal(wrap180(180), -180);
});

test("magneticToTrueHeading adds east-positive declination", () => {
  assert.equal(magneticToTrueHeading(350, 15), 5);
  assert.equal(magneticToTrueHeading(10, -20), 350);
});

test("displayAzimuth rotates true azimuth by the true heading", () => {
  assert.equal(displayAzimuth(10, 350), 20);
  assert.equal(displayAzimuth(350, 10), 340);
});

test("alignment hysteresis enters within 3 degrees and remains until beyond 6", () => {
  assert.equal(isAlignedWithHysteresis(3, false), true);
  assert.equal(isAlignedWithHysteresis(-3.01, false), false);
  assert.equal(isAlignedWithHysteresis(6, true), true);
  assert.equal(isAlignedWithHysteresis(-6.01, true), false);
  assert.equal(isAlignedWithHysteresis(359, false), true);
});

test("circular heading smoothing crosses north by the shortest turn", () => {
  assert.equal(smoothCircularHeading(null, 361, 0.25), 1);
  assert.equal(smoothCircularHeading(359, 1, 0.5), 0);
  assert.equal(smoothCircularHeading(1, 359, 0.5), 0);
});

test("haversineDistanceKm measures great-circle distance across the antimeridian", () => {
  assert.ok(Math.abs(haversineDistanceKm(0, 0, 0, 1) - 111.195) < 0.001);
  assert.ok(
    Math.abs(haversineDistanceKm(0, 179.5, 0, -179.5) - 111.195) < 0.001,
  );
  assert.equal(haversineDistanceKm(51.5, -0.1, 51.5, -0.1), 0);
});

test("device location matching uses the larger of 5 km and twice reported accuracy", () => {
  assert.equal(deviceLocationMatchesSelected(0, 0, 100, 0.044, 0), true);
  assert.equal(deviceLocationMatchesSelected(0, 0, 100, 0.046, 0), false);
  assert.equal(deviceLocationMatchesSelected(0, 0, 6000, 0.1, 0), true);
  assert.equal(deviceLocationMatchesSelected(0, 0, 6000, 0.11, 0), false);
});

test("orientation helpers reject non-finite and invalid inputs", () => {
  assert.throws(() => normalize360(Number.NaN), RangeError);
  assert.throws(
    () => magneticToTrueHeading(0, Number.POSITIVE_INFINITY),
    RangeError,
  );
  assert.throws(() => displayAzimuth(Number.NEGATIVE_INFINITY, 0), RangeError);
  assert.throws(() => smoothCircularHeading(0, 1, 1.01), RangeError);
  assert.throws(() => haversineDistanceKm(91, 0, 0, 0), RangeError);
  assert.throws(
    () => deviceLocationMatchesSelected(0, 0, -1, 0, 0),
    RangeError,
  );
});
