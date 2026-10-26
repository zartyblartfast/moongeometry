import type { SkyPath } from "@/lib/astro";
import type { AstronomyProviderSnapshot } from "@/lib/astronomy/provider";
import {
  activeSkyChartGeometry,
  projectSkyPoint,
  skyChartLayout,
  type SkyChartLayout,
} from "./sky-chart-model";

type Props = {
  snapshot: AstronomyProviderSnapshot;
  moonPath: SkyPath;
  sunPath: SkyPath;
  orientationHeadingDeg?: number;
  shareChart?: boolean;
};

function runs(
  samples: { altDeg: number; azDeg: number }[],
  layout: SkyChartLayout,
  orientationHeadingDeg?: number,
) {
  const groups: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 1) groups.push(current.join(" "));
    current = [];
  };
  for (const sample of samples) {
    if (sample.altDeg < -0.4) {
      flush();
      continue;
    }
    const point = projectSkyPoint(
      Math.max(sample.altDeg, 0),
      sample.azDeg,
      layout,
      orientationHeadingDeg,
    );
    current.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  }
  flush();
  return groups;
}

export function SkyChart({
  snapshot,
  moonPath,
  sunPath,
  orientationHeadingDeg,
  shareChart = true,
}: Props) {
  const layout = skyChartLayout(orientationHeadingDeg);
  const { cx, cy, horizonRadius: radius } = layout;
  const moonRuns = runs(moonPath.samples, layout, orientationHeadingDeg);
  const sunRuns = runs(sunPath.samples, layout, orientationHeadingDeg);
  const moonAlt = snapshot.moon.horizontal.altitudeDeg;
  const moonAz = snapshot.moon.horizontal.azimuthDeg;
  const now =
    moonAlt > -0.4
      ? projectSkyPoint(
          Math.max(moonAlt, 0),
          moonAz,
          layout,
          orientationHeadingDeg,
        )
      : null;
  const sunAlt = snapshot.sun.horizontal.altitudeDeg;
  const sunAz = snapshot.sun.horizontal.azimuthDeg;
  const sunNow =
    sunAlt > -0.4
      ? projectSkyPoint(
          Math.max(sunAlt, 0),
          sunAz,
          layout,
          orientationHeadingDeg,
        )
      : null;
  const topSample = moonPath.samples.reduce<{
    altDeg: number;
    azDeg: number;
  } | null>(
    (best, sample) =>
      sample.altDeg > -0.4 && (!best || sample.altDeg > best.altDeg)
        ? sample
        : best,
    null,
  );
  const top = topSample
    ? projectSkyPoint(
        Math.max(topSample.altDeg, 0),
        topSample.azDeg,
        layout,
        orientationHeadingDeg,
      )
    : null;
  const rings = [30, 60];
  const legacyCards = [
    { label: "N", x: cx, y: cy - radius - 14 },
    { label: "E", x: cx + radius + 14, y: cy + 4 },
    { label: "S", x: cx, y: cy + radius + 18 },
    { label: "W", x: cx - radius - 14, y: cy + 4 },
  ];
  const orientationGeometry =
    orientationHeadingDeg === undefined
      ? null
      : activeSkyChartGeometry(orientationHeadingDeg);

  return (
    <svg
      {...(shareChart ? { "data-share-sky-chart": true } : {})}
      data-orientation-active={orientationGeometry ? "true" : undefined}
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      className="h-full w-full"
      role="img"
      aria-label={
        orientationGeometry
          ? "Moon and Sun paths aligned to the device’s true-north heading"
          : "Tonight’s Moon and Sun paths on the sky"
      }
    >
      {orientationGeometry ? (
        <g data-orientation-bezel="true" aria-hidden="true">
          <polygon
            data-orientation-sight="true"
            points={orientationGeometry.sight.points}
            fill="var(--color-gold)"
          />
          {orientationGeometry.ticks.map((tick) => (
            <line
              key={tick.degrees}
              data-orientation-tick={tick.kind}
              x1={tick.x.toFixed(2)}
              y1={tick.y.toFixed(2)}
              x2={tick.x2.toFixed(2)}
              y2={tick.y2.toFixed(2)}
              stroke={
                tick.kind === "major" ? "var(--color-fg)" : "var(--color-muted)"
              }
              strokeWidth={
                tick.kind === "major"
                  ? 1.5
                  : tick.kind === "intermediate"
                    ? 1
                    : 0.7
              }
              opacity={tick.kind === "minor" ? 0.55 : 0.85}
            />
          ))}
          {orientationGeometry.degreeLabels.map((label) => (
            <text
              key={label.degrees}
              data-orientation-degree-label={label.degrees}
              x={label.x}
              y={label.y + 3.5}
              textAnchor="middle"
              fill="var(--color-muted)"
              fontSize={9}
              fontFamily="Outfit, sans-serif"
            >
              {label.degrees}°
            </text>
          ))}
        </g>
      ) : null}
      <circle
        data-sky-horizon="true"
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={1.25}
      />
      {rings.map((alt) => {
        const ringRadius = ((90 - alt) / 90) * radius;
        return (
          <g key={alt} data-altitude-ring={alt}>
            <circle
              cx={cx}
              cy={cy}
              r={ringRadius}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={cx + ringRadius + 4}
              y={cy - 3}
              fill="var(--color-muted)"
              fontSize={10}
              fontFamily="Outfit, sans-serif"
            >
              {alt}°
            </text>
          </g>
        );
      })}
      <text
        x={cx + radius * 0.63}
        y={cy - radius * 0.72}
        textAnchor="middle"
        fill="var(--color-muted)"
        fontSize={10}
        fontFamily="Outfit, sans-serif"
      >
        horizon
      </text>
      {(orientationGeometry?.cardinals ?? legacyCards).map((cardinal) => (
        <text
          key={cardinal.label}
          data-sky-cardinal={cardinal.label}
          x={cardinal.x}
          y={cardinal.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-muted)"
          stroke={orientationGeometry ? "var(--color-bg)" : undefined}
          strokeWidth={orientationGeometry ? 4 : undefined}
          paintOrder={orientationGeometry ? "stroke fill" : undefined}
          strokeLinejoin="round"
          fontSize={orientationGeometry ? 13 : 12}
          fontWeight={orientationGeometry ? 600 : undefined}
          fontFamily="Outfit, sans-serif"
        >
          {cardinal.label}
        </text>
      ))}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="var(--color-muted)"
        fontSize={11}
        fontFamily="Outfit, sans-serif"
      >
        zenith
      </text>
      {sunRuns.map((points, index) => (
        <polyline
          key={`s${index}`}
          data-sun-path="true"
          points={points}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      ))}
      {moonRuns.map((points, index) => (
        <polyline
          key={`m${index}`}
          data-moon-path="true"
          points={points}
          fill="none"
          stroke="var(--color-silver)"
          strokeWidth={2.25}
        />
      ))}
      {top && !orientationGeometry ? (
        <g data-moon-summit="true">
          <line
            x1={(top.x - 5).toFixed(2)}
            y1={top.y.toFixed(2)}
            x2={(top.x + 5).toFixed(2)}
            y2={top.y.toFixed(2)}
            stroke="var(--color-silver)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={top.x.toFixed(2)}
            y1={(top.y - 5).toFixed(2)}
            x2={top.x.toFixed(2)}
            y2={(top.y + 5).toFixed(2)}
            stroke="var(--color-bg)"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>
      ) : null}
      {sunNow ? (
        <circle
          data-sun-point="true"
          cx={sunNow.x.toFixed(2)}
          cy={sunNow.y.toFixed(2)}
          r="5"
          fill="var(--color-gold)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      ) : null}
      {now ? (
        <circle
          data-moon-point="true"
          cx={now.x.toFixed(2)}
          cy={now.y.toFixed(2)}
          r="6"
          fill="var(--color-silver)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      ) : null}
    </svg>
  );
}
