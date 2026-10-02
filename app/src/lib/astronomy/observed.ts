import type { SkyPath } from "../astro.ts";
import { ephemerisAstronomyProvider } from "./ephemeris-provider.ts";
import type {
  AstronomyBody,
  AstronomyProvider,
  AstronomyProviderSnapshot,
  FrozenBodyOrbitalState,
  HorizontalPosition,
} from "./provider.ts";

const SOLAR_DAY_MS = 86_400_000;
const SIDEREAL_DAY_MS = SOLAR_DAY_MS * (360 / 360.98564736629);
const PATH_SAMPLE_COUNT = 192;
const EVENT_SCAN_COUNT = PATH_SAMPLE_COUNT * 2;
const SCAN_STEP_MS = SIDEREAL_DAY_MS / PATH_SAMPLE_COUNT;
const EXTREMUM_ITERATIONS = 32;
const ROOT_ITERATIONS = 48;
const ROOT_TIME_TOLERANCE_MS = 1;
const HORIZON_CONTACT_EPSILON_DEG = 1e-9;

type TimedSample = {
  t: number;
  altDeg: number;
  azDeg: number;
};

export type ObservedViewState = {
  snapshot: AstronomyProviderSnapshot;
  moonPath: SkyPath;
  sunPath: SkyPath;
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

function horizontalAt(
  provider: AstronomyProvider,
  instant: number,
  latDeg: number,
  lonDeg: number,
  orbitalState: FrozenBodyOrbitalState,
): HorizontalPosition {
  return provider.topocentricGeometricHorizontal({ instant, latDeg, lonDeg, orbitalState });
}

function timedSample(
  provider: AstronomyProvider,
  t: number,
  latDeg: number,
  lonDeg: number,
  orbitalState: FrozenBodyOrbitalState,
): TimedSample {
  const horizontal = horizontalAt(provider, t, latDeg, lonDeg, orbitalState);
  return { t, altDeg: horizontal.altitudeDeg, azDeg: horizontal.azimuthDeg };
}

type HorizonCrossing = { t: number; direction: "rise" | "set" };

function refineExtremum(
  sampleAt: (t: number) => TimedSample,
  leftTime: number,
  rightTime: number,
  maximize: boolean,
): TimedSample {
  const better = (a: TimedSample, b: TimedSample) => (maximize ? a.altDeg > b.altDeg : a.altDeg < b.altDeg);
  const ratio = (Math.sqrt(5) - 1) / 2;
  let left = leftTime;
  let right = rightTime;
  let x1 = right - ratio * (right - left);
  let x2 = left + ratio * (right - left);
  let s1 = sampleAt(x1);
  let s2 = sampleAt(x2);

  for (let i = 0; i < EXTREMUM_ITERATIONS && right - left > ROOT_TIME_TOLERANCE_MS; i++) {
    if (better(s1, s2)) {
      right = x2;
      x2 = x1;
      s2 = s1;
      x1 = right - ratio * (right - left);
      s1 = sampleAt(x1);
    } else {
      left = x1;
      x1 = x2;
      s1 = s2;
      x2 = left + ratio * (right - left);
      s2 = sampleAt(x2);
    }
  }

  const middle = sampleAt((left + right) / 2);
  return better(s1, better(s2, middle) ? s2 : middle) ? s1 : better(s2, middle) ? s2 : middle;
}

function refineRoot(sampleAt: (t: number) => TimedSample, a: TimedSample, b: TimedSample): number {
  let left = a;
  let right = b;
  for (let i = 0; i < ROOT_ITERATIONS && right.t - left.t > ROOT_TIME_TOLERANCE_MS; i++) {
    const middle = sampleAt((left.t + right.t) / 2);
    if (Math.abs(middle.altDeg) <= HORIZON_CONTACT_EPSILON_DEG) return middle.t;
    if ((left.altDeg < 0) === (middle.altDeg < 0)) left = middle;
    else right = middle;
  }
  return (left.t + right.t) / 2;
}

function horizonCrossings(sampleAt: (t: number) => TimedSample, points: TimedSample[]): HorizonCrossing[] {
  const crossings: HorizonCrossing[] = [];
  let previousDefinite: TimedSample | null = null;
  for (const point of points) {
    if (Math.abs(point.altDeg) <= HORIZON_CONTACT_EPSILON_DEG) continue;
    if (previousDefinite != null && (previousDefinite.altDeg < 0) !== (point.altDeg < 0)) {
      crossings.push({
        t: refineRoot(sampleAt, previousDefinite, point),
        direction: previousDefinite.altDeg < 0 ? "rise" : "set",
      });
    }
    previousDefinite = point;
  }
  return crossings.filter((crossing, index) => index === 0 || Math.abs(crossing.t - crossings[index - 1]!.t) > ROOT_TIME_TOLERANCE_MS);
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
  which: AstronomyBody,
  orbitInstant = instant,
  provider: AstronomyProvider = ephemerisAstronomyProvider,
): SkyPath {
  const orbitalState = provider.freezeBodyOrbitalState(which, orbitInstant);
  const sampleCache = new Map<number, TimedSample>();
  const sampleAt = (t: number): TimedSample => {
    const cached = sampleCache.get(t);
    if (cached != null) return cached;
    const sample = timedSample(provider, t, latDeg, lonDeg, orbitalState);
    sampleCache.set(t, sample);
    return sample;
  };
  // Pad both ends by one coarse step so a culmination just inside the event
  // window is never stranded at an endpoint without a three-point bracket.
  const scanStart = instant - SIDEREAL_DAY_MS - SCAN_STEP_MS;
  const scanSamples: TimedSample[] = [];
  for (let i = 0; i <= EVENT_SCAN_COUNT + 2; i++) {
    scanSamples.push(sampleAt(scanStart + i * SCAN_STEP_MS));
  }

  const extrema: TimedSample[] = [];
  for (let i = 1; i < scanSamples.length - 1; i++) {
    const before = scanSamples[i - 1]!;
    const candidate = scanSamples[i]!;
    const after = scanSamples[i + 1]!;
    const localMaximum = candidate.altDeg >= before.altDeg && candidate.altDeg >= after.altDeg;
    const localMinimum = candidate.altDeg <= before.altDeg && candidate.altDeg <= after.altDeg;
    if (localMaximum && (candidate.altDeg > before.altDeg || candidate.altDeg > after.altDeg)) {
      extrema.push(refineExtremum(sampleAt, before.t, after.t, true));
    }
    if (localMinimum && (candidate.altDeg < before.altDeg || candidate.altDeg < after.altDeg)) {
      extrema.push(refineExtremum(sampleAt, before.t, after.t, false));
    }
  }

  const eventPoints = [...scanSamples, ...extrema].sort((a, b) => a.t - b.t);
  const pathStart = instant - SIDEREAL_DAY_MS / 2;
  const pathEnd = instant + SIDEREAL_DAY_MS / 2;
  const classificationPoints = eventPoints.filter((sample) => sample.t >= pathStart && sample.t <= pathEnd);
  const highest = classificationPoints.reduce((best, sample) => Math.max(best, sample.altDeg), -Infinity);
  const lowest = classificationPoints.reduce((best, sample) => Math.min(best, sample.altDeg), Infinity);
  // A pure tangent contact does not cross the horizon. Treat a track whose
  // maximum only touches 0° as always down, and one whose minimum only touches
  // 0° as always up, rather than manufacturing a rise/set pair from roundoff.
  const alwaysDown = highest <= HORIZON_CONTACT_EPSILON_DEG;
  const alwaysUp = !alwaysDown && lowest >= -HORIZON_CONTACT_EPSILON_DEG;
  const crossings = alwaysUp || alwaysDown ? [] : horizonCrossings(sampleAt, eventPoints);
  const now = sampleAt(instant);

  let rise: number | null = null;
  let set: number | null = null;
  if (crossings.length > 0) {
    const rises = crossings.filter((crossing) => crossing.direction === "rise");
    const sets = crossings.filter((crossing) => crossing.direction === "set");
    const contact = crossings.find((crossing) => Math.abs(crossing.t - instant) <= ROOT_TIME_TOLERANCE_MS);
    if (now.altDeg > HORIZON_CONTACT_EPSILON_DEG || contact?.direction === "rise") {
      for (let i = rises.length - 1; i >= 0; i--) {
        if (rises[i]!.t <= instant + ROOT_TIME_TOLERANCE_MS) {
          rise = rises[i]!.t;
          break;
        }
      }
      set = sets.find((crossing) => crossing.t >= instant - ROOT_TIME_TOLERANCE_MS)?.t ?? null;
    } else {
      rise = rises.find((crossing) => crossing.t >= instant - ROOT_TIME_TOLERANCE_MS)?.t ?? null;
      if (rise != null) {
        const riseTime = rise;
        set = sets.find((crossing) => crossing.t > riseTime + ROOT_TIME_TOLERANCE_MS)?.t ?? null;
      }
    }
  }

  const firstPathIndex = PATH_SAMPLE_COUNT / 2 + 1;
  const samples = scanSamples.slice(firstPathIndex, firstPathIndex + PATH_SAMPLE_COUNT + 1);

  return {
    samples: samples.map(({ altDeg, azDeg }) => ({ altDeg, azDeg })),
    alwaysUp,
    alwaysDown,
    rise,
    set,
    transitAlt: highest,
  };
}

export function observedViewState(
  instant: number,
  latDeg: number,
  lonDeg: number,
  orbitInstant = instant,
  provider: AstronomyProvider = ephemerisAstronomyProvider,
): ObservedViewState {
  return {
    snapshot: observedSnapshot(instant, latDeg, lonDeg, orbitInstant, provider),
    moonPath: observedSkyPath(instant, latDeg, lonDeg, "moon", orbitInstant, provider),
    sunPath: observedSkyPath(instant, latDeg, lonDeg, "sun", orbitInstant, provider),
  };
}
