import { skyPath, snapshot } from "@/lib/astro";

type Props = {
  instant: number;
  orbit: number;
  lat: number;
  lon: number;
  moonAlt: number;
  moonAz: number;
};

const VB = 320;

function project(altDeg: number, azDeg: number, cx: number, cy: number, radius: number) {
  const r = ((90 - altDeg) / 90) * radius;
  const az = (azDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(az), y: cy - r * Math.cos(az) };
}

function runs(samples: { altDeg: number; azDeg: number }[], cx: number, cy: number, radius: number) {
  const groups: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 1) groups.push(current.join(" "));
    current = [];
  };
  for (const s of samples) {
    if (s.altDeg < -0.4) {
      flush();
      continue;
    }
    const p = project(Math.max(s.altDeg, 0), s.azDeg, cx, cy, radius);
    current.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  flush();
  return groups;
}

export function SkyChart({ instant, orbit, lat, lon, moonAlt, moonAz }: Props) {
  const moonPath = skyPath(instant, lat, lon, "moon", orbit);
  const moon = moonPath.samples;
  const sun = skyPath(instant, lat, lon, "sun", orbit).samples;
  const skyNow = snapshot(instant, lat, lon, orbit);
  const cx = VB / 2;
  const cy = VB / 2 + 8;
  const radius = 118;
  const moonRuns = runs(moon, cx, cy, radius);
  const sunRuns = runs(sun, cx, cy, radius);
  const now = moonAlt > -0.4 ? project(Math.max(moonAlt, 0), moonAz, cx, cy, radius) : null;
  const sunAlt = (skyNow.sunHz.alt * 180) / Math.PI;
  const sunAz = ((skyNow.sunHz.az * 180) / Math.PI + 360) % 360;
  const sunNow = sunAlt > -0.4 ? project(Math.max(sunAlt, 0), sunAz, cx, cy, radius) : null;
  const topSample = moonPath.samples.reduce<{ altDeg: number; azDeg: number } | null>(
    (best, sample) => (sample.altDeg > -0.4 && (!best || sample.altDeg > best.altDeg) ? sample : best),
    null,
  );
  const top = topSample ? project(Math.max(topSample.altDeg, 0), topSample.azDeg, cx, cy, radius) : null;
  const rings = [30, 60];
  const cards = [
    { label: "N", x: cx, y: cy - radius - 14 },
    { label: "E", x: cx + radius + 14, y: cy + 4 },
    { label: "S", x: cx, y: cy + radius + 18 },
    { label: "W", x: cx - radius - 14, y: cy + 4 },
  ];

  return (
    <svg viewBox={`0 0 ${VB} ${VB + 16}`} className="h-full w-full" role="img" aria-label="Tonight’s Moon and Sun paths on the sky">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={1.25} />
      {rings.map((alt) => {
        const ringRadius = ((90 - alt) / 90) * radius;
        return (
          <g key={alt}>
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
      {cards.map((c) => (
        <text key={c.label} x={c.x} y={c.y} textAnchor="middle" fill="var(--color-muted)" fontSize={12} fontFamily="Outfit, sans-serif">
          {c.label}
        </text>
      ))}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--color-muted)" fontSize={11} fontFamily="Outfit, sans-serif">
        zenith
      </text>
      {sunRuns.map((d, i) => (
        <polyline key={`s${i}`} points={d} fill="none" stroke="var(--color-gold)" strokeWidth={1.5} strokeDasharray="4 4" />
      ))}
      {moonRuns.map((d, i) => (
        <polyline key={`m${i}`} points={d} fill="none" stroke="var(--color-silver)" strokeWidth={2.25} />
      ))}
      {top && (
        <g>
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
      )}
      {sunNow && (
        <circle
          cx={sunNow.x.toFixed(2)}
          cy={sunNow.y.toFixed(2)}
          r="5"
          fill="var(--color-gold)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      )}
      {now && (
        <circle
          cx={now.x.toFixed(2)}
          cy={now.y.toFixed(2)}
          r="6"
          fill="var(--color-silver)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
