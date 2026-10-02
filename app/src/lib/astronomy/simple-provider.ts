import { altAz, daysSinceJ2000, moonEcliptic, moonEquatorial, snapshot, sunEquatorial, wrap360 } from "../astro.ts";
import type { AstronomyBody, AstronomyProvider, BodyState, FrozenBodyOrbitalState, HorizontalPosition } from "./provider.ts";

const RAD_TO_DEG = 180 / Math.PI;

function horizontalFromRadians(alt: number, az: number, hourAngle: number): HorizontalPosition {
  return {
    altitudeDeg: alt * RAD_TO_DEG,
    azimuthDeg: wrap360(az * RAD_TO_DEG),
    hourAngle,
  };
}

function freezeBodyOrbitalState(body: AstronomyBody, orbitInstant: number): FrozenBodyOrbitalState {
  const d = daysSinceJ2000(orbitInstant);
  const state = body === "sun" ? sunEquatorial(d) : moonEquatorial(d);
  return {
    body,
    orbitInstant,
    geocentricEquatorialVectorAu: state.unit,
  };
}

function equatorialFromFrozenState(state: FrozenBodyOrbitalState): { ra: number; dec: number } {
  const [x, y, z] = state.geocentricEquatorialVectorAu;
  return { ra: Math.atan2(z, x), dec: Math.asin(y / (Math.hypot(x, y, z) || 1)) };
}

export const simpleAstronomyProvider: AstronomyProvider = {
  freezeBodyOrbitalState,
  topocentricGeometricHorizontal(input) {
    const equatorial = equatorialFromFrozenState(input.orbitalState);
    const horizontal = altAz(equatorial.ra, equatorial.dec, input.latDeg, input.lonDeg, daysSinceJ2000(input.instant));
    return horizontalFromRadians(horizontal.alt, horizontal.az, horizontal.ha);
  },
  orbitalGeometry(orbitInstant) {
    const d = daysSinceJ2000(orbitInstant);
    return {
      orbitInstant,
      d,
      sunGeocentricUnit: sunEquatorial(d).unit,
      moonGeocentricUnit: moonEquatorial(d).unit,
    };
  },
  observerZenith(instant, latDeg, lonDeg) {
    return snapshot(instant, latDeg, lonDeg, instant).zenith;
  },
  snapshot(input) {
    const direct = snapshot(input.instant, input.latDeg, input.lonDeg, input.orbitInstant);
    const moonEclipticRadians = moonEcliptic(direct.d);

    const sun: BodyState = {
      equatorial: {
        ra: direct.sun.ra,
        dec: direct.sun.dec,
      },
      horizontal: horizontalFromRadians(direct.sunHz.alt, direct.sunHz.az, direct.sunHz.ha),
      geocentricUnit: direct.sun.unit,
    };

    return {
      d: direct.d,
      sun,
      moon: {
        equatorial: {
          ra: direct.moon.ra,
          dec: direct.moon.dec,
        },
        horizontal: horizontalFromRadians(direct.moonHz.alt, direct.moonHz.az, direct.moonHz.ha),
        geocentricUnit: direct.moon.unit,
        ecliptic: {
          longitudeDeg: wrap360(moonEclipticRadians.lon * RAD_TO_DEG),
          latitudeDeg: moonEclipticRadians.lat * RAD_TO_DEG,
        },
        illumination: direct.phase.illumination,
        elongationDeg: direct.phase.elongationDeg,
        waxing: direct.phase.waxing,
        phaseName: direct.phase.name,
      },
      decDeg: direct.decDeg,
      hMeridian: direct.hMeridian,
      hFormula: direct.hFormula,
      zenith: direct.zenith,
    };
  },
};
