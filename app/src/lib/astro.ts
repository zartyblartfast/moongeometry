/** Mean Sun and Moon. Angles are real; distances are not. */

export const OBLIQUITY_DEG = 23.4392911;
export const MOON_INC_DEG = 5.145;
const DEG = Math.PI / 180;
const OBLIQUITY = OBLIQUITY_DEG * DEG;
const MOON_INC = MOON_INC_DEG * DEG;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Vec3 = [number, number, number];

export function daysSinceJ2000(ms: number): number {
  return (ms - J2000) / 86_400_000;
}

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function wrapPi(rad: number): number {
  const tau = Math.PI * 2;
  let x = rad % tau;
  if (x < 0) x += tau;
  return x;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function sunLongitudeDeg(d: number): number {
  return wrap360(280.46 + 0.9856474 * d);
}

export function moonLongitudeDeg(d: number): number {
  return wrap360(218.316 + 13.176396 * d);
}

export function nodeLongitudeDeg(d: number): number {
  return wrap360(125.045 - 0.0529538 * d);
}

/** GMST in degrees at longitude 0. */
export function gmstDeg(d: number): number {
  return wrap360(280.46061837 + 360.98564736629 * d);
}

export function eclipticToEquatorial(lon: number, lat: number): { ra: number; dec: number } {
  const ra = Math.atan2(
    Math.cos(lat) * Math.sin(lon) * Math.cos(OBLIQUITY) - Math.sin(lat) * Math.sin(OBLIQUITY),
    Math.cos(lat) * Math.cos(lon),
  );
  const dec = Math.asin(
    clamp(Math.sin(lat) * Math.cos(OBLIQUITY) + Math.cos(lat) * Math.sin(OBLIQUITY) * Math.sin(lon), -1, 1),
  );
  return { ra, dec };
}

export function equatorialUnit(ra: number, dec: number): Vec3 {
  return [Math.cos(dec) * Math.cos(ra), Math.sin(dec), Math.cos(dec) * Math.sin(ra)];
}

export function moonEcliptic(d: number): { lon: number; lat: number } {
  const L = moonLongitudeDeg(d) * DEG;
  const node = nodeLongitudeDeg(d) * DEG;
  const u = L - node;
  const lat = Math.asin(Math.sin(MOON_INC) * Math.sin(u));
  const lon = Math.atan2(Math.cos(MOON_INC) * Math.sin(u), Math.cos(u)) + node;
  return { lon, lat };
}

export function sunEquatorial(d: number): { ra: number; dec: number; unit: Vec3 } {
  const eq = eclipticToEquatorial(sunLongitudeDeg(d) * DEG, 0);
  return { ...eq, unit: equatorialUnit(eq.ra, eq.dec) };
}

/** North pole of the ecliptic, in the same frame as the hoops (+Y celestial north). */
export function eclipticPole(): Vec3 {
  return [0, Math.cos(OBLIQUITY), -Math.sin(OBLIQUITY)];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export type SunRay = { tail: Vec3; head: Vec3 };

/**
 * Parallel sunlight in the ecliptic plane. `sun` points from the Earth toward
 * the Sun. Offsetting along the celestial equator tilts the beam out of the
 * gold hoop except near the solstices; the in-plane direction is pole × sun.
 * Heads share one wavefront. Light travels from tail to head, toward the Earth.
 * Distances are the orrery's, not the Sun's (the hoop radius is 2.25).
 */
export function sunBeam(sun: Vec3, tipS = 2.4, tailS = 3.62, spacing = 0.36, count = 5): SunRay[] {
  const side = cross3(eclipticPole(), sun);
  const sl = Math.hypot(side[0], side[1], side[2]) || 1;
  const rays: SunRay[] = [];
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const shift = scale3(side, ((i - mid) * spacing) / sl);
    rays.push({
      tail: add3(scale3(sun, tailS), shift),
      head: add3(scale3(sun, tipS), shift),
    });
  }
  return rays;
}

export function moonEquatorial(d: number): { ra: number; dec: number; unit: Vec3; betaDeg: number } {
  const ecl = moonEcliptic(d);
  const eq = eclipticToEquatorial(ecl.lon, ecl.lat);
  return { ...eq, unit: equatorialUnit(eq.ra, eq.dec), betaDeg: ecl.lat / DEG };
}

/** Hour angle positive to the west. Returns altitude and azimuth (from north, toward east), radians. */
export function horizon(
  ra: number,
  dec: number,
  latDeg: number,
  ha: number,
): { alt: number; az: number } {
  const phi = latDeg * DEG;
  const east = -Math.cos(dec) * Math.sin(ha);
  const north = Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.cos(ha) * Math.sin(phi);
  const up = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(ha) * Math.cos(phi);
  return { alt: Math.asin(clamp(up, -1, 1)), az: Math.atan2(east, north) };
}

export function altAz(
  ra: number,
  dec: number,
  latDeg: number,
  lonDeg: number,
  d: number,
): { alt: number; az: number; ha: number } {
  const lst = (gmstDeg(d) + lonDeg) * DEG;
  const ha = wrapPi(lst - ra + Math.PI) - Math.PI;
  const hz = horizon(ra, dec, latDeg, ha);
  return { ...hz, ha };
}

export function meridianAltitudeDeg(decDeg: number, latDeg: number): number {
  const dec = decDeg * DEG;
  const phi = latDeg * DEG;
  const up = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi);
  return (Math.asin(clamp(up, -1, 1)) / DEG);
}

