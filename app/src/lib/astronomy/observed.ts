import type { SkyPath } from "../astro.ts";
import { ephemerisAstronomyProvider } from "./ephemeris-provider.ts";
import type { AstronomyProvider, AstronomyProviderSnapshot, HorizontalPosition } from "./provider.ts";

const SOLAR_DAY_MS = 86_400_000;
const SIDEREAL_DAY_MS = SOLAR_DAY_MS * (360 / 360.98564736629);
const PATH_SAMPLE_COUNT = 192;
const EVENT_STEP_MS = 5 * 60_000;
const EVENT_SCAN_COUNT = Math.ceil(SIDEREAL_DAY_MS / EVENT_STEP_MS) + 2;

type Body = "sun" | "moon";

type TimedSample = {
  t: number;
  altDeg: number;
  azDeg: number;
};

export function observedSnapshot(
  instant: number,
  latDeg: number,
  lonDeg: number,
  orbitInstant = instant,
  provider: AstronomyProvider = ephemerisAstronomyProvider,
): AstronomyProviderSnapshot {
  return provider.snapshot({ instant, orbitInstant, latDeg, lonDeg });
}

function bodyHorizontal(snapshot: AstronomyProviderSnapshot, which: Body): HorizontalPosition {
  return which === "sun" ? snapshot.sun.horizontal : snapshot.moon.horizontal;
}

function horizontalAt(
  provider: AstronomyProvider,
  instant: number,
  orbitInstant: number,
  latDeg: number,
  lonDeg: number,
  which: Body,
): HorizontalPosition {
  return bodyHorizontal(observedSnapshot(instant, latDeg, lonDeg, orbitInstant, provider), which);
}

function timedSample(
  provider: AstronomyProvider,
  t: number,
  orbitInstant: number,
  latDeg: number,
  lonDeg: number,
  which: Body,
): TimedSample {
  const horizontal = horizontalAt(provider, t, orbitInstant, latDeg, lonDeg, which);
  return { t, altDeg: horizontal.altitudeDeg, azDeg: horizontal.azimuthDeg };
}

function crossing(a: TimedSample, b: TimedSample, direction: "rise" | "set"): number | null {
  const rising = a.altDeg <= 0 && b.altDeg > 0;
  const setting = a.altDeg > 0 && b.altDeg <= 0;
  if ((direction === "rise" && !rising) || (direction === "set" && !setting)) return null;
  const span = b.altDeg - a.altDeg;
  const f = span === 0 ? 0 : (0 - a.altDeg) / span;
  return a.t + (b.t - a.t) * Math.max(0, Math.min(1, f));
}

function previousCrossing(
  provider: AstronomyProvider,
  instant: number,
  orbitInstant: number,
  latDeg: number,
  lonDeg: number,
  which: Body,
  direction: "rise" | "set",
): number | null {
  let later = timedSample(provider, instant, orbitInstant, latDeg, lonDeg, which);
  for (let i = 1; i <= EVENT_SCAN_COUNT; i++) {
    const earlier = timedSample(provider, instant - i * EVENT_STEP_MS, orbitInstant, latDeg, lonDeg, which);
    const hit = crossing(earlier, later, direction);
    if (hit != null) return hit;
    later = earlier;
  }
  return null;
}

function nextCrossing(
  provider: AstronomyProvider,
  instant: number,
  orbitInstant: number,
  latDeg: number,
  lonDeg: number,
  which: Body,
  direction: "rise" | "set",
): number | null {
  let earlier = timedSample(provider, instant, orbitInstant, latDeg, lonDeg, which);
  for (let i = 1; i <= EVENT_SCAN_COUNT; i++) {
    const later = timedSample(provider, instant + i * EVENT_STEP_MS, orbitInstant, latDeg, lonDeg, which);
    const hit = crossing(earlier, later, direction);
    if (hit != null) return hit;
    earlier = later;
  }
  return null;
}

/**
 * Topocentric geometric diurnal track for the selected body.
 *
 * The body's geocentric orbital state is held at `orbitInstant` while the
 * observer/Earth-rotation clock is sampled across one sidereal turn around
 * `instant`. This keeps Slide-the-Moon as a smooth same-clock date step and
 * avoids a local-midnight arc swap. Rise/set crossings are zero-altitude
 * geometric crossings; no library rise/set/refraction/apparent-radius routine is
 * used here.
 */
export function observedSkyPath(
  instant: number,
  latDeg: number,
  lonDeg: number,
  which: Body,
  orbitInstant = instant,
  provider: AstronomyProvider = ephemerisAstronomyProvider,
): SkyPath {
  const samples: TimedSample[] = [];
  let transitAlt: number | null = null;
  for (let i = 0; i <= PATH_SAMPLE_COUNT; i++) {
    const t = instant - SIDEREAL_DAY_MS / 2 + (i / PATH_SAMPLE_COUNT) * SIDEREAL_DAY_MS;
    const sample = timedSample(provider, t, orbitInstant, latDeg, lonDeg, which);
    samples.push(sample);
    transitAlt = transitAlt == null ? sample.altDeg : Math.max(transitAlt, sample.altDeg);
  }

  const aboveCount = samples.filter((sample) => sample.altDeg > 0).length;
  const hasRise = samples.some((sample, index) => index > 0 && crossing(samples[index - 1]!, sample, "rise") != null);
  const hasSet = samples.some((sample, index) => index > 0 && crossing(samples[index - 1]!, sample, "set") != null);
  const alwaysUp = aboveCount === samples.length;
  const alwaysDown = aboveCount === 0;
  const now = horizontalAt(provider, instant, orbitInstant, latDeg, lonDeg, which);

  let rise: number | null = null;
  let set: number | null = null;
  if (hasRise || hasSet) {
    if (now.altitudeDeg > 0) {
      rise = previousCrossing(provider, instant, orbitInstant, latDeg, lonDeg, which, "rise");
      set = nextCrossing(provider, instant, orbitInstant, latDeg, lonDeg, which, "set");
    } else {
      rise = nextCrossing(provider, instant, orbitInstant, latDeg, lonDeg, which, "rise");
      set = rise == null ? null : nextCrossing(provider, rise + 1, orbitInstant, latDeg, lonDeg, which, "set");
    }
  }

  return {
    samples: samples.map(({ altDeg, azDeg }) => ({ altDeg, azDeg })),
    alwaysUp,
    alwaysDown,
    rise,
    set,
    transitAlt,
  };
}
