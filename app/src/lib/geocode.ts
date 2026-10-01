export type PlaceResult = {
  label: string;
  fullLabel: string;
  lat: number;
  lon: number;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

const cache = new Map<string, PlaceResult[]>();
let lastRequestAt = 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function shortPlaceLabel(displayName: string): string {
  return displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function toPlaceResult(result: NominatimResult): PlaceResult | null {
  const fullLabel = result.display_name?.trim();
  const lat = Number(result.lat);
  const lon = Number(result.lon);

  if (!fullLabel) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    label: shortPlaceLabel(fullLabel),
    fullLabel,
    lat,
    lon,
  };
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const normalised = normaliseQuery(query);
  if (normalised.length < 2) return [];

  const cacheKey = normalised.toLocaleLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1000) await wait(1000 - elapsed);

  lastRequestAt = Date.now();
  const params = new URLSearchParams({
    q: normalised,
    format: "jsonv2",
    limit: "5",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`Nominatim search failed: ${response.status}`);

  const data = (await response.json()) as NominatimResult[];
  const results = data.map(toPlaceResult).filter((place): place is PlaceResult => place !== null).slice(0, 5);
  cache.set(cacheKey, results);
  return results;
}