export function formulaAltitudeDeg(decDeg: number, latDeg: number): number {
  return 90 - Math.abs(latDeg - decDeg);
}

export type Phase = {
  illumination: number;
  elongationDeg: number;
  waxing: boolean;
  name: string;
};

export function phaseFromUnits(sun: Vec3, moon: Vec3, sunRa: number, moonRa: number): Phase {
  const cosE = clamp(sun[0] * moon[0] + sun[1] * moon[1] + sun[2] * moon[2], -1, 1);
  const elongation = Math.acos(cosE);
  const illumination = (1 - cosE) / 2;
  let dra = wrapPi(moonRa - sunRa + Math.PI) - Math.PI;
  if (dra < 0) dra += Math.PI * 2;
  const waxing = dra > 0 && dra < Math.PI;
  let name = "Waxing gibbous";
  if (illumination < 0.03) name = "New";
  else if (illumination > 0.97) name = "Full";
  else if (waxing && illumination < 0.47) name = "Waxing crescent";
  else if (waxing && illumination < 0.53) name = "First quarter";
  else if (waxing) name = "Waxing gibbous";
  else if (illumination < 0.47) name = "Waning crescent";
  else if (illumination < 0.53) name = "Last quarter";
  else name = "Waning gibbous";
  return { illumination, elongationDeg: elongation / DEG, waxing, name };
}

export type Sample = {
  t: number;
  altDeg: number;
  azDeg: number;
};

function bodyAt(d: number, which: "sun" | "moon"): { ra: number; dec: number } {
  return which === "sun" ? sunEquatorial(d) : moonEquatorial(d);
}

/** One local day at this longitude, sampled every 10 minutes. */
export function daySamples(
  instant: number,
  latDeg: number,
  lonDeg: number,
  which: "sun" | "moon",
): Sample[] {
  const local = localParts(instant, lonDeg);
  const midnight = fromLocal(local.y, local.m, local.day, 0, 0, lonDeg);
  const out: Sample[] = [];
  for (let i = 0; i <= 144; i++) {
    const t = midnight + i * 10 * 60_000;
    const d = daysSinceJ2000(t);
    const eq = bodyAt(d, which);
    const hz = altAz(eq.ra, eq.dec, latDeg, lonDeg, d);
    out.push({ t, altDeg: hz.alt / DEG, azDeg: wrap360(hz.az / DEG) });
  }
  return out;
}

export type Events = {
  rise: number | null;
  set: number | null;
  transit: number | null;
  transitAlt: number | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
};

export function eventsOf(samples: Sample[]): Events {
  let transit = samples[0]!;
  let above = 0;
  for (const s of samples) {
    if (s.altDeg > transit.altDeg) transit = s;
    if (s.altDeg > 0) above++;
  }
  const cross = (dir: "rise" | "set"): number | null => {
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!;
      const b = samples[i]!;
      const rising = a.altDeg <= 0 && b.altDeg > 0;
      const setting = a.altDeg > 0 && b.altDeg <= 0;
      if ((dir === "rise" && rising) || (dir === "set" && setting)) {
        const span = b.altDeg - a.altDeg;
        const f = span === 0 ? 0 : (0 - a.altDeg) / span;
        return a.t + (b.t - a.t) * clamp(f, 0, 1);
      }
    }
    return null;
  };
  return {
    rise: cross("rise"),
    set: cross("set"),
    transit: above > 0 ? transit.t : null,
    transitAlt: above > 0 ? transit.altDeg : null,
    alwaysUp: above === samples.length,
    alwaysDown: above === 0,
  };
}

