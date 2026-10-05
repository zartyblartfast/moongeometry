import { fromLocal } from "./astro.ts";

export function resolveInitialInstant(
  date: string | undefined,
  time: string | undefined,
  lonDeg: number,
  now = Date.now(),
): number {
  if (!date || !time) return now;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return fromLocal(year, month - 1, day, hour, minute, lonDeg);
}
