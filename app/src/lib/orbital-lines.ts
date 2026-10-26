import { DoubleSide } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { Vec3 } from "./astro.ts";

/** Primary reference curves only; keep axes and construction guides thin. */
export function createOrbitalLine(
  color: string,
  alphaToCoverage = true,
): Line2 {
  return new Line2(
    new LineGeometry(),
    new LineMaterial({
      color,
      linewidth: 1.25,
      worldUnits: false,
      alphaToCoverage,
      // The scene reflects Z. Screen-space quads otherwise get face-culled.
      side: DoubleSide,
      depthTest: true,
      depthWrite: true,
    }),
  );
}

export function setOrbitalLoop(
  line: Line2,
  units: Vec3[],
  radius: number,
): void {
  const positions = new Float32Array((units.length + 1) * 3);
  units.forEach((point, index) => {
    positions[index * 3] = point[0] * radius;
    positions[index * 3 + 1] = point[1] * radius;
    positions[index * 3 + 2] = point[2] * radius;
  });
  positions.set(positions.subarray(0, 3), units.length * 3);
  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  line.geometry.dispose();
  line.geometry = geometry;
}

export function disposeOrbitalLine(line: Line2): void {
  line.geometry.dispose();
  line.material.dispose();
}
