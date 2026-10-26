import assert from "node:assert/strict";
import test from "node:test";
import { DoubleSide, Vector4 } from "three";
import {
  createOrbitalLine,
  setOrbitalLoop,
  disposeOrbitalLine,
} from "./orbital-lines.ts";
import { hoopPoints } from "./astro.ts";
import { palette } from "./palette.ts";

test("coverage antialiasing can be disabled when the WebGL context has no MSAA", () => {
  const line = createOrbitalLine(palette.gold, false);
  assert.equal(line.material.alphaToCoverage, false);
  assert.equal(line.material.linewidth, 1.25);
  disposeOrbitalLine(line);
});

test("primary orbital lines use equal restrained CSS widths and retain colours/depth", () => {
  for (const color of [palette.equator, palette.gold, palette.silver]) {
    const line = createOrbitalLine(color);
    assert.equal(line.isLine2, true);
    assert.equal(line.material.linewidth, 1.25);
    assert.equal(line.material.worldUnits, false);
    assert.equal(line.material.color.getHexString(), color.slice(1));
    assert.equal(line.material.depthTest, true);
    assert.equal(line.material.depthWrite, true);
    assert.equal(line.material.transparent, false);
    assert.equal(line.material.opacity, 1);
    assert.equal(line.material.alphaToCoverage, true);
    // Screen-space quads must survive the scene's negative-Z reflection.
    assert.equal(line.material.side, DoubleSide);
    assert.equal(line.renderOrder, 0);
    disposeOrbitalLine(line);
  }
});

test("wide loops retain every existing orbital point, radius, and closing segment", () => {
  for (const kind of ["equator", "ecliptic", "moon"] as const) {
    const line = createOrbitalLine(palette.gold);
    const points = hoopPoints(kind, 100, kind === "moon" ? 160 : 128);
    setOrbitalLoop(line, points, 2.25);
    const starts = line.geometry.getAttribute("instanceStart");
    const ends = line.geometry.getAttribute("instanceEnd");
    assert.equal(starts.count, points.length);
    assert.equal(ends.count, points.length);
    for (let i = 0; i < points.length; i += 1) {
      for (const [attribute, point] of [
        [starts, points[i]],
        [ends, points[(i + 1) % points.length]],
      ] as const) {
        assert.deepEqual(
          [attribute.getX(i), attribute.getY(i), attribute.getZ(i)],
          Array.from(new Float32Array(point.map((v) => v * 2.25))),
        );
      }
    }
    disposeOrbitalLine(line);
  }
});

test("replacing orbital points disposes old geometry and cleanup releases final resources", () => {
  const line = createOrbitalLine(palette.silver);
  let oldDisposed = 0;
  line.geometry.addEventListener("dispose", () => oldDisposed++);
  setOrbitalLoop(line, hoopPoints("moon", 100, 160), 2.25);
  assert.equal(oldDisposed, 1);
  const previous = line.geometry;
  let previousDisposed = 0;
  previous.addEventListener("dispose", () => previousDisposed++);
  setOrbitalLoop(line, hoopPoints("moon", 101, 160), 2.25);
  assert.equal(previousDisposed, 1);
  assert.notEqual(line.geometry, previous);
  let geometryDisposed = 0;
  let materialDisposed = 0;
  line.geometry.addEventListener("dispose", () => geometryDisposed++);
  line.material.addEventListener("dispose", () => materialDisposed++);
  disposeOrbitalLine(line);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
});

test("line resolution follows the renderer's CSS viewport on every draw", () => {
  const line = createOrbitalLine(palette.equator);
  for (const [width, height] of [
    [731, 388],
    [360, 320],
    [900, 500],
  ]) {
    // Exercise the actual addon callback, not a separate resolution helper.
    Reflect.apply(line.onBeforeRender, line, [
      {
        getViewport(target: Vector4) {
          return target.set(0, 0, width, height);
        },
      },
    ]);
    assert.deepEqual(line.material.resolution.toArray(), [width, height]);
    assert.equal(line.material.linewidth, 1.25);
  }
  disposeOrbitalLine(line);
});
