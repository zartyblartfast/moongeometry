import { OBLIQUITY_DEG, type Vec3 } from "./astro.ts";
import { EARTH_DISPLAY_Z_SCALE } from "./earth-map.ts";

const ENDPOINT_SNAP_DEG = 1.5;
const KEYBOARD_STEP_DEG = 0.5;
const VECTOR_EPSILON = 1e-12;

export type Vec3Like = readonly [number, number, number];
export type Point2Like = readonly [number, number];
export type CameraUpViewMode = "oblique" | "edge" | "north" | "free";

/** Preserves the live camera roll only while orbiting freely; snap modes reset north-up. */
export function cameraUpForViewMode(
  viewMode: CameraUpViewMode,
  currentCameraUp: Vec3Like,
  edgeCameraUp: Vec3Like,
): Vec3 {
  if (viewMode === "free") return [...currentCameraUp];
  if (viewMode === "edge") return [...edgeCameraUp];
  return [0, 1, 0];
}

export function clampEdgeOnRollDeg(rollDeg: number): number {
  return Math.min(OBLIQUITY_DEG, Math.max(0, rollDeg));
}

export function snapEdgeOnRollDeg(rollDeg: number): number {
  const clamped = clampEdgeOnRollDeg(rollDeg);
  if (clamped <= ENDPOINT_SNAP_DEG) return 0;
  if (clamped >= OBLIQUITY_DEG - ENDPOINT_SNAP_DEG) return OBLIQUITY_DEG;
  return clamped;
}

export function rollDegForKey(rollDeg: number, key: string): number | null {
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      return clampEdgeOnRollDeg(rollDeg - KEYBOARD_STEP_DEG);
    case "ArrowRight":
    case "ArrowUp":
      return clampEdgeOnRollDeg(rollDeg + KEYBOARD_STEP_DEG);
    case "Home":
      return 0;
    case "End":
      return OBLIQUITY_DEG;
    default:
      return null;
  }
}

export function formatEdgeOnRollDeg(rollDeg: number): string {
  const clamped = clampEdgeOnRollDeg(rollDeg);
  return clamped === 0 ? "Roll 0°" : `Roll ${clamped.toFixed(1)}°`;
}

export function edgeOnRollValueText(rollDeg: number): string {
  const clamped = clampEdgeOnRollDeg(rollDeg);
  if (clamped === 0) return "Camera roll 0 degrees; equator horizontal";
  const degrees = clamped.toFixed(1);
  if (clamped === OBLIQUITY_DEG)
    return `Camera roll ${degrees} degrees; ecliptic horizontal`;
  return `Camera roll ${degrees} degrees toward ecliptic horizontal`;
}

/** Converts a CSS-pixel pointer bearing clockwise from screen-up into bounded roll. */
export function rollDegFromPointer(
  centre: Point2Like,
  pointer: Point2Like,
): number {
  const deltaX = pointer[0] - centre[0];
  const deltaY = pointer[1] - centre[1];
  if (Math.hypot(deltaX, deltaY) <= VECTOR_EPSILON) return 0;
  return clampEdgeOnRollDeg((Math.atan2(deltaX, -deltaY) * 180) / Math.PI);
}

function dot(a: Vec3Like, b: Vec3Like): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3Like, b: Vec3Like): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalizeOrNull(vector: Vec3Like): Vec3 | null {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length <= VECTOR_EPSILON) return null;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function normalize(vector: Vec3Like): Vec3 {
  return normalizeOrNull(vector) ?? [0, 1, 0];
}

function perpendicularFallback(view: Vec3Like): Vec3 {
  const reference: Vec3 = Math.abs(view[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(view, reference));
}

function displayVector(vector: Vec3Like): Vec3 {
  return [vector[0], vector[1], vector[2] * EARTH_DISPLAY_Z_SCALE];
}

function projectIntoCameraPlane(
  vector: Vec3Like,
  viewingDirection: Vec3Like,
): Vec3 {
  const view = normalize(viewingDirection);
  const alongView = dot(vector, view);
  return [
    vector[0] - alongView * view[0],
    vector[1] - alongView * view[1],
    vector[2] - alongView * view[2],
  ];
}

/**
 * Derives camera up for edge-on roll. The viewing direction is already in
 * display space; pole vectors are model-space inputs and receive the scene's
 * Z reflection before projection into the camera plane.
 */
export function cameraUpForEdgeOnRoll(
  viewingDirection: Vec3Like,
  celestialNorth: Vec3Like,
  eclipticPole: Vec3Like,
  rollDeg: number,
): Vec3 {
  const displayedNorth = displayVector(celestialNorth);
  const view = normalizeOrNull(viewingDirection);
  if (!view) return normalizeOrNull(displayedNorth) ?? [0, 1, 0];

  const northUp =
    normalizeOrNull(projectIntoCameraPlane(displayedNorth, view)) ??
    perpendicularFallback(view);
  const eclipticUp =
    normalizeOrNull(
      projectIntoCameraPlane(displayVector(eclipticPole), view),
    ) ?? northUp;
  const signedRotation = Math.atan2(
    dot(view, cross(northUp, eclipticUp)),
    dot(northUp, eclipticUp),
  );
  const angle = signedRotation * (clampEdgeOnRollDeg(rollDeg) / OBLIQUITY_DEG);
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const viewCrossNorth = cross(view, northUp);
  const viewAlongNorth = dot(view, northUp) * (1 - cosine);

  return (
    normalizeOrNull([
      northUp[0] * cosine + viewCrossNorth[0] * sine + view[0] * viewAlongNorth,
      northUp[1] * cosine + viewCrossNorth[1] * sine + view[1] * viewAlongNorth,
      northUp[2] * cosine + viewCrossNorth[2] * sine + view[2] * viewAlongNorth,
    ]) ?? northUp
  );
}
