import { Refraction } from "astronomy-engine";
import type {
  HorizontalPosition,
  ObservedHorizontalPosition,
} from "./provider.ts";

export type RefractedAltitude = {
  geometricAltitudeDeg: number;
  refractionDeg: number;
  apparentAltitudeDeg: number;
};

/** Standard sea-level atmosphere using Astronomy Engine's recommended model. */
export function standardAtmosphereRefraction(
  geometricAltitudeDeg: number,
): RefractedAltitude {
  const refractionDeg = Math.max(
    0,
    Refraction("normal", geometricAltitudeDeg),
  );
  return {
    geometricAltitudeDeg,
    refractionDeg,
    apparentAltitudeDeg: geometricAltitudeDeg + refractionDeg,
  };
}

export function withStandardAtmosphereRefraction(
  horizontal: HorizontalPosition,
): ObservedHorizontalPosition {
  const refracted = standardAtmosphereRefraction(horizontal.altitudeDeg);
  return {
    ...horizontal,
    refractionDeg: refracted.refractionDeg,
    apparentAltitudeDeg: refracted.apparentAltitudeDeg,
  };
}