export type SkyPath = {
  samples: { altDeg: number; azDeg: number }[];
  alwaysUp: boolean;
  alwaysDown: boolean;
  rise: number | null;
  set: number | null;
  transitAlt: number | null;
};

/**
 * Circle of this declination on the sky. Declination changes continuously,
 * so the circle drifts — it is not one arc held for a day and then swapped.
 * `instant` is the clock and the Earth's spin. `orbitInstant` is the Sun and
 * Moon, and matches `instant` except while the Moon is sliding.
 */
export function skyPath(
  instant: number,
  latDeg: number,
  lonDeg: number,
  which: "sun" | "moon",
  orbitInstant = instant,
): SkyPath {
  const eq = bodyAt(daysSinceJ2000(orbitInstant), which);
  const dec = eq.dec;
  const transitAlt = meridianAltitudeDeg(dec / DEG, latDeg);
  const cosH = -Math.tan(latDeg * DEG) * Math.tan(dec);
  const rises = Number.isFinite(cosH) && Math.abs(cosH) <= 1 && transitAlt > -0.01;
  const alwaysDown = !rises && transitAlt <= 0;
  const alwaysUp = !rises && !alwaysDown;
  const H0 = rises ? Math.acos(clamp(cosH, -1, 1)) : alwaysUp ? Math.PI : 0;
  const samples: { altDeg: number; azDeg: number }[] = [];
  if (!alwaysDown) {
    const n = alwaysUp ? 128 : 96;
    for (let i = 0; i <= n; i++) {
      const ha = -H0 + (i / n) * 2 * H0;
      const hz = horizon(0, dec, latDeg, ha);
      samples.push({ altDeg: hz.alt / DEG, azDeg: wrap360(hz.az / DEG) });
    }
  }
  let rise: number | null = null;
  let set: number | null = null;
  if (rises) {
    const hz = altAz(eq.ra, dec, latDeg, lonDeg, daysSinceJ2000(instant));
    const rate = hourAngleRate(orbitInstant, which);
    if (hz.alt >= 0) {
      rise = instant - (hz.ha + H0) / rate;
      set = instant + (H0 - hz.ha) / rate;
    } else {
      const target = hz.ha > H0 ? -H0 + Math.PI * 2 : -H0;
      rise = instant + (target - hz.ha) / rate;
      set = rise + (2 * H0) / rate;
    }
  }
  return { samples, alwaysUp, alwaysDown, rise, set, transitAlt };
}

/** Radians of hour angle per millisecond. Sidereal spin, minus the body's own drift in right ascension. */
function hourAngleRate(orbitInstant: number, which: "sun" | "moon"): number {
  const span = 3_600_000;
  const ra = (t: number) => bodyAt(daysSinceJ2000(t), which).ra;
  let dra = ra(orbitInstant + span) - ra(orbitInstant - span);
  dra = wrapPi(dra + Math.PI) - Math.PI;
  const gst = (360.98564736629 * DEG) / 86_400_000;
  return gst - dra / (2 * span);
}

export function hoopPoints(kind: "equator" | "ecliptic" | "moon", d: number, n = 180): Vec3[] {
  const pts: Vec3[] = [];
  const node = nodeLongitudeDeg(d) * DEG;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    if (kind === "equator") pts.push(equatorialUnit(t, 0));
    else if (kind === "ecliptic") {
      const eq = eclipticToEquatorial(t, 0);
      pts.push(equatorialUnit(eq.ra, eq.dec));
    } else {
      const u = t;
      const lat = Math.asin(Math.sin(MOON_INC) * Math.sin(u));
      const lon = Math.atan2(Math.cos(MOON_INC) * Math.sin(u), Math.cos(u)) + node;
      const eq = eclipticToEquatorial(lon, lat);
      pts.push(equatorialUnit(eq.ra, eq.dec));
    }
  }
  return pts;
}

export type Snapshot = {
  d: number;
  sun: ReturnType<typeof sunEquatorial>;
  moon: ReturnType<typeof moonEquatorial>;
  moonHz: { alt: number; az: number; ha: number };
  sunHz: { alt: number; az: number; ha: number };
  phase: Phase;
  decDeg: number;
  hFormula: number;
  hMeridian: number;
  zenith: Vec3;
};

