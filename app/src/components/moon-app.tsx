import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import {
  compass,
  dateInputValue,
  deg1,
  formatClock,
  formatDate,
  formatSolarAndUtc,
  formatUtcMomentLine,
  fromLocal,
  localParts,
  nearestFullEvening,
  timeInputValue,
} from "@/lib/astro";
import { observedViewState } from "@/lib/astronomy/observed";
import {
  formatCivilTime,
  lookupTimeZone,
  type CivilTimeInfo,
} from "@/lib/civil-time";
import { composeCivilTimeLine } from "@/lib/civil-time-line";
import { resolveInitialInstant } from "@/lib/initial-instant";
import {
  locationMemoryValue,
  parseLocationMemory,
  rememberedPlaceAfterCoordinateChange,
  resolveInitialLocation,
  type LocationMemory,
  type RememberedPlace,
} from "@/lib/location-memory";
import { useMoon, type Play, type Snap } from "@/lib/store";
import {
  instantForTimeScrubberMinute,
  timeScrubberMinute,
} from "@/lib/time-scrubber";
import { useCivilTime } from "@/lib/use-civil-time";
import {
  currentDeviceLocationAvailable,
  initialViewingLocationSource,
  roundDeviceLocation,
  requestCurrentDevicePosition,
  transitionViewingLocationSource,
} from "@/lib/viewing-location";
import {
  createShareInfographic,
  shareInfographicFilename,
} from "@/lib/share-infographic";
import { AppDialog, AppDialogDescription, AppDialogTitle } from "./app-dialog";
import { DeclinationDiagram } from "./declination-diagram";
import { CheckPrediction } from "./explain-check";
import { LocalSkyCoordinateDiagrams } from "./local-sky-coordinate-diagrams";
import { LocalSkyHeader } from "./local-sky-header";
import { MoonPhase } from "./moon-phase";
import { PlaceSearch } from "./place-search";
import { OrientationControl } from "./orientation-control";
import { SpaceScene } from "./space-scene";
import { ShareInfographicDialog } from "./share-infographic-dialog";
import { TimeScrubber } from "./time-scrubber";

const SNAPS: { id: Snap; label: string }[] = [
  { id: "oblique", label: "Three-quarter" },
  { id: "edge", label: "Edge-on" },
  { id: "north", label: "From the north" },
];

type ExplainTab = "summary" | "calculation" | "check" | "science" | "limits";

const EXPLAIN_TABS: { id: ExplainTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "calculation", label: "How was this calculated?" },
  { id: "check", label: "How can I check it?" },
  { id: "science", label: "Scientific basis" },
  { id: "limits", label: "Limits" },
];

type UrlState = {
  lat?: number;
  lon?: number;
  date?: string;
  time?: string;
};

function validDate(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  )
    return undefined;
  return value;
}

function validTime(value: string | null): string | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return value;
}

function validNumber(
  value: string | null,
  min: number,
  max: number,
): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    return undefined;
  return parsed;
}

function readUrlState(): UrlState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    lat: validNumber(params.get("lat"), -90, 90),
    lon: validNumber(params.get("lon"), -180, 180),
    date: validDate(params.get("date")),
    time: validTime(params.get("time")),
  };
}

function urlForState(lat: number, lon: number, instant: number) {
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(lon * 10) / 10;
  const params = new URLSearchParams({
    lat: roundedLat.toFixed(1),
    lon: roundedLon.toFixed(1),
    date: dateInputValue(instant, roundedLon),
    time: timeInputValue(instant, roundedLon),
  });
  return `${window.location.pathname}?${params.toString()}`;
}

