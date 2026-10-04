import assert from "node:assert/strict";
import test from "node:test";
import { eclipticPole, OBLIQUITY_DEG } from "./astro.ts";
import { EARTH_DISPLAY_Z_SCALE } from "./earth-map.ts";
import {
  cameraUpForEdgeOnRoll,
  edgeOnRollValueText,
  formatEdgeOnRollDeg,
  rollDegForKey,
  rollDegFromPointer,
  snapEdgeOnRollDeg,
} from "./edge-on-roll.ts";

const CLOSE = 1e-12;
const VIEW_DIRECTION = [-1, 0, 0] as const;
const CELESTIAL_NORTH = [0, 1, 0] as const;

function assertClose(
  actual: number,
  expected: number,
  tolerance = CLOSE,
): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} vs ${expected}`,
  );
}

function assertVecClose(
  actual: readonly number[],
  expected: readonly number[],
  tolerance = CLOSE,
): void {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assertClose(actual[index]!, expected[index]!, tolerance);
  }
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index]!, 0);
}

function cross(
  a: readonly number[],
  b: readonly number[],
): [number, number, number] {
  return [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
}

test("zero roll returns normalized celestial north in the camera plane", () => {
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    0,
  );

  assertVecClose(up, [0, 1, 0]);
  assertClose(Math.hypot(...up), 1);
});

test("maximum roll returns normalized displayed ecliptic pole in the camera plane", () => {
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    OBLIQUITY_DEG,
  );
  const obliquityRad = (OBLIQUITY_DEG * Math.PI) / 180;

  assertVecClose(up, [0, Math.cos(obliquityRad), Math.sin(obliquityRad)]);
  assertClose(Math.hypot(...up), 1);
});

test("half roll produces the halfway angular orientation", () => {
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    OBLIQUITY_DEG / 2,
  );
  const halfObliquityRad = (OBLIQUITY_DEG * Math.PI) / 360;

  assertVecClose(up, [
    0,
    Math.cos(halfObliquityRad),
    Math.sin(halfObliquityRad),
  ]);
});

test("display reflection determines the signed roll direction", () => {
  const modelPole = [0, 1, -1] as const;
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    modelPole,
    OBLIQUITY_DEG,
  );
  const reflectedPole = [
    modelPole[0],
    modelPole[1],
    modelPole[2] * EARTH_DISPLAY_Z_SCALE,
  ];
  const length = Math.hypot(...reflectedPole);

  assertVecClose(
    up,
    reflectedPole.map((component) => component / length),
  );
  assert.ok(up[2] > 0, `expected reflected roll toward +Z, got ${up[2]}`);
});

test("equator is horizontal at zero roll", () => {
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    0,
  );
  const displayedEquatorEdge = cross(VIEW_DIRECTION, CELESTIAL_NORTH);

  assertClose(dot(displayedEquatorEdge, up), 0);
});

test("ecliptic is horizontal at maximum roll", () => {
  const pole = eclipticPole();
  const displayedPole = [
    pole[0],
    pole[1],
    pole[2] * EARTH_DISPLAY_Z_SCALE,
  ] as const;
  const up = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    pole,
    OBLIQUITY_DEG,
  );
  const displayedEclipticEdge = cross(VIEW_DIRECTION, displayedPole);

  assertClose(dot(displayedEclipticEdge, up), 0);
});

test("production edge preset levels equator at zero and ecliptic at maximum", () => {
  const theta = 1.57;
  const phi = 1.57;
  const radius = 6.6;
  const cameraPosition = [
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta),
  ] as const;
  const positionLength = Math.hypot(...cameraPosition);
  const viewingDirection = cameraPosition.map(
    (component) => -component / positionLength,
  ) as [number, number, number];
  const pole = eclipticPole();
  const displayedPole = [
    pole[0],
    pole[1],
    pole[2] * EARTH_DISPLAY_Z_SCALE,
  ] as const;
  const equatorEdge = cross(viewingDirection, CELESTIAL_NORTH);
  const eclipticEdge = cross(viewingDirection, displayedPole);

  const equatorLevelUp = cameraUpForEdgeOnRoll(
    viewingDirection,
    CELESTIAL_NORTH,
    pole,
    0,
  );
  const eclipticLevelUp = cameraUpForEdgeOnRoll(
    viewingDirection,
    CELESTIAL_NORTH,
    pole,
    OBLIQUITY_DEG,
  );

  assertClose(dot(equatorEdge, equatorLevelUp), 0);
  assertClose(dot(eclipticEdge, eclipticLevelUp), 0);
});

test("camera-up derivation does not mutate input vectors", () => {
  const view: [number, number, number] = [-1, 0, 0];
  const north: [number, number, number] = [0, 1, 0];
  const pole = eclipticPole();
  const originals = [view.slice(), north.slice(), pole.slice()];

  cameraUpForEdgeOnRoll(view, north, pole, 12);

  assert.deepEqual(view, originals[0]);
  assert.deepEqual(north, originals[1]);
  assert.deepEqual(pole, originals[2]);
});

test("roll clamps below zero and above maximum", () => {
  const below = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    -10,
  );
  const above = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    OBLIQUITY_DEG + 10,
  );
  const atZero = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    0,
  );
  const atMaximum = cameraUpForEdgeOnRoll(
    VIEW_DIRECTION,
    CELESTIAL_NORTH,
    eclipticPole(),
    OBLIQUITY_DEG,
  );

  assertVecClose(below, atZero);
  assertVecClose(above, atMaximum);
});

test("degenerate vectors return a finite normalized fallback", () => {
  const cases = [
    {
      view: [0, 0, 0] as const,
      up: cameraUpForEdgeOnRoll([0, 0, 0], [0, 0, 0], [0, 0, 0], 12),
    },
    {
      view: [0, 1, 0] as const,
      up: cameraUpForEdgeOnRoll([0, 1, 0], [0, 1, 0], [0, 1, 0], 12),
    },
    {
      view: [1, 0, 0] as const,
      up: cameraUpForEdgeOnRoll([1, 0, 0], [0, 1, 0], [1, 0, 0], 12),
    },
  ];

  for (const { view, up } of cases) {
    assert.ok(
      up.every(Number.isFinite),
      `expected finite vector, got ${up.join(", ")}`,
    );
    assertClose(Math.hypot(...up), 1);
    if (Math.hypot(...view) > 0) {
      assertClose(up[0] * view[0] + up[1] * view[1] + up[2] * view[2], 0);
    }
  }
});

test("pointer bearing converts to a clamped roll value", () => {
  const centre = [100, 100] as const;
  const radius = 50;
  const pointAt = (angleDeg: number) => {
    const angle = (angleDeg * Math.PI) / 180;
    return [
      centre[0] + Math.sin(angle) * radius,
      centre[1] - Math.cos(angle) * radius,
    ] as const;
  };

  assertClose(rollDegFromPointer(centre, pointAt(12)), 12);
  assert.equal(rollDegFromPointer(centre, pointAt(-20)), 0);
  assert.equal(rollDegFromPointer(centre, pointAt(80)), OBLIQUITY_DEG);
});

test("release snapping uses a 1.5 degree endpoint threshold", () => {
  assert.equal(snapEdgeOnRollDeg(-2), 0);
  assert.equal(snapEdgeOnRollDeg(1.5), 0);
  assert.equal(snapEdgeOnRollDeg(1.5001), 1.5001);
  assert.equal(snapEdgeOnRollDeg(OBLIQUITY_DEG - 1.5), OBLIQUITY_DEG);
  assert.equal(
    snapEdgeOnRollDeg(OBLIQUITY_DEG - 1.5001),
    OBLIQUITY_DEG - 1.5001,
  );
  assert.equal(snapEdgeOnRollDeg(OBLIQUITY_DEG + 2), OBLIQUITY_DEG);
});

test("keyboard controls step by 0.5 degrees and support Home and End", () => {
  assert.equal(rollDegForKey(12, "ArrowLeft"), 11.5);
  assert.equal(rollDegForKey(12, "ArrowDown"), 11.5);
  assert.equal(rollDegForKey(12, "ArrowRight"), 12.5);
  assert.equal(rollDegForKey(12, "ArrowUp"), 12.5);
  assert.equal(rollDegForKey(12, "Home"), 0);
  assert.equal(rollDegForKey(12, "End"), OBLIQUITY_DEG);
  assert.equal(rollDegForKey(0, "ArrowDown"), 0);
  assert.equal(rollDegForKey(OBLIQUITY_DEG, "ArrowUp"), OBLIQUITY_DEG);
  assert.equal(rollDegForKey(12, "Enter"), null);
});

test("angle display formatting uses endpoint and intermediate precision", () => {
  assert.equal(formatEdgeOnRollDeg(0), "0°");
  assert.equal(formatEdgeOnRollDeg(12), "12.0°");
  assert.equal(formatEdgeOnRollDeg(OBLIQUITY_DEG), "23.4°");
});

test("accessible value text explains endpoint and intermediate level conditions", () => {
  assert.equal(edgeOnRollValueText(0), "0 degrees, equator horizontal");
  assert.equal(
    edgeOnRollValueText(12),
    "12.0 degrees between equator-level and ecliptic-level",
  );
  assert.equal(
    edgeOnRollValueText(OBLIQUITY_DEG),
    "23.4 degrees, ecliptic horizontal",
  );
});
