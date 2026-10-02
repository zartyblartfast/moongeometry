import { snapshot, wrap360 } from "../astro.ts";
import type { AstronomyProvider, BodyState, HorizontalPosition } from "./provider.ts";

const RAD_TO_DEG = 180 / Math.PI;

function horizontalFromRadians(alt: number, az: number, hourAngle: number): HorizontalPosition {
  return {
    altitudeDeg: alt * RAD_TO_DEG,
    azimuthDeg: wrap360(az * RAD_TO_DEG),
    hourAngle,
  };
}

export const simpleAstronomyProvider: AstronomyProvider = {
  snapshot(input) {
    const direct = snapshot(input.instant, input.latDeg, input.lonDeg, input.orbitInstant);

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
