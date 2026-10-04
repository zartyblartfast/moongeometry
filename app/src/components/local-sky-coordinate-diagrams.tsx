import { ALTITUDE_DIAGRAM, AZIMUTH_DIAGRAM } from "@/lib/local-sky-diagrams";

function MoonMark({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r="7"
        fill="var(--color-silver)"
        stroke="var(--color-line)"
        strokeWidth="2"
      />
      <circle
        cx={x - 2}
        cy={y - 1.5}
        r="1.3"
        fill="var(--color-bg)"
        opacity="0.35"
      />
    </g>
  );
}

export function LocalSkyCoordinateDiagrams() {
  const altitude = ALTITUDE_DIAGRAM;
  const azimuth = AZIMUTH_DIAGRAM;

  return (
    <section
      className="space-y-3"
      aria-label="Altitude and azimuth explanation"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="overflow-hidden rounded-lg border border-line bg-bg/45">
          <div className="border-b border-line px-3 py-2">
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              What altitude means
            </p>
          </div>
          <svg
            className="block h-auto w-full"
            viewBox={altitude.viewBox}
            role="img"
            aria-labelledby="altitude-diagram-title altitude-diagram-description"
          >
            <title id="altitude-diagram-title">
              Altitude measured upward from the local horizontal
            </title>
            <desc id="altitude-diagram-description">
              A side view of the observer, local horizontal, Moon sightline and
              altitude angle. A faint lower line shows that a visible horizon
              may dip below horizontal when the observer is elevated.
            </desc>

            <path
              d="M 8 138 Q 48 105 88 138"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="1.25"
            />
            <line
              x1="18"
              y1={altitude.observer.y}
              x2={altitude.horizontalEnd.x}
              y2={altitude.horizontalEnd.y}
              stroke="var(--color-gold)"
              strokeWidth="1.75"
            />
            <line
              x1={altitude.observer.x}
              y1={altitude.observer.y}
              x2={altitude.zenithEnd.x}
              y2={altitude.zenithEnd.y}
              stroke="var(--color-line)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={altitude.observer.x}
              y1={altitude.observer.y}
              x2={altitude.visibleHorizonEnd.x}
              y2={altitude.visibleHorizonEnd.y}
              stroke="var(--color-muted)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <line
              x1={altitude.observer.x}
              y1={altitude.observer.y}
              x2={altitude.moon.x}
              y2={altitude.moon.y}
              stroke="var(--color-silver)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d={altitude.angleArcPath}
              fill="none"
              stroke="var(--color-silver)"
              strokeWidth="2.25"
            />
            <circle
              cx={altitude.observer.x}
              cy={altitude.observer.y}
              r="3"
              fill="var(--color-fg)"
            />
            <MoonMark x={altitude.moon.x} y={altitude.moon.y} />

            <text
              x="150"
              y="99"
              fill="var(--color-gold)"
              className="text-[9px]"
            >
              local horizontal · 0°
            </text>
            <text
              x="118"
              y="129"
              fill="var(--color-muted)"
              className="text-[8px]"
            >
              visible horizon may dip
            </text>
            <text
              x="53"
              y="25"
              fill="var(--color-muted)"
              className="text-[8px]"
            >
              zenith · +90°
            </text>
            <text
              x="78"
              y="92"
              fill="var(--color-silver)"
              className="text-[10px] font-semibold"
            >
              altitude h
            </text>
            <text
              x={altitude.moon.x + 10}
              y={altitude.moon.y - 3}
              fill="var(--color-fg)"
              className="text-[10px] font-semibold"
            >
              Moon
            </text>
            <text
              x="19"
              y="119"
              fill="var(--color-muted)"
              className="text-[8px]"
            >
              observer
            </text>
          </svg>
          <figcaption className="border-t border-line px-3 py-2 text-xs leading-5 text-muted">
            Altitude is measured from the geometric local horizontal. Elevation,
            terrain and refraction can move the visible horizon; they are not
            modelled here.
          </figcaption>
        </figure>

        <figure className="overflow-hidden rounded-lg border border-line bg-bg/45">
          <div className="border-b border-line px-3 py-2">
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              What azimuth means
            </p>
          </div>
          <svg
            className="block h-auto w-full"
            viewBox={azimuth.viewBox}
            role="img"
            aria-labelledby="azimuth-diagram-title azimuth-diagram-description"
          >
            <title id="azimuth-diagram-title">
              Azimuth measured clockwise around the local horizon
            </title>
            <desc id="azimuth-diagram-description">
              A top-down compass view with azimuth measured clockwise from true
              north to the Moon's direction.
            </desc>

            <circle
              cx={azimuth.centre.x}
              cy={azimuth.centre.y}
              r={azimuth.radius}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="1.5"
            />
            <line
              x1={azimuth.centre.x}
              y1={azimuth.centre.y}
              x2={azimuth.centre.x}
              y2={azimuth.centre.y - azimuth.radius}
              stroke="var(--color-gold)"
              strokeWidth="1.75"
            />
            <line
              x1={azimuth.centre.x}
              y1={azimuth.centre.y}
              x2={azimuth.moonDirection.x}
              y2={azimuth.moonDirection.y}
              stroke="var(--color-silver)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d={azimuth.angleArcPath}
              fill="none"
              stroke="var(--color-silver)"
              strokeWidth="2.25"
            />
            <circle
              cx={azimuth.centre.x}
              cy={azimuth.centre.y}
              r="3"
              fill="var(--color-fg)"
            />
            <MoonMark x={azimuth.moonDirection.x} y={azimuth.moonDirection.y} />

            <text
              x="130"
              y="14"
              textAnchor="middle"
              fill="var(--color-gold)"
              className="text-[9px] font-semibold"
            >
              {azimuth.cardinals.north}
            </text>
            <text
              x="202"
              y="77"
              textAnchor="start"
              fill="var(--color-muted)"
              className="text-[9px]"
            >
              {azimuth.cardinals.east}
            </text>
            <text
              x="130"
              y="140"
              textAnchor="middle"
              fill="var(--color-muted)"
              className="text-[9px]"
            >
              {azimuth.cardinals.south}
            </text>
            <text
              x="58"
              y="77"
              textAnchor="end"
              fill="var(--color-muted)"
              className="text-[9px]"
            >
              {azimuth.cardinals.west}
            </text>
            <text
              x="154"
              y="58"
              fill="var(--color-silver)"
              className="text-[10px] font-semibold"
            >
              azimuth A
            </text>
            <text
              x={azimuth.moonDirection.x + 10}
              y={azimuth.moonDirection.y + 3}
              fill="var(--color-fg)"
              className="text-[10px] font-semibold"
            >
              Moon
            </text>
            <text
              x="130"
              y="121"
              textAnchor="middle"
              fill="var(--color-muted)"
              className="text-[8px]"
            >
              clockwise from true north
            </text>
          </svg>
          <figcaption className="border-t border-line px-3 py-2 text-xs leading-5 text-muted">
            Azimuth gives the direction around the horizon: north 0°, east 90°,
            south 180° and west 270°.
          </figcaption>
        </figure>
      </div>

      <div className="rounded-lg border border-line bg-bg/45 px-3 py-2.5 text-xs leading-5 text-muted">
        <p className="font-semibold text-fg">
          At its highest point that day
          <span className="font-normal text-muted">
            {" "}
            (upper meridian transit: when the Moon crosses the north–south line
            in the sky)
          </span>
        </p>
        <p className="mt-1 font-mono text-sm text-fg">
          altitude = 90° − | latitude − declination |
        </p>
        <p className="mt-1">
          Rearranged: declination = latitude ± (90° − altitude). Use the branch
          matching whether the Moon passes south or north of the zenith.
        </p>
      </div>
    </section>
  );
}
