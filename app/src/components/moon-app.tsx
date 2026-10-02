import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { useMoon, type Play, type Snap } from "@/lib/store";
import { MoonPhase } from "./moon-phase";
import { PlaceSearch } from "./place-search";
import { SkyChart } from "./sky-chart";
import { SpaceScene } from "./space-scene";

const SNAPS: { id: Snap; label: string }[] = [
  { id: "oblique", label: "Three-quarter" },
  { id: "edge", label: "Edge-on ecliptic" },
  { id: "north", label: "From the north" },
];

type ExplainTab = "summary" | "calculation" | "science" | "limits";

const EXPLAIN_TABS: { id: ExplainTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "calculation", label: "Live calculation" },
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
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return undefined;
  return value;
}

function validTime(value: string | null): string | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return value;
}

function validNumber(value: string | null, min: number, max: number): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
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

function replaceUrlState(lat: number, lon: number, instant: number) {
  if (typeof window === "undefined") return;
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(lon * 10) / 10;
  const params = new URLSearchParams({
    lat: roundedLat.toFixed(1),
    lon: roundedLon.toFixed(1),
    date: dateInputValue(instant, roundedLon),
    time: timeInputValue(instant, roundedLon),
  });
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", next);
}

export function MoonApp() {
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
  const [mounted, setMounted] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainTab, setExplainTab] = useState<ExplainTab>("summary");
  const [orbitInfoOpen, setOrbitInfoOpen] = useState(false);

  useEffect(() => {
    const urlState = readUrlState();
    let nextLat = lat;
    let nextLon = lon;
    let nextSpinHours = spinHours;
    try {
      const raw = localStorage.getItem("moonpath-place");
      if (raw) {
        const saved = JSON.parse(raw) as { lat?: number; lon?: number; spinHours?: number };
        if (typeof saved.lat === "number") nextLat = saved.lat;
        if (typeof saved.lon === "number") nextLon = saved.lon;
        if (typeof saved.spinHours === "number") nextSpinHours = saved.spinHours;
      }
    } catch {
      /* ignore broken local storage */
    }

    if (urlState.lat !== undefined) nextLat = urlState.lat;
    if (urlState.lon !== undefined) nextLon = urlState.lon;

    setLat(nextLat);
    setLon(nextLon);
    setSpinHours(nextSpinHours);

    if (urlState.date && urlState.time) {
      const [y, m, d] = urlState.date.split("-").map(Number);
      const [h, min] = urlState.time.split(":").map(Number);
      setInstant(fromLocal(y, m - 1, d, h, min, nextLon));
    }

    setMounted(true);
    // Run once: URL query and local storage are initialisation sources only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("moonpath-place", JSON.stringify({ lat, lon, spinHours }));
  }, [lat, lon, spinHours, mounted]);

  useEffect(() => {
    if (!mounted || playing !== "none") return;
    replaceUrlState(lat, lon, instant);
  }, [instant, lat, lon, mounted, playing]);

  const observed = useMemo(() => observedViewState(instant, lat, lon, orbit), [instant, lat, lon, orbit]);
  const sky = observed.snapshot;
  const ev = observed.moonPath;
  const altDeg = sky.moon.horizontal.altitudeDeg;
  const azDeg = sky.moon.horizontal.azimuthDeg;
  const hourAngleDeg = sky.moon.horizontal.hourAngle * 180 / Math.PI;
  const moonEclLonDeg = sky.moon.ecliptic.longitudeDeg;
  const moonEclLatDeg = sky.moon.ecliptic.latitudeDeg;
  const riseLabel = ev.rise ? formatSolarAndUtc(ev.rise, lon) : ev.alwaysUp ? "Up all day" : ev.alwaysDown ? "Does not rise" : "—";
  const setLabel = ev.set ? formatSolarAndUtc(ev.set, lon) : ev.alwaysUp ? "Up all day" : ev.alwaysDown ? "Does not set" : "—";
  const riseValue = ev.rise ? <SolarUtcValue instant={ev.rise} lon={lon} /> : riseLabel;
  const setValue = ev.set ? <SolarUtcValue instant={ev.set} lon={lon} /> : setLabel;
  const altitudeLabel = altDeg < 0 ? "Below horizon" : deg1(altDeg);
  const azimuthLabel = `${deg1(azDeg)} · ${compass(azDeg)}`;

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
    const [h, min] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(min)) return;
    const p = localParts(instant, lon);
    setInstant(fromLocal(p.y, p.m, p.day, h, min, lon));
  };

  const toggle = (mode: Play) => setPlaying(playing === mode ? "none" : mode);

  return (
    <>
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-2 px-4 py-2 lg:px-5 lg:py-2.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-gold uppercase">Angles true · distances fiction</p>
          <h1 className="font-display text-3xl text-fg">Moon Geometry</h1>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
        <section className="flex flex-col overflow-hidden rounded-card bg-surface">
          <div className="relative h-80 min-h-72 lg:h-[25.5rem]">
            <SpaceScene snapshot={sky} orbitInstant={orbit} />
            <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 text-xs">
              <span className="mb-1 text-sm font-semibold text-fg">Orbital geometry — the Moon's tilted orbit around Earth</span>
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
            <div>
              <p className="mb-1 text-[0.68rem] font-semibold tracking-widest text-muted uppercase">Model view</p>
              <div className="flex flex-wrap gap-2">
                {SNAPS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={snap === item.id}
                    onClick={() => setSnap(item.id)}
                    className={
                      "min-h-9 rounded-full px-3 text-sm " +
                      (snap === item.id ? "bg-fg text-bg" : "bg-surface-2 text-fg")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[0.68rem] font-semibold tracking-widest text-muted uppercase">Animate / presets</p>
              <div className="flex flex-wrap gap-2">
                <Toggle on={playing === "spin"} onClick={() => toggle("spin")}>Spin Earth</Toggle>
                <Toggle on={playing === "slide"} onClick={() => toggle("slide")}>Slide the Moon</Toggle>
                <button type="button" className="min-h-9 rounded-full bg-surface-2 px-3 text-sm text-fg" onClick={() => setInstant(Date.now())}>
                  Current time
                </button>
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

        <section className="flex flex-col gap-2.5 rounded-card bg-surface p-3">
          <div className="flex items-start gap-3">
            <MoonPhase illumination={sky.moon.illumination} waxing={sky.moon.waxing} latitude={lat} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">Local sky path — the resulting path in your local sky</p>
              <p className="font-display text-xl text-fg">{sky.moon.phaseName}</p>
              <p className="text-sm text-muted">{Math.round(sky.moon.illumination * 100)}% lit · {formatDate(instant, lon)} {formatClock(instant, lon)}</p>
            </div>
            <button
              type="button"
              onClick={() => setExplainOpen(true)}
              className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-line"
            >
              Explain
            </button>
          </div>
          <div className="h-52 sm:h-56">
            <SkyChart snapshot={sky} moonPath={observed.moonPath} sunPath={observed.sunPath} />
          </div>
          <p className="text-xs text-muted">Center is the zenith over the selected latitude/longitude. Gold path/dot = Sun; silver path/dot = Moon; small tick = top of Moon path.</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Stat k="Altitude" v={altitudeLabel} />
            <Stat k="Azimuth" v={azimuthLabel} />
            <Stat k="Declination" v={deg1(sky.decDeg)} />
            <Stat k="Top of path" v={ev.transitAlt == null ? "—" : deg1(ev.transitAlt)} />
            <Stat k="Rise" v={riseValue} />
            <Stat k="Set" v={setValue} />
          </dl>
          <p className="text-sm text-fg">
            At this declination: h at meridian = 90° − |{lat.toFixed(1)}° − {deg1(sky.decDeg)}|
          </p>
        </section>
      </div>

      <section className="grid gap-2 rounded-card bg-surface p-2.5 sm:grid-cols-2 lg:grid-cols-9">
        <PlaceSearch
          lat={lat}
          lon={lon}
          onSelect={(place) => {
            setLat(place.lat);
            setLon(place.lon);
          }}
        />
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
        <label className="flex flex-col gap-1 text-sm text-muted lg:col-span-2">
          Mean solar time
          <input
            type="time"
            value={timeInputValue(instant, lon)}
            onChange={(e) => onTime(e.target.value)}
            suppressHydrationWarning
            className="min-h-9 rounded-lg bg-surface-2 px-3 text-fg"
          />
          <span className="text-xs text-muted">At this longitude. Not a time zone or a watch.</span>
          <span className="text-xs text-muted">{formatUtcMomentLine(instant, lon)}</span>
        </label>
        <Slider label={`Latitude ${lat.toFixed(1)}°`} min={-90} max={90} step={0.1} value={lat} onChange={setLat} />
        <Slider label={`Longitude ${lon.toFixed(1)}°`} min={-180} max={180} step={0.1} value={lon} onChange={setLon} />
        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2 lg:col-span-2">
          Earth spin · {formatSpin(spinHours)} · a year takes {yearTakes(spinHours)}
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            aria-valuetext={`${formatSpin(spinHours)}, a year takes ${yearTakes(spinHours)}`}
            value={spinToSlider(spinHours)}
            onChange={(e) => setSpinHours(sliderToSpin(Number(e.target.value)))}
            suppressHydrationWarning
            className="h-9 w-full accent-gold"
          />
        </label>
        <p className="text-xs text-muted sm:col-span-2 lg:col-span-9">
          Mean circular orbit, not a full ephemeris. Drag the model to turn it. The Earth spin slider sets the pace, from one night up to a whole year. Slide the Moon holds the clock and lets declination drift.
        </p>
      </section>
    </main>
    {explainOpen ? (
      <ExplainPanel
        tab={explainTab}
        setTab={setExplainTab}
        onClose={() => setExplainOpen(false)}
        lat={lat}
        lon={lon}
        dateLabel={`${formatDate(instant, lon)} ${formatClock(instant, lon)}`}
        phaseName={sky.moon.phaseName}
        illumination={sky.moon.illumination}
        altitudeDeg={altDeg}
        azimuthDeg={azDeg}
        declinationDeg={sky.decDeg}
        hourAngleDeg={hourAngleDeg}
        moonEclLonDeg={moonEclLonDeg}
        moonEclLatDeg={moonEclLatDeg}
        rise={riseLabel}
        set={setLabel}
      />
    ) : null}
    </>
  );
}

function ExplainPanel({
  tab,
  setTab,
  onClose,
  lat,
  lon,
  dateLabel,
  phaseName,
  illumination,
  altitudeDeg,
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
  lat: number;
  lon: number;
  dateLabel: string;
  phaseName: string;
  illumination: number;
  altitudeDeg: number;
  azimuthDeg: number;
  declinationDeg: number;
  hourAngleDeg: number;
  moonEclLonDeg: number;
  moonEclLatDeg: number;
  rise: string;
  set: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 p-3" role="dialog" aria-modal="true" aria-label="Explain this moment">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-surface text-fg shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">Explain this moment</p>
            <h2 className="font-display text-2xl">Why the Moon appears there now</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-fg hover:bg-line">
            Close
          </button>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-line p-3" aria-label="Explanation sections">
          {EXPLAIN_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (tab === item.id ? "bg-fg text-bg" : "bg-surface-2 text-fg")}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm leading-6 text-muted">
          {tab === "summary" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">
                The left diagram shows the Moon's position in its tilted orbit. The right diagram shows what that same geometry becomes after Earth's rotation and your local horizon are applied.
              </p>
              <ValueGrid
                rows={[
                  ["Observer", `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`],
                  ["Moment", dateLabel],
                  ["Phase", `${phaseName}, ${Math.round(illumination * 100)}% lit`],
                  ["Altitude", altitudeDeg < 0 ? "Below horizon" : deg1(altitudeDeg)],
                  ["Azimuth", `${deg1(azimuthDeg)} · ${compass(azimuthDeg)}`],
                  ["Rise / set", `${rise} / ${set}`],
                ]}
              />
              <p>
                The key bridge is <strong className="text-fg">declination</strong>: the Moon's orbital position gives it a north/south angle on the celestial sphere. From your latitude, that declination determines how high its daily arc can climb. Earth's rotation then moves that arc across your local sky during the day.
              </p>
            </div>
          ) : null}

          {tab === "calculation" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Live values from the current app state</p>
              <ValueGrid
                rows={[
                  ["Moon ecliptic longitude", deg1(moonEclLonDeg)],
                  ["Moon ecliptic latitude", deg1(moonEclLatDeg)],
                  ["Moon declination", deg1(declinationDeg)],
                  ["Hour angle", deg1(hourAngleDeg)],
                  ["Altitude result", deg1(altitudeDeg)],
                  ["Azimuth result", `${deg1(azimuthDeg)} · ${compass(azimuthDeg)}`],
                ]}
              />
              <div className="rounded-lg bg-bg/60 p-3 font-mono text-xs text-fg">
                <div>h = asin( sin φ sin δ + cos φ cos δ cos H )</div>
                <div>φ = observer latitude = {deg1(lat)}</div>
                <div>δ = Moon declination = {deg1(declinationDeg)}</div>
                <div>H = local hour angle = {deg1(hourAngleDeg)}</div>
                <div>h = Moon altitude = {deg1(altitudeDeg)}</div>
              </div>
              <p>
                This is the standard spherical-astronomy conversion from equatorial coordinates to local horizon coordinates. It is the mathematical step that turns orbital/celestial position into “where should I look?”
              </p>
            </div>
          ) : null}

          {tab === "science" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Scientific basis and history</p>
              <p>
                This prototype does not implement a full Keplerian ellipse, Cassini-state libration model, or modern numerical ephemeris. The current picture is an educational model built from mean solar/lunar longitude, a fixed approximate lunar inclination, and spherical trigonometry for the local sky conversion.
              </p>
              <ul className="space-y-3">
                <li><strong className="text-fg">Implemented here:</strong> mean longitude for the Sun and Moon, an approximate 5.1° lunar-orbit tilt, phase from Sun-Moon elongation, and local altitude/azimuth from latitude, longitude, time, declination and hour angle.</li>
                <li><strong className="text-fg">Kepler</strong> is historical context for orbital geometry and the later understanding that real orbits are elliptical; this prototype currently uses a simpler mean circular orbit.</li>
                <li><strong className="text-fg">Newton</strong> is context for the physical cause of orbital motion: gravity and motion. The app does not numerically integrate gravitational forces.</li>
                <li><strong className="text-fg">Cassini</strong> is context for lunar rotation and orientation: the Moon's synchronous spin and the relationship between its equator, orbit plane and the ecliptic. The app does not yet calculate libration or Cassini-state orientation.</li>
                <li><strong className="text-fg">Modern ephemerides</strong> are the precision standard for production-grade positions, using reference frames, time standards, perturbation models and observer corrections.</li>
              </ul>
              <p className="text-base text-fg">Further reading</p>
              <ul className="grid gap-2">
                <ReferenceLink href="https://www.britannica.com/science/Cassinis-laws" label="Britannica — Cassini's laws" />
                <ReferenceLink href="https://www.britannica.com/science/Keplers-laws-of-planetary-motion" label="Britannica — Kepler's laws of planetary motion" />
                <ReferenceLink href="https://www.britannica.com/science/gravity-physics/Newtons-law-of-gravity" label="Britannica — Newton's law of gravity" />
                <ReferenceLink href="https://aa.usno.navy.mil/publications/asa" label="USNO — The Astronomical Almanac" />
                <ReferenceLink href="https://aa.usno.navy.mil/publications/exp_supp" label="USNO — Explanatory Supplement to the Astronomical Almanac" />
                <ReferenceLink href="https://farside.ph.utexas.edu/teaching/celestial/Celestial/node76.html" label="University of Texas — Cassini's laws notes" />
                <ReferenceLink href="https://www.aanda.org/articles/aa/full_html/2015/10/aa25939-15/aa25939-15.html" label="Astronomy & Astrophysics — Cassini states" />
              </ul>
            </div>
          ) : null}

          {tab === "limits" ? (
            <div className="space-y-4">
              <p className="text-base text-fg">Model limits</p>
              <p>
                This prototype is designed to explain the geometry, not to be a full precision almanac. It currently uses a simplified mean-orbit model and schematic distances.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Distances and object sizes are deliberately not to scale.</li>
                <li>The lunar orbit is simplified; full perturbations are not yet included.</li>
                <li>Atmospheric refraction, terrain horizon and weather are not included.</li>
                <li>For precision ephemerides, compare against sources such as the Astronomical Almanac, USNO services or JPL Horizons.</li>
              </ul>
              <p>
                In short: the app aims to preserve the important angular relationships so the visual explanation is clear, while being explicit about where a production-grade ephemeris would need more detail.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
      <a className="text-gold underline decoration-gold/40 underline-offset-4 hover:text-fg" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    </li>
  );
}

function yearTakes(hoursPerSec: number): string {
  const sec = (365.25 * 24) / hoursPerSec;
  if (sec < 90) return `${Math.max(1, Math.round(sec))} sec`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = sec / 3600;
  return h < 10 ? `${h.toFixed(1)} h` : `${Math.round(h)} h`;
}

function formatSpin(hours: number): string {
  if (hours < 1.5) return `${Math.round(hours * 60)} min each second`;
  if (hours < 36) {
    const h = hours < 10 ? String(Math.round(hours * 10) / 10) : String(Math.round(hours));
    return `${h} h each second`;
  }
  const days = hours / 24;
  const d = days < 10 ? String(Math.round(days * 10) / 10) : String(Math.round(days));
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

function Stat({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
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

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={"min-h-9 rounded-full px-3 text-sm " + (on ? "bg-gold text-bg" : "bg-surface-2 text-fg")}
    >
      {children}
    </button>
  );
}