export function MoonApp() {
  const navigate = useNavigate();
  const instant = useMoon((s) => s.instant);
  const orbit = useMoon((s) => s.orbit);
  const lat = useMoon((s) => s.lat);
  const lon = useMoon((s) => s.lon);
  const playing = useMoon((s) => s.playing);
  const spinHours = useMoon((s) => s.spinHours);
  const snap = useMoon((s) => s.snap);
  const setInstant = useMoon((s) => s.setInstant);
  const setLat = useMoon((s) => s.setLat);
  const setLon = useMoon((s) => s.setLon);
  const setPlaying = useMoon((s) => s.setPlaying);
  const setSpinHours = useMoon((s) => s.setSpinHours);
  const setSnap = useMoon((s) => s.setSnap);
  // A native time input reports an empty value while any segment is incomplete.
  // Keep that edit local, tied to the moment/location it started from.
  const [timeDraft, setTimeDraft] = useState<{
    instant: number;
    lon: number;
    value: string;
  } | null>(null);
  const editableTime =
    timeDraft?.instant === instant && timeDraft.lon === lon
      ? timeDraft.value
      : timeInputValue(instant, lon);
  const [mounted, setMounted] = useState(false);
  const [explainTrigger, setExplainTrigger] =
    useState<HTMLButtonElement | null>(null);
  const [explainTab, setExplainTab] = useState<ExplainTab>("summary");
  const [orbitInfoOpen, setOrbitInfoOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [shortLandscape, setShortLandscape] = useState(false);
  const landscapeEditor = manualOpen && shortLandscape;
  const focusPrimaryOnOpen = useRef(false);
  const primaryFocusBeforeResize = useRef<string | null>(null);
  useLayoutEffect(() => {
    const selector = primaryFocusBeforeResize.current;
    if (selector) {
      document
        .querySelector<HTMLElement>(selector)
        ?.focus({ preventScroll: true });
    } else if (landscapeEditor && focusPrimaryOnOpen.current) {
      document.getElementById("mean-solar-time")?.focus();
    }
    primaryFocusBeforeResize.current = null;
    focusPrimaryOnOpen.current = false;
  }, [landscapeEditor, shortLandscape]);
  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 640px) and (max-width: 1023px) and (max-height: 540px)",
    );
    const update = () => {
      // Inputs move only at this mode boundary; the charts never move in React.
      const active = document.activeElement;
      primaryFocusBeforeResize.current =
        active?.id === "mean-solar-time" || active?.id === "observer-latitude"
          ? `#${active.id}`
          : active?.matches('.observation-time input[type="range"]')
            ? '.observation-time input[type="range"]'
            : null;
      setShortLandscape(media.matches);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [selectedPlace, setSelectedPlace] = useState<RememberedPlace | null>(
    null,
  );
  const [viewingLocationSource, setViewingLocationSource] = useState(
    initialViewingLocationSource,
  );
  const [viewingLocationRevision, setViewingLocationRevision] = useState(0);
  const currentLocationRequestRef = useRef(0);
  const [shareTrigger, setShareTrigger] = useState<HTMLButtonElement | null>(
    null,
  );
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [shareFilename, setShareFilename] = useState("moon-geometry.png");
  const civilTime = useCivilTime(instant, lat, lon);

  useEffect(() => {
    return () => {
      if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
    };
  }, [sharePreviewUrl]);

  useEffect(() => {
    const urlState = readUrlState();
    let nextSpinHours = spinHours;
    let saved: LocationMemory = {};
    try {
      saved = parseLocationMemory(localStorage.getItem("moonpath-place"));
    } catch {
      /* Browser storage can be unavailable without blocking the app. */
    }
    if (saved.spinHours !== undefined) nextSpinHours = saved.spinHours;
    const initialLocation = resolveInitialLocation(
      saved,
      urlState.lat,
      urlState.lon,
      lat,
      lon,
    );
    const nextLat = initialLocation.lat;
    const nextLon = initialLocation.lon;

    setLat(nextLat);
    setLon(nextLon);
    setSpinHours(nextSpinHours);
    setSelectedPlace(initialLocation.place);

    setInstant(resolveInitialInstant(urlState.date, urlState.time, nextLon));

    setMounted(true);
    // Run once: URL query and local storage are initialisation sources only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        "moonpath-place",
        JSON.stringify(locationMemoryValue(lat, lon, spinHours, selectedPlace)),
      );
    } catch {
      /* Browsing still works when storage is unavailable. */
    }
  }, [lat, lon, spinHours, selectedPlace, mounted]);

  useEffect(() => {
    setSelectedPlace((place) =>
      rememberedPlaceAfterCoordinateChange(mounted, place, lat, lon),
    );
  }, [lat, lon, mounted]);

  useEffect(() => {
    if (!mounted || playing !== "none") return;
    // These are in-place control edits, not page navigation. Direct history
    // writes make the router reset scroll and pull mobile sliders offscreen.
    void navigate({
      href: urlForState(lat, lon, instant),
      replace: true,
      resetScroll: false,
    });
  }, [instant, lat, lon, mounted, playing, navigate]);

  const observed = useMemo(
    () => observedViewState(instant, lat, lon, orbit),
    [instant, lat, lon, orbit],
  );
  const sky = observed.snapshot;
  const ev = observed.moonPath;
  const geometricAltDeg = sky.moon.horizontal.altitudeDeg;
  const refractionDeg = sky.moon.horizontal.refractionDeg;
  const altDeg = sky.moon.horizontal.apparentAltitudeDeg;
  const azDeg = sky.moon.horizontal.azimuthDeg;
  const hourAngleDeg = (sky.moon.horizontal.hourAngle * 180) / Math.PI;
  const moonEclLonDeg = sky.moon.ecliptic.longitudeDeg;
  const moonEclLatDeg = sky.moon.ecliptic.latitudeDeg;
  const riseLabel = ev.rise
    ? formatSolarAndUtc(ev.rise, lon)
    : ev.alwaysUp
      ? "Up all day"
      : ev.alwaysDown
        ? "Does not rise"
        : "—";
  const setLabel = ev.set
    ? formatSolarAndUtc(ev.set, lon)
    : ev.alwaysUp
      ? "Up all day"
      : ev.alwaysDown
        ? "Does not set"
        : "—";
  const riseValue = ev.rise ? (
    <SolarUtcValue instant={ev.rise} lon={lon} />
  ) : (
    riseLabel
  );
  const setValue = ev.set ? (
    <SolarUtcValue instant={ev.set} lon={lon} />
  ) : (
    setLabel
  );
  const altitudeLabel = altDeg < 0 ? "Below horizon" : deg1(altDeg);
  const azimuthLabel = `${deg1(azDeg)} · ${compass(azDeg)}`;
  const scrubberMinute = timeScrubberMinute(instant, lon);

  const motion =
    playing === "spin"
      ? spinHours < 12
        ? "Earth is turning. The Moon barely moves, so you are watching one night’s arc."
        : "Time is running quickly, so the Sun’s path and the Moon’s declination walk through the year."
      : playing === "slide"
        ? "One day at a time, same clock. Declination changes steadily, so the arc drifts rather than jumping."
        : "Green is the equator Earth spins on. Gold is the ecliptic, and the arrows are sunlight in that plane. Silver is the Moon, five degrees off the gold. The continents are schematic orientation cues, not a detailed map.";

  const onDate = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return;
    const p = localParts(instant, lon);
    setInstant(fromLocal(y, m - 1, d, p.h, p.min, lon));
  };
  const onTime = (value: string) => {
    setTimeDraft({ instant, lon, value });
    if (!validTime(value)) return;
    const [h, min] = value.split(":").map(Number);
    const p = localParts(instant, lon);
    setInstant(fromLocal(p.y, p.m, p.day, h, min, lon));
  };
  const onTimeScrub = (minute: number) => {
    setPlaying("none");
    setInstant(instantForTimeScrubberMinute(instant, lon, minute));
  };

  const clearCurrentDeviceSource = (change: "search" | "manual") => {
    currentLocationRequestRef.current += 1;
    setViewingLocationRevision((revision) => revision + 1);
    const transition = transitionViewingLocationSource(viewingLocationSource, {
      type: "external-change",
      change,
    });
    setViewingLocationSource(transition.state);
    if (transition.stopOrientation) setPlaying("none");
  };

  const requestCurrentLocation = async () => {
    const requestId = ++currentLocationRequestRef.current;
    setViewingLocationRevision((revision) => revision + 1);
    setViewingLocationSource(
      transitionViewingLocationSource(viewingLocationSource, {
        type: "request",
      }).state,
    );
    const result = await requestCurrentDevicePosition({
      isSecureContext: () => window.isSecureContext,
      getCurrentPosition:
        navigator.geolocation === undefined
          ? null
          : (success, error, options) =>
              navigator.geolocation.getCurrentPosition(
                (position) =>
                  success({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  }),
                (positionError) => error({ code: positionError.code }),
                options,
              ),
    });
    if (requestId !== currentLocationRequestRef.current) return;
    if (!result.ok) {
      setManualOpen(true);
      setViewingLocationSource(
        transitionViewingLocationSource(
          { status: "requesting" },
          { type: "failure", reason: result.reason },
        ).state,
      );
      return;
    }
    const transition = transitionViewingLocationSource(
      { status: "requesting" },
      { type: "success" },
    );
    setViewingLocationRevision((revision) => revision + 1);
    setPlaying("none");
    setSelectedPlace(null);
    setLat(result.location.latDeg);
    setLon(result.location.lonDeg);
    setViewingLocationSource(transition.state);
  };

  const toggle = (mode: Play) => setPlaying(playing === mode ? "none" : mode);

  const openShare = async (trigger: HTMLButtonElement) => {
    setPlaying("none");
    setShareTrigger(trigger);
    setShareLoading(true);
    setShareError(null);
    setShareBlob(null);
    setSharePreviewUrl(null);

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
      const orbitalCanvas = document.querySelector<HTMLCanvasElement>(
        "[data-share-orbit-scene] canvas",
      );
      const skySvg = document.querySelector<SVGSVGElement>(
        "svg[data-share-sky-chart]",
      );
      const phaseSvg = document.querySelector<SVGSVGElement>(
        "svg[data-share-moon-phase]",
      );
      if (!orbitalCanvas || !skySvg || !phaseSvg)
        throw new Error("The diagrams are not ready to export yet.");

      let shareCivilTime: CivilTimeInfo | null =
        civilTime.status === "ready" && !civilTime.refreshingCoordinates
          ? civilTime.value
          : null;
      if (shareCivilTime === null) {
        const timeZoneId = await lookupTimeZone(lat, lon);
        shareCivilTime = timeZoneId
          ? formatCivilTime(instant, timeZoneId)
          : null;
      }

      const filename = shareInfographicFilename(instant, lon);
      const result = await createShareInfographic({
        orbitalCanvas,
        skySvg,
        phaseSvg,
        instant,
        lat,
        lon,
        placeLabel: selectedPlace?.label ?? null,
        civilTimeLine: shareCivilTime
          ? composeCivilTimeLine(shareCivilTime, localParts(instant, lon).y)
          : "Civil · unavailable",
        phaseName: sky.moon.phaseName,
        illuminationPercent: Math.round(sky.moon.illumination * 100),
        altitudeDeg: altDeg,
        azimuthDeg: azDeg,
        declinationDeg: sky.decDeg,
        transitAltitudeDeg: ev.transitAlt,
        appUrl: `${window.location.origin}${window.location.pathname}`,
      });
      setShareFilename(filename);
      setShareBlob(result.blob);
      setSharePreviewUrl(URL.createObjectURL(result.blob));
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "The PNG could not be generated.",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const primaryFields = (
    <>
      <div className="observation-time flex flex-col gap-0.5 text-sm text-muted lg:col-span-2">
        <label htmlFor="mean-solar-time">Mean solar time</label>
        <input
          id="mean-solar-time"
          type="time"
          value={editableTime}
          onChange={(e) => onTime(e.target.value)}
          onBlur={() => setTimeDraft(null)}
          suppressHydrationWarning
          className="min-h-9 rounded-lg bg-surface-2 px-3 text-fg"
        />
        <TimeScrubber minute={scrubberMinute} onChange={onTimeScrub} />
        <span className="text-xs text-muted">
          {formatUtcMomentLine(instant, lon)}
        </span>
        <span
          className="text-xs text-muted"
          title={
            civilTime.status === "ready"
              ? `IANA zone: ${civilTime.value.timeZoneId}`
              : undefined
          }
        >
          {civilTime.status === "loading"
            ? "Civil · calculating…"
            : civilTime.status === "unavailable"
              ? "Civil · unavailable"
              : composeCivilTimeLine(
                  civilTime.value,
                  localParts(instant, lon).y,
                )}
        </span>
      </div>
      <Slider
        id="observer-latitude"
        label={`Latitude ${lat.toFixed(1)}°`}
        min={-90}
        max={90}
        step={0.1}
        value={lat}
        onChange={(value) => {
          clearCurrentDeviceSource("manual");
          setLat(value);
        }}
      />
    </>
  );

  return (
    <>
      <main
        data-landscape-editor={landscapeEditor || undefined}
        className="moon-workspace mx-auto min-h-screen w-full max-w-7xl gap-2 px-4 py-2 lg:px-5 lg:py-2.5"
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-widest text-gold uppercase">
              Angles true · distances fiction
            </p>
            <h1 className="font-display text-3xl text-fg">Moon Geometry</h1>
            <nav
              aria-label="Workspaces"
              className="mt-1 flex gap-4 text-sm text-muted [&_[aria-current=page]]:border-b-2 [&_[aria-current=page]]:border-gold [&_[aria-current=page]]:text-fg"
            >
              <a href="/" aria-current="page">
                Moon Path
              </a>
              <a
                href="/lunar-parallax/"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      "moon-path-return",
                      urlForState(lat, lon, instant),
                    );
                  } catch {
                    /* Storage is optional. */
                  }
                }}
              >
                Lunar Parallax
              </a>
            </nav>
          </div>
          <div className="max-w-2xl text-sm leading-5 text-muted lg:text-right">
            <p>
              {
                "See how the Moon’s orbit and declination shape its path across your local sky for any latitude, longitude, date and mean solar time."
              }
            </p>
            <a
              href="/guide/"
              className="mt-1 inline-block text-xs font-semibold text-gold underline decoration-gold/40 underline-offset-4 hover:text-fg"
            >
              How it works
            </a>
          </div>
        </header>

        <OrientationControl
          snapshot={sky}
          moonPath={observed.moonPath}
          sunPath={observed.sunPath}
          selectedLatDeg={lat}
          selectedLonDeg={lon}
          currentLocationAvailable={currentDeviceLocationAvailable(
            viewingLocationSource,
          )}
          locationRevision={viewingLocationRevision}
          instant={instant}
          stopAnimation={() => setPlaying("none")}

          adoptDeviceLocation={(deviceLat, deviceLon) => {
            const deviceLocation = roundDeviceLocation(deviceLat, deviceLon);
            if (deviceLocation === null) return;
            setSelectedPlace(null);
            setLat(deviceLocation.latDeg);
            setLon(deviceLocation.lonDeg);
          }}
        >
          {({ controls, status, chart, orientationActive }) => (
            <section className="local-sky-panel flex flex-col gap-2 rounded-card bg-surface p-3">
              <LocalSkyHeader
                phase={
                  <MoonPhase
                    illumination={sky.moon.illumination}
                    waxing={sky.moon.waxing}
                    latitude={lat}
                    size={44}
                  />
                }
                title={
                  <>
                    <h2 className="text-sm font-semibold text-fg">
                      Local sky path
                    </h2>
                    <p className="font-display text-xl text-fg">
                      {sky.moon.phaseName}
                    </p>
                    <p className="text-sm text-muted">
                      {Math.round(sky.moon.illumination * 100)}% lit ·{" "}
                      {formatDate(instant, lon)} {formatClock(instant, lon)}
                    </p>
                  </>
                }
                controls={
                  <>
                    {controls}
                    <button
                      type="button"
                      onClick={(event) => void openShare(event.currentTarget)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-line"
                    >
                      <Share2 size={14} aria-hidden="true" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        setExplainTrigger(event.currentTarget)
                      }
                      className="min-h-9 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-line"
                    >
                      Explain
                    </button>
                  </>
                }
              />
              {status}
              {orbit !== instant || playing === "slide" ? (
                <p className="text-xs text-muted">
                  <span className="font-semibold text-gold">
                    Simulated sky.
                  </span>{" "}
                  The orbital position moves separately from the observer’s
                  clock. Set the date and time again before comparing this sky
                  with an observation.
                </p>
              ) : null}
              <p className="text-sm text-fg lg:hidden">
                {altDeg < 0
                  ? "The Moon is below the horizon."
                  : `The Moon is ${deg1(altDeg)} above the horizon, toward ${compass(azDeg)}.`}
              </p>
              <div className="sky-comparison">
                <div
                  className={
                    orientationActive
                      ? "relative h-[23rem] max-h-[62vh] min-h-72"
                      : "relative h-52 lg:h-64"
                  }
                >
                  {chart}
                </div>
                {landscapeEditor && (
                  <fieldset
                    id="primary-observation-fields"
                    className="primary-observation-fields"
                  >
                    <legend className="sr-only">Time and latitude</legend>
                    {primaryFields}
                  </fieldset>
                )}
              </div>
              <p className="text-xs text-muted">
                Center is the zenith over the selected latitude/longitude. Gold
                path/dot = Sun; silver path/dot = Moon
                {orientationActive
                  ? ". Fixed scale and sight stay aligned with the phone’s top edge."
                  : "; small tick = top of Moon path."}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Stat
                  k={
                    <>
                      <span>Apparent altitude</span>
                      <span className="rounded-full border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        Standard atmosphere
                      </span>
                    </>
                  }
                  v={altitudeLabel}
                />
                <Stat k="Azimuth" v={azimuthLabel} />
                <Stat k="Declination" v={deg1(sky.decDeg)} />
                <Stat
                  k="Top of path"
                  v={ev.transitAlt == null ? "—" : deg1(ev.transitAlt)}
                />
                <Stat k="Rise · mean solar" v={riseValue} />
                <Stat k="Set · mean solar" v={setValue} />
              </dl>
              <p className="text-xs text-muted">
                Rise/set · Moon centre, standard refraction
              </p>
              <p className="text-sm text-fg">
                Geometric h at meridian = 90° − |{lat.toFixed(1)}° −{" "}
                {deg1(sky.decDeg)}|; the displayed path adds refraction.
              </p>
            </section>
          )}
        </OrientationControl>

        <section
          aria-label="Place and time"
          className="place-time-panel grid gap-2 rounded-card bg-surface p-2.5 sm:grid-cols-2 lg:grid-cols-9"
        >
          <PlaceSearch
            lat={lat}
            lon={lon}
            selectedPlace={selectedPlace}
            locationSource={viewingLocationSource}
            onUseCurrentLocation={() => void requestCurrentLocation()}
            onUseCurrentTime={() => setInstant(Date.now())}
            moment={`${formatDate(instant, lon)} ${formatClock(instant, lon)}`}
            expanded={manualOpen}
            primaryFieldsId={
              landscapeEditor ? "primary-observation-fields" : undefined
            }
            onToggle={(event) => {
              focusPrimaryOnOpen.current =
                shortLandscape && !manualOpen && event.detail === 0;
              setManualOpen((open) => !open);
            }}
            onSelect={(place) => {
              clearCurrentDeviceSource("search");
              setSelectedPlace({
                label: place.label,
                lat: place.lat,
                lon: place.lon,
              });
              setLat(place.lat);
              setLon(place.lon);
            }}
          />
          <div
            id="manual-moment-fields"
            className={manualOpen ? "contents" : "hidden lg:contents"}
          >
            <label className="flex flex-col gap-1 text-sm text-muted">
              Date
              <input
                type="date"
                value={dateInputValue(instant, lon)}
                onChange={(e) => onDate(e.target.value)}
                suppressHydrationWarning
                className="min-h-9 rounded-lg bg-surface-2 px-3 text-fg"
              />
            </label>
            {!landscapeEditor && primaryFields}
            <Slider
              label={`Longitude ${lon.toFixed(1)}°`}
              min={-180}
              max={180}
              step={0.1}
              value={lon}
              onChange={(value) => {
                clearCurrentDeviceSource("manual");
                setLon(value);
              }}
            />
            <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2 lg:col-span-2">
              Earth spin · {formatSpin(spinHours)}
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                aria-valuetext={formatSpin(spinHours)}
                value={spinToSlider(spinHours)}
                onChange={(e) =>
                  setSpinHours(sliderToSpin(Number(e.target.value)))
                }
                suppressHydrationWarning
                className="h-9 w-full accent-gold"
              />
            </label>
            <p className="text-xs text-muted sm:col-span-2 lg:col-span-9">
              Apparent altitude and centre rise/set use a standard atmosphere.
              Terrain, weather and the Moon’s apparent edge are not included.
              Distances remain schematic. Drag the model to turn it. In Edge-on
              view, drag the north-axis tip to level the equator or ecliptic.
              The Earth spin slider sets the pace, from one night up to a whole
              year. Slide the Moon holds the clock and lets declination drift.
            </p>
          </div>
        </section>
        <section className="orbital-panel order-last flex flex-col overflow-hidden rounded-card bg-surface lg:order-first">
          <div className="relative h-80 min-h-72 lg:h-[24.25rem]">
            <SpaceScene snapshot={sky} orbitInstant={orbit} />
            <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 text-xs">
              <h2 className="mb-1 text-sm font-semibold text-fg">
                Orbital geometry
              </h2>
              <span className="text-equator">Equator</span>
              <span className="text-gold">Ecliptic 23.4°</span>
              <span className="text-gold">Parallel sunlight</span>
              <span className="text-silver">Moon orbit 5.1°</span>
            </div>
            <button
              type="button"
              aria-label="Explain the orbital geometry colors"
              onClick={() => setOrbitInfoOpen((open) => !open)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-fg ring-1 ring-line hover:bg-line"
            >
              i
            </button>
            {orbitInfoOpen ? (
              <div className="absolute right-3 top-12 max-w-sm rounded-lg bg-bg/95 p-3 text-xs leading-5 text-muted ring-1 ring-line shadow-xl">
                <button
                  type="button"
                  aria-label="Close orbital geometry note"
                  onClick={() => setOrbitInfoOpen(false)}
                  className="float-right ml-3 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg hover:bg-line"
                >
                  ×
                </button>
                {motion}
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 p-2.5">
            {altDeg < 0 ? (
              <p className="text-xs text-muted">
                {orbit !== instant || playing === "slide"
                  ? "Simulated Moon below your horizon"
                  : "Moon below your horizon"}{" "}
                — Earth blocks the sightline.
              </p>
            ) : null}
            <div>
              <p className="mb-1 text-[0.68rem] font-semibold tracking-widest text-muted uppercase">
                Model view
              </p>
              <div className="flex flex-wrap gap-2">
                {SNAPS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={snap === item.id}
                    onClick={() => setSnap(item.id)}
                    className={
                      "min-h-9 rounded-full px-3 text-sm " +
                      (snap === item.id
                        ? "bg-fg text-bg"
                        : "bg-surface-2 text-fg")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[0.68rem] font-semibold tracking-widest text-muted uppercase">
                Animate / presets
              </p>
              <div className="flex flex-wrap gap-2">
                <Toggle on={playing === "spin"} onClick={() => toggle("spin")}>
                  Spin Earth
                </Toggle>
                <Toggle
                  on={playing === "slide"}
                  onClick={() => toggle("slide")}
                >
                  Slide the Moon
                </Toggle>
                <button
                  type="button"
                  className="min-h-9 rounded-full bg-surface-2 px-3 text-sm text-fg"
                  onClick={() => setInstant(nearestFullEvening(2026, 11, lon))}
                >
                  Winter full Moon
                </button>
                <button
                  type="button"
                  className="min-h-9 rounded-full bg-surface-2 px-3 text-sm text-fg"
                  onClick={() => setInstant(nearestFullEvening(2026, 5, lon))}
                >
                  Summer full Moon
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      {explainTrigger ? (
        <ExplainPanel
          returnFocusTo={explainTrigger}
          tab={explainTab}
          setTab={setExplainTab}
          onClose={() => setExplainTrigger(null)}
          lat={lat}
          lon={lon}
          dateLabel={`${formatDate(instant, lon)} ${formatClock(instant, lon)}`}
          phaseName={sky.moon.phaseName}
          illumination={sky.moon.illumination}
          altitudeDeg={altDeg}
          geometricAltitudeDeg={geometricAltDeg}
          refractionDeg={refractionDeg}
          azimuthDeg={azDeg}
          declinationDeg={sky.decDeg}
          hourAngleDeg={hourAngleDeg}
          moonEclLonDeg={moonEclLonDeg}
          moonEclLatDeg={moonEclLatDeg}
          rise={riseLabel}
          set={setLabel}
        />
      ) : null}
      {shareTrigger ? (
        <ShareInfographicDialog
          returnFocusTo={shareTrigger}
          previewUrl={sharePreviewUrl}
          blob={shareBlob}
          filename={shareFilename}
          loading={shareLoading}
          error={shareError}
          onClose={() => setShareTrigger(null)}
        />
      ) : null}
    </>
  );
}

function ExplainPanel({
  tab,
  setTab,
  onClose,
  returnFocusTo,
  lat,
  lon,
  dateLabel,
  phaseName,
  illumination,
  altitudeDeg,
  geometricAltitudeDeg,
  refractionDeg,
  azimuthDeg,
  declinationDeg,
  hourAngleDeg,
  moonEclLonDeg,
  moonEclLatDeg,
  rise,
  set,
}: {
  tab: ExplainTab;
  setTab: (tab: ExplainTab) => void;
  onClose: () => void;
  returnFocusTo: HTMLButtonElement;
  lat: number;
  lon: number;
  dateLabel: string;
  phaseName: string;
  illumination: number;
  altitudeDeg: number;
  geometricAltitudeDeg: number;
  refractionDeg: number;
  azimuthDeg: number;
  declinationDeg: number;
  hourAngleDeg: number;
  moonEclLonDeg: number;
  moonEclLatDeg: number;
  rise: string;
  set: string;
}) {
  const instant = useMoon((s) => s.instant);
  const simulated = useMoon(
    (s) => s.orbit !== s.instant || s.playing === "slide",
  );
  const refractionLabel = `${(refractionDeg * 60).toFixed(1)}′`;
  const geometricDetail = `${geometricAltitudeDeg < 0 ? "−" : ""}${Math.abs(geometricAltitudeDeg).toFixed(3)}°`;
  const refractionDetail = `${refractionDeg.toFixed(3)}°`;
  const apparentDetail = `${altitudeDeg < 0 ? "−" : ""}${Math.abs(altitudeDeg).toFixed(3)}°`;
  return (
    <AppDialog
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      overlayClassName="fixed inset-0 z-50 flex justify-end bg-black/55 p-3"
    >
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-surface text-fg shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div>
            <AppDialogTitle asChild>
              <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                Explain this moment
              </p>
            </AppDialogTitle>
            <AppDialogDescription asChild>
              <h2 className="font-display text-2xl">
                Why the Moon appears there now
              </h2>
            </AppDialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-fg hover:bg-line"
          >
            Close
          </button>
        </header>

        <nav
          className="flex flex-wrap gap-2 border-b border-line p-3"
          aria-label="Explanation sections"
        >
          {EXPLAIN_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={item.id === tab}
              className={
                "rounded-full px-3 py-1.5 text-sm font-semibold " +
                (tab === item.id ? "bg-fg text-bg" : "bg-surface-2 text-fg")
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm leading-6 text-muted">
          {simulated && (
            <p className="mb-4 border-l-2 border-gold pl-3 text-fg">
              Slide the Moon simulation: the orbital position moves separately
              from the observer’s clock. Set the date and time again before
              comparing this sky with an observation.
            </p>
          )}
          {tab === "check" && <CheckPrediction />}
          {tab === "summary" ? (
            <div className="space-y-3">
              <p className="text-base text-fg">
                The left diagram is a schematic orrery: ephemeris directions set
                the Sun and Moon angles, while sizes and distances are
                simplified. The right diagram applies Earth's rotation, your
                position and observer parallax to show the local sky.
              </p>
              <ValueGrid
                rows={[
                  ["Observer", `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`],
                  ["Moment", dateLabel],
                  [
                    "Phase",
                    `${phaseName}, ${Math.round(illumination * 100)}% lit`,
                  ],
                  [
                    "Apparent altitude",
                    altitudeDeg < 0 ? "Below horizon" : deg1(altitudeDeg),
                  ],
                  ["Azimuth", `${deg1(azimuthDeg)} · ${compass(azimuthDeg)}`],
                  ["Rise / set · mean solar, then UTC", `${rise} / ${set}`],
                ]}
              />
              <p>
                The key bridge is{" "}
                <strong className="text-fg">declination</strong>: the Moon's
                orbital position gives it a north/south angle on the celestial
                sphere. From your latitude, that declination determines how high
                its daily arc can climb. Earth's rotation then moves that arc
                across your local sky during the day.
              </p>
              <DeclinationDiagram />
              <LocalSkyCoordinateDiagrams />
            </div>
          ) : null}

          {tab === "calculation" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Inputs for this sky</p>
              <ValueGrid
                rows={[
                  ["Latitude / longitude", `${lat}°, ${lon}°`],
                  ["Mean solar time", dateLabel],
                  ["Observer clock (UTC)", new Date(instant).toISOString()],
                ]}
              />
              <h3 className="text-base text-fg">
                Model: from orbit to your sky
              </h3>
              <p>
                Astronomy Engine calculates the Moon’s direction from Earth’s
                centre, then shifts the viewpoint to your location at sea level.
                Earth’s rotation sets the direction of your local meridian.
              </p>
              <ValueGrid
                rows={[
                  ["Geocentric ecliptic longitude", deg1(moonEclLonDeg)],
                  ["Geocentric ecliptic latitude", deg1(moonEclLatDeg)],
                  ["Moon declination", deg1(declinationDeg)],
                  ["Hour angle", deg1(hourAngleDeg)],
                ]}
              />
              <h3 className="text-base text-fg">
                Calculated results · Moon centre
              </h3>
              <ValueGrid
                rows={[
                  ["Geometric altitude", deg1(geometricAltitudeDeg)],
                  ["Atmospheric refraction", `+${refractionLabel}`],
                  ["Apparent altitude", deg1(altitudeDeg)],
                  [
                    "Azimuth result",
                    `${deg1(azimuthDeg)} · ${compass(azimuthDeg)}`,
                  ],
                ]}
              />
              <div className="rounded-lg bg-bg/60 p-3 font-mono text-xs text-fg">
                <div>h geometric = asin( sin φ sin δ + cos φ cos δ cos H )</div>
                <div>φ = observer latitude = {deg1(lat)}</div>
                <div>δ = Moon declination = {deg1(declinationDeg)}</div>
                <div>H = local hour angle = {deg1(hourAngleDeg)}</div>
                <div>h geometric ≈ {geometricDetail}</div>
                <div>h apparent = h geometric + R(h geometric)</div>
                <div>
                  h apparent ≈ {geometricDetail} + {refractionDetail} ≈{" "}
                  {apparentDetail}
                </div>
              </div>
              <p className="text-xs">
                Worked values are rounded. The addition uses degrees; the
                refraction above is in arcminutes (60′ = 1°).
              </p>
              <p>
                The ephemeris supplies the Moon's topocentric equatorial-of-date
                declination and hour angle after observer parallax is applied.
                This standard spherical-astronomy conversion turns those values
                into geometric local horizon coordinates. A standard sea-level
                atmosphere is then used to lift the altitude by the displayed
                refraction amount; azimuth is unchanged.
              </p>
            </div>
          ) : null}

          {tab === "science" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Scientific basis and history</p>
              <p>
                The observed display is calculated locally through the pinned
                Astronomy Engine ephemeris provider. Sun and Moon positions,
                lunar phase and illumination come from that provider; local-sky
                positions are topocentric and include observer parallax. No
                network ephemeris call is made at runtime.
              </p>
              <ul className="space-y-3">
                <li>
                  <strong className="text-fg">Implemented here:</strong>{" "}
                  ephemeris-backed Sun and Moon directions, lunar ecliptic
                  coordinates, phase and illumination; topocentric declination,
                  geometric and standard-atmosphere apparent altitude and
                  azimuth; and locally sampled sky paths with apparent-centre
                  rise/set.
                </li>
                <li>
                  <strong className="text-fg">Kepler</strong> provides
                  historical and physical context for elliptical orbital motion.
                  The active ephemeris accounts for real orbital variation; the
                  drawn orbit hoop remains a simplified teaching shape.
                </li>
                <li>
                  <strong className="text-fg">Newton</strong> is context for the
                  physical cause of orbital motion: gravity and motion. The app
                  does not numerically integrate gravitational forces.
                </li>
                <li>
                  <strong className="text-fg">Cassini</strong> is context for
                  lunar rotation and orientation: the Moon's synchronous spin
                  and the relationship between its equator, orbit plane and the
                  ecliptic. Libration and detailed Cassini-state orientation are
                  not rendered.
                </li>
                <li>
                  <strong className="text-fg">Modern ephemerides</strong> use
                  defined reference frames, time standards, perturbation models
                  and observer corrections. This app uses an ephemeris provider
                  for its observed values, while keeping the visual model
                  intentionally schematic.
                </li>
              </ul>
              <p className="text-base text-fg">Further reading</p>
              <ul className="grid gap-2">
                <ReferenceLink
                  href="https://www.britannica.com/science/Cassinis-laws"
                  label="Britannica — Cassini's laws"
                />
                <ReferenceLink
                  href="https://www.britannica.com/science/Keplers-laws-of-planetary-motion"
                  label="Britannica — Kepler's laws of planetary motion"
                />
                <ReferenceLink
                  href="https://www.britannica.com/science/gravity-physics/Newtons-law-of-gravity"
                  label="Britannica — Newton's law of gravity"
                />
                <ReferenceLink
                  href="https://aa.usno.navy.mil/publications/asa"
                  label="USNO — The Astronomical Almanac"
                />
                <ReferenceLink
                  href="https://aa.usno.navy.mil/publications/exp_supp"
                  label="USNO — Explanatory Supplement to the Astronomical Almanac"
                />
                <ReferenceLink
                  href="https://farside.ph.utexas.edu/teaching/celestial/Celestial/node76.html"
                  label="University of Texas — Cassini's laws notes"
                />
                <ReferenceLink
                  href="https://www.aanda.org/articles/aa/full_html/2015/10/aa25939-15/aa25939-15.html"
                  label="Astronomy & Astrophysics — Cassini states"
                />
              </ul>
            </div>
          ) : null}

          {tab === "limits" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Model limits</p>
              <p>
                This is an educational geometry app, not a precision navigation
                or almanac tool. Ephemeris-backed observed values and the
                schematic orrery serve different purposes.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Apparent altitude and rise/set use a standard sea-level
                  atmosphere. Rise/set is the Moon centre crossing apparent
                  altitude 0°; apparent disk radius, terrain, observer elevation
                  and actual weather are not included.
                </li>
                <li>
                  Object sizes, distances, orbit-hoop radius, sunlight-ray
                  length, continents and overall scale are deliberately
                  unrealistic.
                </li>
                <li>
                  Geocentric ephemeris directions set the orrery's Sun and Moon
                  angles, but its visual geometry is simplified.
                </li>
                <li>
                  Libration and detailed lunar surface or Cassini-state
                  orientation are outside the current scope.
                </li>
                <li>
                  Phone magnetic headings are corrected locally with the World
                  Magnetic Model when a usable reference is available. Phone
                  compasses may still be disturbed by metal, magnets or nearby
                  electronics.
                </li>
                <li>
                  The editable clock is mean solar time at the selected
                  longitude; UTC and civil time are read-only references.
                </li>
                <li>
                  Civil time is derived from an approximate
                  coordinate-to-IANA-zone lookup and the browser's time-zone
                  rules. Verify the named zone when legal, travel, scheduling or
                  operational precision matters, especially near time-zone
                  borders.
                </li>
              </ul>
              <p>
                Use a published almanac or navigation service when its
                conventions and precision matter.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </AppDialog>
  );
}

function ValueGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2 rounded-lg bg-bg/50 p-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="font-semibold text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReferenceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        className="text-gold underline decoration-gold/40 underline-offset-4 hover:text-fg"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>
    </li>
  );
}

function formatSpin(hours: number): string {
  if (hours < 1.5) return `${Math.round(hours * 60)} min each second`;
  if (hours < 36) {
    const h =
      hours < 10
        ? String(Math.round(hours * 10) / 10)
        : String(Math.round(hours));
    return `${h} h each second`;
  }
  const days = hours / 24;
  const d =
    days < 10 ? String(Math.round(days * 10) / 10) : String(Math.round(days));
  return `${d} days each second`;
}

const SPIN_MIN_H = 0.5;
const SPIN_MAX_H = 24 * 30;

function spinToSlider(hours: number): number {
  const t = Math.log(hours / SPIN_MIN_H) / Math.log(SPIN_MAX_H / SPIN_MIN_H);
  return Math.round(Math.min(1, Math.max(0, t)) * 1000);
}

function sliderToSpin(slider: number): number {
  const t = slider / 1000;
  return SPIN_MIN_H * Math.pow(SPIN_MAX_H / SPIN_MIN_H, t);
}

function SolarUtcValue({ instant, lon }: { instant: number; lon: number }) {
  const [solar, utc] = formatSolarAndUtc(instant, lon).split(" · ");
  return (
    <>
      {solar}
      {utc ? <span className="ml-1 text-xs text-muted">· {utc}</span> : null}
    </>
  );
}

function Stat({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div>
      <dt className="flex flex-wrap items-center gap-1.5 text-muted">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}

function Slider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id?: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        suppressHydrationWarning
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full accent-gold"
      />
    </label>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={
        "min-h-9 rounded-full px-3 text-sm " +
        (on ? "bg-gold text-bg" : "bg-surface-2 text-fg")
      }
    >
      {children}
    </button>
  );
}