export function snapshot(instant: number, latDeg: number, lonDeg: number, orbitInstant = instant): Snapshot {
  const dRot = daysSinceJ2000(instant);
  const d = daysSinceJ2000(orbitInstant);
  const sun = sunEquatorial(d);
  const moon = moonEquatorial(d);
  const moonHz = altAz(moon.ra, moon.dec, latDeg, lonDeg, dRot);
  const sunHz = altAz(sun.ra, sun.dec, latDeg, lonDeg, dRot);
  const phase = phaseFromUnits(sun.unit, moon.unit, sun.ra, moon.ra);
  const decDeg = moon.dec / DEG;
  const lst = (gmstDeg(dRot) + lonDeg) * DEG;
  const zenith = equatorialUnit(lst, latDeg * DEG);
  return {
    d,
    sun,
    moon,
    moonHz,
    sunHz,
    phase,
    decDeg,
    hFormula: formulaAltitudeDeg(decDeg, latDeg),
    hMeridian: meridianAltitudeDeg(decDeg, latDeg),
    zenith,
  };
}

export function localParts(instant: number, lonDeg: number) {
  const local = new Date(instant + (lonDeg / 15) * 3_600_000);
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth(),
    day: local.getUTCDate(),
    h: local.getUTCHours(),
    min: local.getUTCMinutes(),
  };
}

export function fromLocal(y: number, m: number, day: number, h: number, min: number, lonDeg: number): number {
  return Date.UTC(y, m, day, h, min) - (lonDeg / 15) * 3_600_000;
}

export function formatClock(instant: number, lonDeg: number): string {
  const p = localParts(instant, lonDeg);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.h)}:${pad(p.min)}`;
}

export function formatUtcClock(instant: number): string {
  const utc = new Date(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}`;
}

function formatUtcDayMonth(instant: number, includeYear: boolean): string {
  const utc = new Date(instant);
  const base = `${utc.getUTCDate()} ${MONTHS[utc.getUTCMonth()]}`;
  return includeYear ? `${base} ${utc.getUTCFullYear()}` : base;
}

export function utcOffsetPhrase(lonDeg: number): string {
  const minutes = Math.round(lonDeg * 4);
  const abs = Math.abs(minutes);
  if (abs < 1) return "same time";
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const amount = hours === 0 ? `${mins} min` : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  return `${amount} ${minutes > 0 ? "behind" : "ahead"}`;
}

export function formatUtcMomentLine(instant: number, lonDeg: number): string {
  const local = localParts(instant, lonDeg);
  const utc = new Date(instant);
  const includeYear = utc.getUTCFullYear() !== local.y;
  return `UTC · ${formatUtcClock(instant)}, ${formatUtcDayMonth(instant, includeYear)} · ${utcOffsetPhrase(lonDeg)}`;
}

export function formatSolarAndUtc(instant: number, lonDeg: number): string {
  const local = localParts(instant, lonDeg);
  const utc = new Date(instant);
  const sameUtcDate =
    utc.getUTCFullYear() === local.y && utc.getUTCMonth() === local.m && utc.getUTCDate() === local.day;
  const includeYear = utc.getUTCFullYear() !== local.y;
  return `${formatClock(instant, lonDeg)} · ${formatUtcClock(instant)} UTC${sameUtcDate ? "" : `, ${formatUtcDayMonth(instant, includeYear)}`}`;
}

export function formatDate(instant: number, lonDeg: number): string {
  const p = localParts(instant, lonDeg);
  return `${p.day} ${MONTHS[p.m]} ${p.y}`;
}

export function dateInputValue(instant: number, lonDeg: number): string {
  const p = localParts(instant, lonDeg);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m + 1)}-${pad(p.day)}`;
}

export function timeInputValue(instant: number, lonDeg: number): string {
  const p = localParts(instant, lonDeg);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.h)}:${pad(p.min)}`;
}

export function compass(azDeg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(wrap360(azDeg) / 22.5) % 16]!;
}

export function nearestFullEvening(year: number, monthIndex: number, lonDeg: number): number {
  let best = fromLocal(year, monthIndex, 15, 22, 0, lonDeg);
  let bestK = -1;
  for (let day = 1; day <= 31; day++) {
    const t = fromLocal(year, monthIndex, day, 22, 0, lonDeg);
    const d = daysSinceJ2000(t);
    const sun = sunEquatorial(d);
    const moon = moonEquatorial(d);
    const k = phaseFromUnits(sun.unit, moon.unit, sun.ra, moon.ra).illumination;
    if (k > bestK) {
      bestK = k;
      best = t;
    }
  }
  return best;
}

export function deg1(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}°`;
}
