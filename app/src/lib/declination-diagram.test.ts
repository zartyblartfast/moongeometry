import assert from "node:assert/strict";
import test from "node:test";
import { DECLINATION_DIAGRAM } from "./declination-diagram.ts";

function angleDeg(x: number, y: number): number {
  return (Math.atan2(-y, x) * 180) / Math.PI;
}

test("declination diagram places the Moon north of the celestial equator", () => {
  const { centre, moon, declinationDeg } = DECLINATION_DIAGRAM;
  const dx = moon.x - centre.x;
  const dy = moon.y - centre.y;

  assert.ok(moon.y < centre.y);
  assert.ok(Math.abs(angleDeg(dx, dy) - declinationDeg) < 1e-9);
});

test("declination diagram labels the equator as zero and explains both signs", () => {
  assert.equal(DECLINATION_DIAGRAM.equatorLabel, "Celestial equator · 0°");
  assert.equal(DECLINATION_DIAGRAM.northLabel, "+ declination · north");
  assert.equal(DECLINATION_DIAGRAM.southLabel, "− declination · south");
});

test("declination symbol sits clear of the ray and inside the angle arc", () => {
  const { centre, angleLabel, angleArcRadius, declinationDeg } =
    DECLINATION_DIAGRAM;
  const dx = angleLabel.x - centre.x;
  const dy = angleLabel.y - centre.y;

  assert.ok(Math.hypot(dx, dy) < angleArcRadius);
  assert.ok(Math.abs(angleDeg(dx, dy) - declinationDeg / 2) < 1e-9);
});
