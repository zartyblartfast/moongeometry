import assert from "node:assert/strict";
import test from "node:test";
import {
  Body,
  Equator,
  EquatorFromVector,
  GeoVector,
  Horizon,
  HorizonFromVector,
  Observer,
  ObserverVector,
  RotateVector,
  Rotation_EQJ_HOR,
  Vector,
} from "astronomy-engine";
import {
  daysSinceJ2000,
  eclipticPole,
  equatorialUnit,
  formulaAltitudeDeg,
  formatSolarAndUtc,
  formatUtcMomentLine,
  horizon,
  hoopPoints,
  meridianAltitudeDeg,
  moonEquatorial,
  nearestFullEvening,
  phaseFromUnits,
  skyPath,
  snapshot,
  sunBeam,
  sunEquatorial,
  utcOffsetPhrase,
} from "./astro.ts";
import { ephemerisAstronomyProvider } from "./astronomy/ephemeris-provider.ts";
import { referenceCases, simpleVsEphemerisCases } from "./astronomy/fixtures/reference-cases.ts";
import { observedSkyPath, observedSnapshot } from "./astronomy/observed.ts";
import type { AstronomyProvider } from "./astronomy/provider.ts";
import { simpleAstronomyProvider } from "./astronomy/simple-provider.ts";

const DEG = Math.PI / 180;
const CLOSE = 1e-12;

function assertClose(actual: number, expected: number, tolerance = CLOSE): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}

function assertVecClose(actual: readonly number[], expected: readonly number[], tolerance = CLOSE): void {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assertClose(actual[i]!, expected[i]!, tolerance);
  }
}

