import { FormEvent, useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceResult } from "@/lib/geocode";
import {
  rememberedPlaceForCoordinates,
  type RememberedPlace,
} from "@/lib/location-memory";
import {
  currentDeviceLocationMessage,
  type ViewingLocationSourceState,
} from "@/lib/viewing-location";

type PlaceSearchProps = {
  lat: number;
  lon: number;
  selectedPlace: RememberedPlace | null;
  locationSource: ViewingLocationSourceState;
  onUseCurrentLocation: () => void;
  onUseCurrentTime: () => void;
  moment: string;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (place: PlaceResult) => void;
};

export function PlaceSearch({
  lat,
  lon,
  selectedPlace,
  locationSource,
  onUseCurrentLocation,
  onUseCurrentTime,
  moment,
  expanded,
  onToggle,
  onSelect,
}: PlaceSearchProps) {
  const [query, setQuery] = useState(selectedPlace?.label ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const matchingPlace = rememberedPlaceForCoordinates(
      selectedPlace,
      lat,
      lon,
    );
    setQuery(
      locationSource.status === "current-device"
        ? "Current location"
        : (matchingPlace?.label ?? ""),
    );
    setResults([]);
    setMessage("");
  }, [lat, lon, locationSource.status, selectedPlace]);

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
    setQuery(place.label);
    setResults([]);
    setMessage("");
    onSelect(place);
  }

  return (
    <form
      className="relative flex flex-col gap-1 text-sm text-muted sm:col-span-2 lg:col-span-2"
      onSubmit={submit}
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={locationSource.status === "requesting"}
          aria-busy={locationSource.status === "requesting"}
          className="min-h-10 rounded-lg bg-surface-2 px-3 text-xs font-semibold text-fg hover:bg-line disabled:cursor-wait disabled:opacity-70"
        >
          {locationSource.status === "requesting"
            ? "Locating…"
            : "Use my location"}
        </button>
        <button
          type="button"
          onClick={onUseCurrentTime}
          className="min-h-10 rounded-lg bg-surface-2 px-3 text-xs font-semibold text-fg hover:bg-line"
        >
          Use current time
        </button>
      </div>
      <span
        role="status"
        aria-live="polite"
        className="text-xs text-fg"
      >
        {currentDeviceLocationMessage(locationSource, lat, lon)}
      </span>
      <div className="text-sm lg:hidden">
        {locationSource.status !== "current-device" && (
          <p>
            {selectedPlace?.label ??
              `${lat.toFixed(1)}° latitude, ${lon.toFixed(1)}° longitude`}
          </p>
        )}
        <p>{moment} · mean solar time</p>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="place-search-fields manual-moment-fields"
        onClick={onToggle}
        className="min-h-9 self-start text-sm font-semibold text-gold lg:hidden"
      >
        Change place or time{" "}
        <span aria-hidden="true">{expanded ? "▴" : "▾"}</span>
      </button>
      <div
        id="place-search-fields"
        className={`${expanded ? "flex" : "hidden"} flex-wrap gap-2 lg:flex`}
      >
        <input
          aria-label="Viewing location"
          type="search"
          value={query}
          onChange={(event) => {
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
        <span className="basis-full text-xs text-muted">
          Sets latitude/longitude; civil time is derived from the selected
          position.
        </span>

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
      </div>
    </form>
  );
}
