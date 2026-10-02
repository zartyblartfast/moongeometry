import {
  Body,
  EclipticGeoMoon,
  EquatorFromVector,
  GeoVector,
  HorizonFromVector,
  Illumination,
  KM_PER_AU,
  MakeTime,
  MoonPhase,
  Observer,
  ObserverVector,
  RotateVector,
  Rotation_EQJ_EQD,
  Rotation_EQJ_HOR,
  SiderealTime,
  Vector,
} from "astronomy-engine";
import {
  daysSinceJ2000,
  equatorialUnit,
  formulaAltitudeDeg,
  meridianAltitudeDeg,
  wrap360,
  type Phase,
  type Vec3,
} from "../astro.ts";
import type {
  AstronomyBody,
  AstronomyProvider,
  BodyState,
  FrozenBodyOrbitalState,
  HorizontalPosition,
  MoonState,
} from "./provider.ts";

const DEG_TO_RAD = Math.PI / 180;
const HOURS_TO_RAD = Math.PI / 12;
const RAD_TO_DEG = 180 / Math.PI;

function wrapPi(rad: number): number {
  const tau = Math.PI * 2;
  let x = rad % tau;
  if (x < 0) x += tau;
  return x;
}

function raHoursToRadians(raHours: number): number {
  return raHours * HOURS_TO_RAD;
}

function vectorLength(v: Vector): number {
  return Math.hypot(v.x, v.y, v.z);
}

/** Converts Astronomy Engine EQJ vectors into the app frame: [equinox, north, solstice]. */
function unitFromVector(v: Vector): Vec3 {
  const length = vectorLength(v) || 1;
  return [v.x / length, v.z / length, v.y / length];
}

function vectorFromFrozenState(state: FrozenBodyOrbitalState, instant: number): Vector {
  const [xAu, yAu, zAu] = state.geocentricEquatorialVectorAu;
  return new Vector(xAu, yAu, zAu, MakeTime(instant));
}

function engineBody(body: AstronomyBody): Body.Sun | Body.Moon {
  return body === "sun" ? Body.Sun : Body.Moon;
}

function freezeBodyOrbitalState(body: AstronomyBody, orbitInstant: number): FrozenBodyOrbitalState {
  const vector = GeoVector(engineBody(body), new Date(orbitInstant), true);
  return {
    body,
    orbitInstant,
    geocentricEquatorialVectorAu: [vector.x, vector.y, vector.z],
  };
}

function observedFromGeocentricVector(
  geocentric: Vector,
  horizontalDate: Date,
  observer: Observer,
  lonDeg: number,
): { equatorial: { ra: number; dec: number }; horizontal: HorizontalPosition } {
  // Split-clock topocentric view: keep the body's geocentric orbital state
  // from orbitInstant, but subtract the observer's Earth-rotated position at
  // instant before converting to the local horizon. This keeps Slide-the-Moon
  // orbital state independent from the clock/observer parallax state.
  const observerAtHorizontalClock = ObserverVector(horizontalDate, observer, false);
  const topocentricEqj = new Vector(
    geocentric.x - observerAtHorizontalClock.x,
    geocentric.y - observerAtHorizontalClock.y,
    geocentric.z - observerAtHorizontalClock.z,
    observerAtHorizontalClock.t,
  );
  const horizontalVector = RotateVector(Rotation_EQJ_HOR(horizontalDate, observer), topocentricEqj);
  // Astronomy Engine 2.1.19 treats a falsey refraction selector as no refraction;
  // its runtime docs say null, but the published TypeScript type is string.
  const NO_REFRACTION = "";
  const horizontal = HorizonFromVector(horizontalVector, NO_REFRACTION);
  const topocentricEqd = RotateVector(Rotation_EQJ_EQD(horizontalDate), topocentricEqj);
  const topocentricEquatorial = EquatorFromVector(topocentricEqd);
  const localSiderealHours = SiderealTime(horizontalDate) + lonDeg / 15;
  const hourAngle = wrapPi((localSiderealHours - topocentricEquatorial.ra) * HOURS_TO_RAD + Math.PI) - Math.PI;

  return {
    equatorial: {
      ra: raHoursToRadians(topocentricEquatorial.ra),
      dec: topocentricEquatorial.dec * DEG_TO_RAD,
    },
    horizontal: {
      altitudeDeg: horizontal.lat,
      azimuthDeg: wrap360(horizontal.lon),
      hourAngle,
    },
  };
}

