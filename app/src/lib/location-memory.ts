export type RememberedPlace = {
  label: string;
  lat: number;
  lon: number;
};

export type LocationMemory = {
  lat?: number;
  lon?: number;
  spinHours?: number;
  place?: RememberedPlace;
};

const COORDINATE_EPSILON = 0.0001;

function validCoordinate(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function parseRememberedPlace(value: unknown): RememberedPlace | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<RememberedPlace>;
  if (
    typeof candidate.label !== "string" ||
    candidate.label.trim() === "" ||
    !validCoordinate(candidate.lat, -90, 90) ||
    !validCoordinate(candidate.lon, -180, 180)
  ) {
    return undefined;
  }
  return { label: candidate.label, lat: candidate.lat, lon: candidate.lon };
}

export function parseLocationMemory(raw: string | null): LocationMemory {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const memory: LocationMemory = {};
    if (validCoordinate(parsed.lat, -90, 90)) memory.lat = parsed.lat;
    if (validCoordinate(parsed.lon, -180, 180)) memory.lon = parsed.lon;
    if (
      typeof parsed.spinHours === "number" &&
      Number.isFinite(parsed.spinHours)
    ) {
      memory.spinHours = parsed.spinHours;
    }
    const place = parseRememberedPlace(parsed.place);
    if (place) memory.place = place;
    return memory;
  } catch {
    return {};
  }
}

export function rememberedPlaceForCoordinates(
  place: RememberedPlace | undefined | null,
  lat: number,
  lon: number,
): RememberedPlace | null {
  if (!place) return null;
  return Math.abs(place.lat - lat) < COORDINATE_EPSILON &&
    Math.abs(place.lon - lon) < COORDINATE_EPSILON
    ? place
    : null;
}

export function rememberedPlaceAfterCoordinateChange(
  mounted: boolean,
  place: RememberedPlace | null,
  lat: number,
  lon: number,
): RememberedPlace | null {
  return mounted ? rememberedPlaceForCoordinates(place, lat, lon) : place;
}

export function resolveInitialLocation(
  memory: LocationMemory,
  urlLat: number | undefined,
  urlLon: number | undefined,
  fallbackLat: number,
  fallbackLon: number,
): { lat: number; lon: number; place: RememberedPlace | null } {
  const savedLat = memory.lat ?? fallbackLat;
  const savedLon = memory.lon ?? fallbackLon;
  const savedPlace = rememberedPlaceForCoordinates(
    memory.place,
    savedLat,
    savedLon,
  );
  const urlMatchesRoundedSavedPlace =
    savedPlace !== null &&
    urlLat !== undefined &&
    urlLon !== undefined &&
    Math.round(savedPlace.lat * 10) / 10 === urlLat &&
    Math.round(savedPlace.lon * 10) / 10 === urlLon;

  if (urlMatchesRoundedSavedPlace) {
    return { lat: savedLat, lon: savedLon, place: savedPlace };
  }

  const lat = urlLat ?? savedLat;
  const lon = urlLon ?? savedLon;
  return {
    lat,
    lon,
    place: rememberedPlaceForCoordinates(savedPlace, lat, lon),
  };
}

export function locationMemoryValue(
  lat: number,
  lon: number,
  spinHours: number,
  place: RememberedPlace | null,
): LocationMemory {
  const matchingPlace = rememberedPlaceForCoordinates(place, lat, lon);
  return matchingPlace
    ? { lat, lon, spinHours, place: matchingPlace }
    : { lat, lon, spinHours };
}
