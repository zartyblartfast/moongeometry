import { fromLocal, localParts } from "./astro.ts";

const MINUTES_PER_DAY = 24 * 60;

function clampMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.round(minute)));
}

export function timeScrubberMinute(instant: number, lonDeg: number): number {
  const parts = localParts(instant, lonDeg);
  return parts.h * 60 + parts.min;
}

export function instantForTimeScrubberMinute(
  instant: number,
  lonDeg: number,
  minute: number,
): number {
  const parts = localParts(instant, lonDeg);
  const clamped = clampMinute(minute);
  return fromLocal(
    parts.y,
    parts.m,
    parts.day,
    Math.floor(clamped / 60),
    clamped % 60,
    lonDeg,
  );
}

export function formatTimeScrubberValue(minute: number): string {
  const clamped = clampMinute(minute);
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes} mean solar time`;
}