function phaseName(illumination: number, waxing: boolean): Phase["name"] {
  if (illumination < 0.03) return "New";
  if (illumination > 0.97) return "Full";
  if (waxing && illumination < 0.47) return "Waxing crescent";
  if (waxing && illumination < 0.53) return "First quarter";
  if (waxing) return "Waxing gibbous";
  if (illumination < 0.47) return "Waning crescent";
  if (illumination < 0.53) return "Last quarter";
  return "Waning gibbous";
}

function bodyState(body: Body.Sun | Body.Moon, orbitDate: Date, horizontalDate: Date, observer: Observer, lonDeg: number): BodyState {
  const geocentric = GeoVector(body, orbitDate, true);
  const geocentricEquatorial = EquatorFromVector(geocentric);
  const observed = observedFromGeocentricVector(geocentric, horizontalDate, observer, lonDeg);

  return {
    geocentricEquatorialJ2000: {
      ra: raHoursToRadians(geocentricEquatorial.ra),
      dec: geocentricEquatorial.dec * DEG_TO_RAD,
    },
    observedEquatorial: observed.equatorial,
    horizontal: observed.horizontal,
    geocentricUnit: unitFromVector(geocentric),
  };
}

export const ephemerisAstronomyProvider: AstronomyProvider = {
  freezeBodyOrbitalState,
  topocentricGeometricHorizontal(input) {
    return observedFromGeocentricVector(
      vectorFromFrozenState(input.orbitalState, input.instant),
      new Date(input.instant),
      new Observer(input.latDeg, input.lonDeg, 0),
      input.lonDeg,
    ).horizontal;
  },
  orbitalGeometry(orbitInstant) {
    const sunState = freezeBodyOrbitalState("sun", orbitInstant);
    const moonState = freezeBodyOrbitalState("moon", orbitInstant);
    return {
      orbitInstant,
      d: daysSinceJ2000(orbitInstant),
      sunGeocentricUnit: unitFromVector(vectorFromFrozenState(sunState, orbitInstant)),
      moonGeocentricUnit: unitFromVector(vectorFromFrozenState(moonState, orbitInstant)),
    };
  },
  observerZenith(instant, latDeg, lonDeg) {
    const localSiderealRadians = (SiderealTime(new Date(instant)) + lonDeg / 15) * HOURS_TO_RAD;
    return equatorialUnit(localSiderealRadians, latDeg * DEG_TO_RAD);
  },
  snapshot(input) {
    const horizontalDate = new Date(input.instant);
    const orbitDate = new Date(input.orbitInstant);
    const observer = new Observer(input.latDeg, input.lonDeg, 0);
    const sun = bodyState(Body.Sun, orbitDate, horizontalDate, observer, input.lonDeg);
    const moonBase = bodyState(Body.Moon, orbitDate, horizontalDate, observer, input.lonDeg);
    const illumination = Illumination(Body.Moon, orbitDate).phase_fraction;
    const moonPhase = MoonPhase(orbitDate);
    const waxing = moonPhase > 0 && moonPhase < 180;
    const moonVector = GeoVector(Body.Moon, orbitDate, true);
    const moonEcliptic = EclipticGeoMoon(orbitDate);
    const moon: MoonState = {
      ...moonBase,
      ecliptic: {
        longitudeDeg: wrap360(moonEcliptic.lon),
        latitudeDeg: moonEcliptic.lat,
      },
      distanceKm: vectorLength(moonVector) * KM_PER_AU,
      illumination,
      elongationDeg: Math.min(moonPhase, 360 - moonPhase),
      waxing,
      phaseName: phaseName(illumination, waxing),
    };
    const decDeg = moon.observedEquatorial.dec * RAD_TO_DEG;

    return {
      d: daysSinceJ2000(input.orbitInstant),
      sun,
      moon,
      decDeg,
      hMeridian: meridianAltitudeDeg(decDeg, input.latDeg),
      hFormula: formulaAltitudeDeg(decDeg, input.latDeg),
      zenith: this.observerZenith(input.instant, input.latDeg, input.lonDeg),
    };
  },
};
