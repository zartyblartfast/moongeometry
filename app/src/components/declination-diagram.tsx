import { DECLINATION_DIAGRAM } from "@/lib/declination-diagram";

export function DeclinationDiagram() {
  const diagram = DECLINATION_DIAGRAM;

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-bg/45">
      <div className="border-b border-line px-3 py-2">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">
          What declination means
        </p>
      </div>
      <svg
        className="block h-auto w-full"
        viewBox={diagram.viewBox}
        role="img"
        aria-labelledby="declination-diagram-title declination-diagram-description"
      >
        <title id="declination-diagram-title">
          Declination measured from the celestial equator
        </title>
        <desc id="declination-diagram-description">
          A Moon north of the celestial equator has positive declination. A Moon
          south of it has negative declination.
        </desc>

        <path
          d={`M ${diagram.equator.start.x} ${diagram.centre.y} A ${diagram.radius + 15} 17 0 0 0 ${diagram.equator.end.x} ${diagram.centre.y}`}
          fill="none"
          className="stroke-line"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <path
          d={`M ${diagram.equator.start.x} ${diagram.centre.y} A ${diagram.radius + 15} 17 0 0 1 ${diagram.equator.end.x} ${diagram.centre.y}`}
          fill="none"
          className="stroke-line"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <circle
          cx={diagram.centre.x}
          cy={diagram.centre.y}
          r={diagram.radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="1.25"
        />
        <line
          x1={diagram.equator.start.x}
          y1={diagram.centre.y}
          x2={diagram.equator.end.x}
          y2={diagram.centre.y}
          className="stroke-gold"
          strokeWidth="2"
        />
        <line
          x1={diagram.northPole.x}
          y1={diagram.northPole.y - 5}
          x2={diagram.southPole.x}
          y2={diagram.southPole.y + 5}
          className="stroke-line"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        <path
          d={diagram.angleArcPath}
          fill="none"
          stroke="var(--color-silver)"
          strokeWidth="2.5"
        />
        <line
          x1={diagram.centre.x}
          y1={diagram.centre.y}
          x2={diagram.moon.x}
          y2={diagram.moon.y}
          stroke="var(--color-silver)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <circle
          cx={diagram.centre.x}
          cy={diagram.centre.y}
          r="2.5"
          className="fill-fg"
        />
        <circle
          cx={diagram.moon.x}
          cy={diagram.moon.y}
          r="8"
          fill="var(--color-silver)"
          stroke="var(--color-line)"
          strokeWidth="2"
        />
        <circle
          cx={diagram.moon.x - 2.5}
          cy={diagram.moon.y - 2}
          r="1.5"
          fill="var(--color-bg)"
          opacity="0.35"
        />

        <text
          x={diagram.angleLabel.x}
          y={diagram.angleLabel.y}
          fill="var(--color-silver)"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[11px] font-semibold"
        >
          δ
        </text>
        <text
          x={diagram.moon.x + 13}
          y={diagram.moon.y - 5}
          className="fill-fg text-[12px] font-semibold"
        >
          Moon
        </text>

        <line
          x1={diagram.equator.end.x + 4}
          y1={diagram.centre.y}
          x2="342"
          y2={diagram.centre.y}
          className="stroke-gold"
          strokeWidth="1"
        />
        <text
          x="350"
          y={diagram.centre.y + 4}
          className="fill-fg text-[11px] font-semibold"
        >
          {diagram.equatorLabel}
        </text>
        <text
          x="350"
          y="37"
          fill="var(--color-silver)"
          className="text-[11px] font-semibold"
        >
          {diagram.northLabel}
        </text>
        <text x="350" y="119" className="fill-muted text-[11px] font-semibold">
          {diagram.southLabel}
        </text>
        <path
          d="M 336 43 L 336 65 M 332 47 L 336 43 L 340 47"
          fill="none"
          stroke="var(--color-silver)"
          strokeWidth="1.5"
        />
        <path
          d="M 336 110 L 336 90 M 332 106 L 336 110 L 340 106"
          fill="none"
          className="stroke-muted"
          strokeWidth="1.5"
        />
        <text
          x={diagram.northPole.x - 8}
          y="12"
          className="fill-muted text-[9px]"
        >
          +90°
        </text>
        <text
          x={diagram.southPole.x - 8}
          y="150"
          className="fill-muted text-[9px]"
        >
          −90°
        </text>
      </svg>
      <figcaption className="border-t border-line px-3 py-2 text-xs leading-5 text-muted">
        Declination is the Moon's angle north (+) or south (−) of the celestial
        equator—not its altitude above your horizon.
      </figcaption>
    </figure>
  );
}
