import type { Vec3 } from "./astro.ts";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MIN_CAMERA_RADIUS = 1.5;
const FULL_SCALE_CAMERA_RADIUS = 2.25;
const MIN_FIGURE_SCALE = 0.012 / 0.045;
const MIN_PLATE_SCALE = 0.045 / 0.19;

export type EarthMapPixel = {
  x: number;
  y: number;
};

export type ObserverOverlayScale = {
  figure: number;
  plate: number;
};

/** Wraps degrees to the half-open geographic interval [-180, +180). */
export function wrapLongitude180(lonDeg: number): number {
  return ((lonDeg + 180) % 360 + 360) % 360 - 180;
}

/**
 * Projects geographic degrees into an unmirrored equirectangular source image:
 * west is left, east is right, north is top, and south is bottom.
 */
export function earthMapPixel(lonDeg: number, latDeg: number, width: number, height: number): EarthMapPixel {
  const wrappedLon = wrapLongitude180(lonDeg);
  const u = (wrappedLon + 180) / 360;
  const v = Math.min(1, Math.max(0, (90 - latDeg) / 180));

  return {
    x: Math.min(width - 1, Math.max(0, Math.floor(u * width))),
    y: Math.min(height - 1, Math.max(0, Math.floor(v * height))),
  };
}

/**
 * Three.js positive Y rotation sends local +X toward -Z. After horizontally
 * correcting SphereGeometry's UV sampling, local geographic east is +Z, so
 * the mesh rotation is the negative Greenwich sidereal angle.
 */
export const EARTH_MESH_Y_ROTATION_SIGN = -1;

/** Converts a Greenwich sidereal angle in radians to mesh rotation.y radians. */
export function earthMeshYRotation(greenwichSiderealAngle: number): number {
  return EARTH_MESH_Y_ROTATION_SIGN * greenwichSiderealAngle;
}

/**
 * Returns the geographic surface unit vector in the app world frame.
 *
 * Inputs: latitude/longitude in degrees and Greenwich sidereal angle in
 * radians. Axes are +X at right ascension 0, +Y north, and +Z toward increasing
 * right ascension. The result models the runtime horizontal image correction,
 * then applies earthMeshYRotation(), matching the transform required by the
 * Three.js Earth mesh.
 */
export function earthSurfaceUnit(latDeg: number, lonDeg: number, greenwichSiderealAngle: number): Vec3 {
  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;
  const cosLat = Math.cos(lat);

  // Corrected local geography: longitude increases from +X toward +Z.
  const localX = cosLat * Math.cos(lon);
  const localY = Math.sin(lat);
  const localZ = cosLat * Math.sin(lon);
  const rotation = earthMeshYRotation(greenwichSiderealAngle);
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);

  // Three.js right-handed Y-axis rotation.
  return [
    cosRotation * localX + sinRotation * localZ,
    localY,
    -sinRotation * localX + cosRotation * localZ,
  ];
}

/** Returns the smaller angular separation between two vectors, in degrees. */
export function angularSeparationDeg(a: readonly number[], b: readonly number[]): number {
  const aLength = Math.hypot(...a);
  const bLength = Math.hypot(...b);
  const dot = a.reduce((sum, component, index) => sum + component * (b[index] ?? 0), 0);
  const cosine = Math.min(1, Math.max(-1, dot / (aLength * bLength)));
  return Math.acos(cosine) * RAD_TO_DEG;
}

/** Linearly shrinks the observer figure and plate independently during close zoom. */
export function observerOverlayScaleForCameraRadius(cameraRadius: number): ObserverOverlayScale {
  const interpolation = Math.min(
    1,
    Math.max(0, (cameraRadius - MIN_CAMERA_RADIUS) / (FULL_SCALE_CAMERA_RADIUS - MIN_CAMERA_RADIUS)),
  );

  return {
    figure: MIN_FIGURE_SCALE + (1 - MIN_FIGURE_SCALE) * interpolation,
    plate: MIN_PLATE_SCALE + (1 - MIN_PLATE_SCALE) * interpolation,
  };
}
