import { magvar } from "magvar";

export interface GeomagneticDeclinationResult {
  declinationDeg: number;
  model: "WMM2025";
  valid: boolean;
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function decimalYear(date: Date): number {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("measuredAt must be a valid Date");
  }
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (timestamp - start) / (end - start);
}

export function geomagneticDeclination(
  latDeg: number,
  lonDeg: number,
  altitudeMetres: number | null,
  measuredAt: Date,
): GeomagneticDeclinationResult {
  requireFinite(latDeg, "latDeg");
  requireFinite(lonDeg, "lonDeg");
  if (latDeg < -90 || latDeg > 90) {
    throw new RangeError("latDeg must be between -90 and 90");
  }
  if (lonDeg < -180 || lonDeg > 180) {
    throw new RangeError("lonDeg must be between -180 and 180");
  }
  const altitudeKm = altitudeMetres === null ? 0 : altitudeMetres / 1000;
  requireFinite(altitudeKm, "altitudeMetres");
  const year = decimalYear(measuredAt);
  return {
    declinationDeg: magvar(latDeg, lonDeg, altitudeKm, measuredAt),
    model: "WMM2025",
    valid: year >= 2025 && year < 2030,
  };
}
