import assert from "node:assert/strict";
import test from "node:test";
import { ALTITUDE_DIAGRAM, AZIMUTH_DIAGRAM } from "./local-sky-diagrams.ts";

function angleAboveHorizontalDeg(dx: number, dy: number): number {
  return (Math.atan2(-dy, dx) * 180) / Math.PI;
}

function azimuthDeg(dx: number, dy: number): number {
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

test("altitude diagram measures upward from the local horizontal", () => {
  const { observer, moon, altitudeDeg } = ALTITUDE_DIAGRAM;
  const dx = moon.x - observer.x;
  const dy = moon.y - observer.y;

  assert.ok(moon.y < observer.y);
  assert.ok(Math.abs(angleAboveHorizontalDeg(dx, dy) - altitudeDeg) < 1e-9);
});

test("azimuth diagram measures clockwise from true north", () => {
  const { centre, moonDirection, azimuthDeg: expected } = AZIMUTH_DIAGRAM;
  const dx = moonDirection.x - centre.x;
  const dy = moonDirection.y - centre.y;

  assert.ok(Math.abs(azimuthDeg(dx, dy) - expected) < 1e-9);
  assert.deepEqual(AZIMUTH_DIAGRAM.cardinals, {
    north: "N · 0°",
    east: "E · 90°",
    south: "S · 180°",
    west: "W · 270°",
  });
});