function angleDeltaDeg(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function assertAngleClose(actual: number, expected: number, tolerance: number): void {
  assert.ok(angleDeltaDeg(actual, expected) <= tolerance, `${actual} vs ${expected}`);
}

function splitClockTopocentricHorizontal(
  body: Body.Sun | Body.Moon,
  orbitDate: Date,
  horizontalDate: Date,
  observer: Observer,
): { altitudeDeg: number; azimuthDeg: number } {
  const geocentric = GeoVector(body, orbitDate, true);
  const observerAtHorizontalClock = ObserverVector(horizontalDate, observer, false);
  const topocentricEqj = new Vector(
    geocentric.x - observerAtHorizontalClock.x,
    geocentric.y - observerAtHorizontalClock.y,
    geocentric.z - observerAtHorizontalClock.z,
    observerAtHorizontalClock.t,
  );
  const horizontalVector = RotateVector(Rotation_EQJ_HOR(horizontalDate, observer), topocentricEqj);
  const horizontal = HorizonFromVector(horizontalVector, "");
  return { altitudeDeg: horizontal.lat, azimuthDeg: ((horizontal.lon % 360) + 360) % 360 };
}

test("simple astronomy provider matches direct snapshot observed values", () => {
  const input = {
    instant: Date.UTC(2026, 9, 1, 20, 36, 0),
    orbitInstant: Date.UTC(2026, 9, 2, 3, 0, 0),
    latDeg: 51.5,
    lonDeg: -0.13,
  };
  const direct = snapshot(input.instant, input.latDeg, input.lonDeg, input.orbitInstant);
  const provided = simpleAstronomyProvider.snapshot(input);

  assertClose(provided.d, direct.d);
  assertClose(provided.sun.equatorial.ra, direct.sun.ra);
  assertClose(provided.sun.equatorial.dec, direct.sun.dec);
  assertVecClose(provided.sun.geocentricUnit, direct.sun.unit);
  assertClose(provided.sun.horizontal.altitudeDeg, direct.sunHz.alt / DEG);
  assertClose(provided.sun.horizontal.azimuthDeg, ((direct.sunHz.az / DEG) % 360 + 360) % 360);
  assertClose(provided.sun.horizontal.hourAngle, direct.sunHz.ha);
  assertClose(provided.moon.equatorial.ra, direct.moon.ra);
  assertClose(provided.moon.equatorial.dec, direct.moon.dec);
  assertVecClose(provided.moon.geocentricUnit, direct.moon.unit);
  assertClose(provided.moon.horizontal.altitudeDeg, direct.moonHz.alt / DEG);
  assertClose(provided.moon.horizontal.azimuthDeg, ((direct.moonHz.az / DEG) % 360 + 360) % 360);
  assertClose(provided.moon.horizontal.hourAngle, direct.moonHz.ha);
  assertClose(provided.moon.illumination, direct.phase.illumination);
  assertClose(provided.moon.elongationDeg, direct.phase.elongationDeg);
  assert.equal(provided.moon.waxing, direct.phase.waxing);
  assert.equal(provided.moon.phaseName, direct.phase.name);
  assertClose(provided.decDeg, direct.decDeg);
  assertClose(provided.hMeridian, direct.hMeridian);
  assertClose(provided.hFormula, direct.hFormula);
  assertVecClose(provided.zenith, direct.zenith);
});

test("ephemeris provider keeps schematic fields geocentric and applies observer parallax at the horizontal clock", () => {
  const input = { instant: Date.UTC(2026, 9, 1, 20, 36, 0), orbitInstant: Date.UTC(2026, 9, 2, 3, 0, 0), latDeg: 51.5, lonDeg: -0.13 };
  const orbitDate = new Date(input.orbitInstant);
  const horizontalDate = new Date(input.instant);
  const observer = new Observer(input.latDeg, input.lonDeg, 0);
  const actual = ephemerisAstronomyProvider.snapshot(input);

  const geocentricMoon = GeoVector(Body.Moon, orbitDate, true);
  const geocentricMoonEquator = EquatorFromVector(geocentricMoon);
  assertClose(actual.moon.equatorial.ra, geocentricMoonEquator.ra * 15 * DEG, 1e-12);
  assertClose(actual.moon.equatorial.dec, geocentricMoonEquator.dec * DEG, 1e-12);
  assertVecClose(actual.moon.geocentricUnit, [geocentricMoon.x / geocentricMoon.Length(), geocentricMoon.z / geocentricMoon.Length(), geocentricMoon.y / geocentricMoon.Length()], 1e-12);

  const sameClockTopocentric = Equator(Body.Moon, orbitDate, observer, true, true);
  assert.ok(Math.abs(actual.moon.equatorial.ra - sameClockTopocentric.ra * 15 * DEG) > 1e-4);
  assert.ok(Math.abs(actual.moon.equatorial.dec - sameClockTopocentric.dec * DEG) > 1e-4);

  const expectedHorizontal = splitClockTopocentricHorizontal(Body.Moon, orbitDate, horizontalDate, observer);
  assertClose(actual.moon.horizontal.altitudeDeg, expectedHorizontal.altitudeDeg, 1e-9);
  assertAngleClose(actual.moon.horizontal.azimuthDeg, expectedHorizontal.azimuthDeg, 1e-9);

  const oldMixedClockHorizontal = Horizon(horizontalDate, observer, sameClockTopocentric.ra, sameClockTopocentric.dec, undefined);
  assert.ok(Math.abs(actual.moon.horizontal.altitudeDeg - oldMixedClockHorizontal.altitude) > 0.01);

  const shifted = ephemerisAstronomyProvider.snapshot({ ...input, instant: input.instant + 2 * 60 * 60_000 });
  assertClose(shifted.moon.equatorial.ra, actual.moon.equatorial.ra, 1e-12);
  assertClose(shifted.moon.equatorial.dec, actual.moon.equatorial.dec, 1e-12);
  assertVecClose(shifted.moon.geocentricUnit, actual.moon.geocentricUnit, 1e-12);
  assert.ok(Math.abs(shifted.moon.horizontal.hourAngle - actual.moon.horizontal.hourAngle) > 0.45);
});

test("ephemeris astronomy provider matches saved Astronomy Engine fixtures", () => {
  for (const fixture of referenceCases) {
    const actual = ephemerisAstronomyProvider.snapshot(fixture.input);
    const expected = fixture.expected;

    assertClose(actual.d, expected.d, 1e-12);
    assertClose(actual.sun.equatorial.ra, expected.sun.raRad, 1e-10);
    assertClose(actual.sun.equatorial.dec, expected.sun.decRad, 1e-10);
    assertClose(actual.sun.horizontal.altitudeDeg, expected.sun.altitudeDeg, 1e-7);
    assertAngleClose(actual.sun.horizontal.azimuthDeg, expected.sun.azimuthDeg, 1e-7);
    assertClose(actual.sun.horizontal.hourAngle, expected.sun.hourAngleRad, 1e-10);
    assertVecClose(actual.sun.geocentricUnit, expected.sun.geocentricUnit, 1e-10);

    assertClose(actual.moon.equatorial.ra, expected.moon.raRad, 1e-10);
    assertClose(actual.moon.equatorial.dec, expected.moon.decRad, 1e-10);
    assertClose(actual.moon.horizontal.altitudeDeg, expected.moon.altitudeDeg, 1e-7);
    assertAngleClose(actual.moon.horizontal.azimuthDeg, expected.moon.azimuthDeg, 1e-7);
    assertClose(actual.moon.horizontal.hourAngle, expected.moon.hourAngleRad, 1e-10);
    assertVecClose(actual.moon.geocentricUnit, expected.moon.geocentricUnit, 1e-10);
    assertClose(actual.moon.distanceKm ?? 0, expected.moon.distanceKm, 1e-3);
    assertClose(actual.moon.illumination, expected.moon.illumination, 1e-10);
    assertClose(actual.moon.elongationDeg, expected.moon.elongationDeg, 1e-8);
    assert.equal(actual.moon.waxing, expected.moon.waxing);
    assert.equal(actual.moon.phaseName, expected.moon.phaseName);

    assertClose(actual.decDeg, expected.decDeg, 1e-8);
    assertClose(actual.hMeridian, expected.hMeridian, 1e-8);
    assertClose(actual.hFormula, expected.hFormula, 1e-8);
    assertVecClose(actual.zenith, expected.zenith, 1e-10);
  }
});

test("simple and ephemeris providers disagree by documented finite amounts", () => {
  assert.ok(simpleVsEphemerisCases.some((fixture) => fixture.expectedDifference.moonPositionDeg > 1));

  for (const fixture of simpleVsEphemerisCases) {
    const simple = simpleAstronomyProvider.snapshot(fixture.input);
    const ephemeris = ephemerisAstronomyProvider.snapshot(fixture.input);
    const moonPositionDeg = Math.hypot(
      ephemeris.moon.horizontal.altitudeDeg - simple.moon.horizontal.altitudeDeg,
      angleDeltaDeg(ephemeris.moon.horizontal.azimuthDeg, simple.moon.horizontal.azimuthDeg),
    );
    const sunPositionDeg = Math.hypot(
      ephemeris.sun.horizontal.altitudeDeg - simple.sun.horizontal.altitudeDeg,
      angleDeltaDeg(ephemeris.sun.horizontal.azimuthDeg, simple.sun.horizontal.azimuthDeg),
    );

    assertClose(moonPositionDeg, fixture.expectedDifference.moonPositionDeg, 1e-6);
    assertClose(sunPositionDeg, fixture.expectedDifference.sunPositionDeg, 1e-6);
    assert.ok(Number.isFinite(moonPositionDeg));
    assert.ok(Number.isFinite(sunPositionDeg));
  }
});

test("June solstice Sun stands near +23.4°", () => {
  const d = daysSinceJ2000(Date.UTC(2000, 5, 21, 12, 0, 0));
  const sun = sunEquatorial(d);
  assert.ok(Math.abs(sun.dec / DEG - 23.44) < 1.2, `dec ${sun.dec / DEG}`);
});

test("December solstice Sun stands near −23.4°", () => {
  const d = daysSinceJ2000(Date.UTC(2000, 11, 21, 12, 0, 0));
  const sun = sunEquatorial(d);
  assert.ok(Math.abs(sun.dec / DEG + 23.44) < 1.2, `dec ${sun.dec / DEG}`);
});

test("Moon stays within 5.2° of the ecliptic", () => {
  for (let day = 0; day < 40; day++) {
    const moon = moonEquatorial(day);
    assert.ok(Math.abs(moon.betaDeg) <= 5.2, `beta ${moon.betaDeg}`);
  }
});

test("meridian altitude matches 90 − |φ − δ|", () => {
  const dec = 18;
  const lat = 51.5;
  const got = meridianAltitudeDeg(dec, lat);
  const formula = formulaAltitudeDeg(dec, lat);
  assert.ok(Math.abs(got - formula) < 0.05, `${got} vs ${formula}`);
  const hz = horizon(0, dec * DEG, lat, 0);
  assert.ok(Math.abs(hz.alt / DEG - formula) < 0.05);
});

test("equator, zero declination, on the meridian is overhead", () => {
  const hz = horizon(0, 0, 0, 0);
  assert.ok(Math.abs(hz.alt / DEG - 90) < 0.01);
});

test("winter full Moon has northern declination, summer the opposite", () => {
  const winter = nearestFullEvening(2026, 11, 0);
  const summer = nearestFullEvening(2026, 5, 0);
  const decW = moonEquatorial(daysSinceJ2000(winter)).dec / DEG;
  const decS = moonEquatorial(daysSinceJ2000(summer)).dec / DEG;
  assert.ok(decW > 12, `winter dec ${decW}`);
  assert.ok(decS < -12, `summer dec ${decS}`);
});
test("opposite the Sun is full; a quarter east of it is waxing", () => {
  const sun = equatorialUnit(0, 0);
  const moon = equatorialUnit(Math.PI, 0);
  const full = phaseFromUnits(sun, moon, 0, Math.PI);
  assert.ok(full.illumination > 0.99);
  assert.equal(full.name, "Full");
  const quarter = phaseFromUnits(sun, equatorialUnit(Math.PI / 2, 0), 0, Math.PI / 2);
  assert.ok(Math.abs(quarter.illumination - 0.5) < 0.02);
  assert.equal(quarter.waxing, true);
});

test("observed ephemeris sky paths keep the frozen-orbit Moon and Sun dots on their arcs", () => {
  const lat = 51.5;
  const lon = -0.13;
  const instant = Date.UTC(2026, 9, 1, 20, 36, 0);
  const orbit = Date.UTC(2026, 9, 2, 3, 0, 0);
  const snap = observedSnapshot(instant, lat, lon, orbit);
  const moonPath = observedSkyPath(instant, lat, lon, "moon", orbit);
  const sunPath = observedSkyPath(instant, lat, lon, "sun", orbit);

  assert.ok(moonPath.samples.length > 100);
  assert.ok(sunPath.samples.length > 100);
  const direct = ephemerisAstronomyProvider.snapshot({ instant, orbitInstant: orbit, latDeg: lat, lonDeg: lon });
  assertClose(snap.moon.horizontal.altitudeDeg, direct.moon.horizontal.altitudeDeg, 1e-12);
  assertAngleClose(snap.moon.horizontal.azimuthDeg, direct.moon.horizontal.azimuthDeg, 1e-12);
  assertClose(snap.decDeg, direct.decDeg, 1e-12);
  assertClose(snap.moon.illumination, direct.moon.illumination, 1e-12);
  assert.equal(snap.moon.phaseName, direct.moon.phaseName);

  for (const [name, path, horizontal] of [
    ["Moon", moonPath, snap.moon.horizontal],
    ["Sun", sunPath, snap.sun.horizontal],
  ] as const) {
    let nearest = 999;
    for (const sample of path.samples) {
      const daz = angleDeltaDeg(sample.azDeg, horizontal.azimuthDeg);
      nearest = Math.min(nearest, Math.hypot(daz, sample.altDeg - horizontal.altitudeDeg));
    }
    assert.ok(nearest < 1e-9, `${name} is ${nearest}° off its ephemeris path`);
  }
});

test("observed rise and set are interpolated geometric zero-altitude crossings", () => {
  const orbitInstant = Date.UTC(2026, 9, 2, 3, 0, 0);
  const instant = 3 * 60 * 60_000;
  const seenOrbitInstants = new Set<number>();
  const provider: AstronomyProvider = {
    snapshot(input) {
      seenOrbitInstants.add(input.orbitInstant);
      const base = simpleAstronomyProvider.snapshot(input);
      const phase = (input.instant / (12 * 60 * 60_000)) * Math.PI * 2;
      return {
        ...base,
        moon: {
          ...base.moon,
          horizontal: {
            ...base.moon.horizontal,
            altitudeDeg: 30 * Math.sin(phase),
            azimuthDeg: ((input.instant / 60_000) % 360 + 360) % 360,
          },
        },
      };
    },
  };

  const path = observedSkyPath(instant, 0, 0, "moon", orbitInstant, provider);
  assertClose(path.rise ?? Number.NaN, 0, 1e-6);
  assertClose(path.set ?? Number.NaN, 6 * 60 * 60_000, 1e-6);
  assert.deepEqual([...seenOrbitInstants], [orbitInstant]);
});

test("observed ephemeris sky path uses orbitInstant for smooth date-step drift without moving the clock", () => {
  const lat = 51.5;
  const lon = -0.13;
  const instant = Date.UTC(2026, 9, 1, 20, 36, 0);
  const start = observedSkyPath(instant, lat, lon, "moon", instant).transitAlt ?? 0;
  const twentyMinutes = observedSkyPath(instant, lat, lon, "moon", instant + 20 * 60_000).transitAlt ?? 0;
  const nextDaySameClock = observedSkyPath(instant, lat, lon, "moon", instant + 86_400_000).transitAlt ?? 0;

  assert.ok(Math.abs(twentyMinutes - start) < 0.4, `20 min orbit shift moved the arc by ${twentyMinutes - start}`);
  assert.ok(Math.abs(nextDaySameClock - start) > Math.abs(twentyMinutes - start), "date step should move the arc more than 20 minutes");

  const now = observedSnapshot(instant, lat, lon, instant + 86_400_000).moon.horizontal;
  const path = observedSkyPath(instant, lat, lon, "moon", instant + 86_400_000);
  let nearest = 999;
  for (const sample of path.samples) {
    nearest = Math.min(nearest, Math.hypot(angleDeltaDeg(sample.azDeg, now.azimuthDeg), sample.altDeg - now.altitudeDeg));
  }
  assert.ok(nearest < 1e-9, `date-stepped dot is ${nearest}° off its arc`);
});

test("the sky path drifts with declination instead of stepping once a day", () => {
  const lat = 51.5;
  const lon = 0;
  const t0 = Date.UTC(2026, 11, 21, 21, 0, 0);
  const peak = (t: number) => skyPath(t, lat, lon, "moon").transitAlt ?? 0;
  const start = peak(t0);
  const twentyMin = peak(t0 + 20 * 60_000);
  const halfDay = peak(t0 + 12 * 3_600_000);
  const nextDay = peak(t0 + 86_400_000);
  assert.ok(Math.abs(twentyMin - start) < 0.25, `20 min shifted the arc by ${twentyMin - start}`);
  assert.ok(Math.abs(halfDay - start) > Math.abs(twentyMin - start), "half a day should move the arc more than 20 minutes");
  assert.ok(Math.abs(nextDay - start) > 0.4, `a day later the arc only moved ${nextDay - start}`);
  const sky = snapshot(t0, lat, lon);
  const path = skyPath(t0, lat, lon, "moon");
  assert.ok(Math.abs((path.transitAlt ?? 0) - formulaAltitudeDeg(sky.decDeg, lat)) < 0.05);
  assert.ok(sky.moonHz.alt > 0);
  const alt = sky.moonHz.alt / DEG;
  const az = ((sky.moonHz.az / DEG) % 360 + 360) % 360;
  let nearest = 999;
  for (const s of path.samples) {
    const daz = Math.abs((((s.azDeg - az) % 360) + 540) % 360 - 180);
    nearest = Math.min(nearest, Math.hypot(daz, s.altDeg - alt));
  }
  assert.ok(nearest < 2, `Moon is ${nearest} off its own path`);
});

test("sun rays lie in the ecliptic and stay parallel", () => {
  const pole = eclipticPole();
  assert.ok(Math.abs(Math.hypot(pole[0], pole[1], pole[2]) - 1) < 1e-12);
  const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  for (const p of hoopPoints("ecliptic", 1234.5, 48)) {
    assert.ok(Math.abs(dot(p, pole)) < 1e-8, "ecliptic hoop left its plane");
  }
  for (const month of [2, 5, 8, 11]) {
    const sun = sunEquatorial(daysSinceJ2000(Date.UTC(2026, month, 21, 12, 0, 0))).unit;
    assert.ok(Math.abs(dot(sun, pole)) < 1e-8, `sun left the ecliptic in month ${month}`);
    const rays = sunBeam(sun);
    assert.equal(rays.length, 5);
    const wave = dot(rays[0]!.head, sun);
    for (const ray of rays) {
      assert.ok(Math.abs(dot(ray.tail, pole)) < 1e-8);
      assert.ok(Math.abs(dot(ray.head, pole)) < 1e-8);
      assert.ok(Math.abs(dot(ray.head, sun) - wave) < 1e-8, "wavefront is not flat");
      const dir = [ray.head[0] - ray.tail[0], ray.head[1] - ray.tail[1], ray.head[2] - ray.tail[2]];
      const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
      assert.ok(Math.abs(dot(dir, sun) / len + 1) < 1e-8, "ray does not point toward Earth");
    }
    const center = rays[2]!;
    const skew = Math.hypot(
      center.head[1] * center.tail[2] - center.head[2] * center.tail[1],
      center.head[2] * center.tail[0] - center.head[0] * center.tail[2],
      center.head[0] * center.tail[1] - center.head[1] * center.tail[0],
    );
    assert.ok(skew < 1e-8, "center ray misses the Earth");
    const span = Math.hypot(
      rays[4]!.head[0] - rays[0]!.head[0],
      rays[4]!.head[1] - rays[0]!.head[1],
      rays[4]!.head[2] - rays[0]!.head[2],
    );
    assert.ok(span > 1.2 && span < 1.6, `beam width ${span}`);
  }
});


test("UTC offset phrase follows mean solar longitude sign", () => {
  assert.equal(utcOffsetPhrase(15), "1h behind this clock");
  assert.equal(utcOffsetPhrase(-15), "1h ahead of this clock");
  assert.equal(utcOffsetPhrase(0), "same as this clock");
  assert.equal(utcOffsetPhrase(6), "24 min behind this clock");
  assert.equal(utcOffsetPhrase(-74), "4h 56m ahead of this clock");
});

test("UTC labels describe the same instant as the mean solar clock", () => {
  const instant = Date.UTC(2026, 9, 1, 20, 36, 0);
  assert.equal(formatUtcMomentLine(instant, 6), "Same moment: 20:36 UTC, 1 Oct · 24 min behind this clock.");
  assert.equal(formatSolarAndUtc(instant, 6), "21:00 · 20:36 UTC");
  const crossDate = Date.UTC(2026, 9, 1, 23, 30, 0);
  assert.equal(formatSolarAndUtc(crossDate, 15), "00:30 · 23:30 UTC, 1 Oct");
});
