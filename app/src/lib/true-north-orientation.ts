function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

export function normalize360(deg: number): number {
  requireFinite(deg, "deg");
  return ((deg % 360) + 360) % 360;
}

export function wrap180(deg: number): number {
  return normalize360(deg + 180) - 180;
}

export function magneticToTrueHeading(
  magneticHeadingDeg: number,
  eastPositiveDeclinationDeg: number,
): number {
  requireFinite(magneticHeadingDeg, "magneticHeadingDeg");
  requireFinite(eastPositiveDeclinationDeg, "eastPositiveDeclinationDeg");
  return normalize360(magneticHeadingDeg + eastPositiveDeclinationDeg);
}

export function displayAzimuth(
  trueAzimuthDeg: number,
  trueHeadingDeg: number,
): number {
  requireFinite(trueAzimuthDeg, "trueAzimuthDeg");
  requireFinite(trueHeadingDeg, "trueHeadingDeg");
  return normalize360(trueAzimuthDeg - trueHeadingDeg);
}

export function isAlignedWithHysteresis(
  errorDeg: number,
  wasAligned: boolean,
): boolean {
  const errorMagnitude = Math.abs(wrap180(errorDeg));
  return errorMagnitude <= (wasAligned ? 6 : 3);
}

export function smoothCircularHeading(
  previousHeadingDeg: number | null,
  sampleHeadingDeg: number,
  smoothingFactor: number,
): number {
  requireFinite(sampleHeadingDeg, "sampleHeadingDeg");
  requireFinite(smoothingFactor, "smoothingFactor");
  if (smoothingFactor < 0 || smoothingFactor > 1) {
    throw new RangeError("smoothingFactor must be between 0 and 1");
  }
  if (previousHeadingDeg === null) {
    return normalize360(sampleHeadingDeg);
  }
  requireFinite(previousHeadingDeg, "previousHeadingDeg");
  return normalize360(
    previousHeadingDeg +
      smoothingFactor * wrap180(sampleHeadingDeg - previousHeadingDeg),
  );
}

function requireCoordinate(
  latDeg: number,
  lonDeg: number,
  prefix: string,
): void {
  requireFinite(latDeg, `${prefix}LatDeg`);
  requireFinite(lonDeg, `${prefix}LonDeg`);
  if (latDeg < -90 || latDeg > 90) {
    throw new RangeError(`${prefix}LatDeg must be between -90 and 90`);
  }
  if (lonDeg < -180 || lonDeg > 180) {
    throw new RangeError(`${prefix}LonDeg must be between -180 and 180`);
  }
}

export function haversineDistanceKm(
  fromLatDeg: number,
  fromLonDeg: number,
  toLatDeg: number,
  toLonDeg: number,
): number {
  requireCoordinate(fromLatDeg, fromLonDeg, "from");
  requireCoordinate(toLatDeg, toLonDeg, "to");
  const toRadians = Math.PI / 180;
  const lat1 = fromLatDeg * toRadians;
  const lat2 = toLatDeg * toRadians;
  const deltaLat = (toLatDeg - fromLatDeg) * toRadians;
  const deltaLon = (toLonDeg - fromLonDeg) * toRadians;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function deviceLocationMatchesSelected(
  deviceLatDeg: number,
  deviceLonDeg: number,
  deviceAccuracyMetres: number,
  selectedLatDeg: number,
  selectedLonDeg: number,
): boolean {
  requireFinite(deviceAccuracyMetres, "deviceAccuracyMetres");
  if (deviceAccuracyMetres < 0) {
    throw new RangeError("deviceAccuracyMetres must not be negative");
  }
  const maximumDistanceKm = Math.max(5, (2 * deviceAccuracyMetres) / 1000);
  return (
    haversineDistanceKm(
      deviceLatDeg,
      deviceLonDeg,
      selectedLatDeg,
      selectedLonDeg,
    ) <= maximumDistanceKm
  );
}
