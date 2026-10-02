import type { Phase, Vec3 } from "../astro";

export type AstronomyProviderInput = {
  /** Clock/Earth-rotation instant: GMST, zenith, hour angle, and controls. */
  instant: number;
  /** Sun/Moon orbital-state instant. Usually equals instant except during Slide the Moon. */
  orbitInstant: number;
  latDeg: number;
  lonDeg: number;
};

export type EquatorialPosition = {
  /** Right ascension, radians. */
  ra: number;
  /** Declination, radians. */
  dec: number;
};

export type HorizontalPosition = {
  /** Altitude above the geometric horizon, degrees. */
  altitudeDeg: number;
  /** Azimuth in degrees clockwise from north: 0=N, 90=E, 180=S, 270=W. */
  azimuthDeg: number;
  /** Hour angle, radians, positive westward. */
  hourAngle: number;
};

export type EclipticPosition = {
  /** Geocentric true-ecliptic-of-date longitude, degrees in [0, 360). */
  longitudeDeg: number;
  /** Geocentric true-ecliptic-of-date latitude, degrees north-positive. */
  latitudeDeg: number;
};

export type BodyState = {
  /** Geocentric equatorial position for schematic orrery geometry. */
  equatorial: EquatorialPosition;
  /** Topocentric apparent position for sky/stat display. */
  horizontal: HorizontalPosition;
  /** Geocentric unit vector in the app's existing equatorial frame. */
  geocentricUnit: Vec3;
};

export type MoonState = BodyState & {
  /** Geocentric Moon coordinates at orbitInstant. */
  ecliptic: EclipticPosition;
  /** Optional physical distance; the current orrery remains schematic. */
  distanceKm?: number;
  /** Fraction illuminated, from 0 to 1. */
  illumination: number;
  elongationDeg: number;
  waxing: boolean;
  phaseName: Phase["name"];
};

export type AstronomyProviderSnapshot = {
  /** Days since J2000 for the orbital-state instant. */
  d: number;
  sun: BodyState;
  moon: MoonState;
  /** Moon declination in degrees, kept as a compatibility/readability field. */
  decDeg: number;
  /** Meridian/top-of-path altitude in degrees for the Moon. */
  hMeridian: number;
  /** Compatibility field for the existing displayed formula. */
  hFormula: number;
  /** Observer zenith in the app's existing equatorial frame. */
  zenith: Vec3;
};

export interface AstronomyProvider {
  snapshot(input: AstronomyProviderInput): AstronomyProviderSnapshot;
}
