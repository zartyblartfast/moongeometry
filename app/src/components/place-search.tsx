import { FormEvent, useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceResult } from "@/lib/geocode";

type PlaceSearchProps = {
  lat: number;
  lon: number;
  onSelect: (place: PlaceResult) => void;
};

type SelectedPlace = {
  label: string;
  lat: number;
  lon: number;
};

function coordinatesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export function PlaceSearch({ lat, lon, onSelect }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const selectedRef = useRef<SelectedPlace | null>(null);

  useEffect(() => {
    const selected = selectedRef.current;
    if (!selected) return;

    if (!coordinatesMatch(lat, selected.lat) || !coordinatesMatch(lon, selected.lon)) {
      selectedRef.current = null;
      setQuery("");
      setResults([]);
      setMessage("");
    }
  }, [lat, lon]);

  async function runSearch() {
    const normalised = query.trim().replace(/\s+/g, " ");

    if (normalised.length < 2) {
      setResults([]);
      setMessage("Enter at least 2 characters.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setMessage("");

    try {
      const places = await searchPlaces(normalised);
      if (requestId !== requestIdRef.current) return;
      setResults(places);
      setMessage(places.length === 0 ? "No matching places found." : "");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setMessage("Place search unavailable.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  function selectPlace(place: PlaceResult) {
    selectedRef.current = { label: place.label, lat: place.lat, lon: place.lon };
    setQuery(place.label);
    setResults([]);
    setMessage("");
    onSelect(place);
  }

  return (
    <form className="relative flex flex-col gap-1 text-sm text-muted sm:col-span-2 lg:col-span-2" onSubmit={submit}>
      <span>Place</span>
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            selectedRef.current = null;
            setQuery(event.target.value);
            setResults([]);
            setMessage("");
          }}
          placeholder="Town or place"
          className="min-h-9 min-w-0 flex-1 rounded-lg bg-surface-2 px-3 text-fg"
        />
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-line"
          disabled={loading}
        >
          {loading ? "Searching" : "Search"}
        </button>
      </div>
      <span className="text-xs text-muted">Sets latitude/longitude; civil time is derived from the selected position.</span>
      {(results.length > 0 || message) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-line bg-bg/95 p-2 text-xs shadow-xl">
          {message ? <p className="px-2 py-1 text-muted">{message}</p> : null}
          {results.map((place) => (
            <button
              key={`${place.lat}:${place.lon}:${place.fullLabel}`}
              type="button"
              title={place.fullLabel}
              className="block w-full rounded-md px-2 py-1.5 text-left text-fg hover:bg-surface-2"
              onClick={() => selectPlace(place)}
            >
              {place.label}
            </button>
          ))}
          <a
            className="mt-1 block px-2 py-1 text-muted underline decoration-muted/50 underline-offset-4 hover:text-fg"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            Place search © OpenStreetMap contributors
          </a>
        </div>
      )}
    </form>
  );
}
