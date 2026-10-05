type Props = {
  illumination: number;
  waxing: boolean;
  latitude: number;
  size?: number;
};

function n(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Northern convention: waxing is bright on the right; southern observers see it mirrored. */
export function MoonPhase({
  illumination,
  waxing,
  latitude,
  size = 36,
}: Props) {
  const r = size / 2;
  const k = Math.max(0, Math.min(1, illumination));
  const xTerm = (1 - 2 * k) * r;
  const apparentWaxing = latitude < 0 ? !waxing : waxing;
  const steps = 32;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / steps;
    const x = -r * Math.cos(t);
    const y = r * Math.sin(t);
    pts.push(`${n(apparentWaxing ? x : -x)},${n(y)}`);
  }
  for (let i = steps; i >= 0; i--) {
    const t = -Math.PI / 2 + (Math.PI * i) / steps;
    const x = xTerm * Math.cos(t);
    const y = r * Math.sin(t);
    pts.push(`${n(apparentWaxing ? x : -x)},${n(y)}`);
  }
  const half = n(size);
  const neg = n(-r);
  return (
    <svg
      data-share-moon-phase
      width={size}
      height={size}
      viewBox={`${neg} ${neg} ${half} ${half}`}
      aria-hidden
    >
      <circle r={n(r - 0.6)} fill="var(--color-silver)" />
      <polygon points={pts.join(" ")} fill="var(--color-bg)" />
      <circle
        r={n(r - 0.6)}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="1"
      />
    </svg>
  );
}
