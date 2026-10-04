export type DiagramPoint = Readonly<{ x: number; y: number }>;

const centre = { x: 176, y: 77 } as const;
const radius = 56;
const declinationDeg = 28;
const declinationRad = (declinationDeg * Math.PI) / 180;
const moon = {
  x: centre.x + radius * Math.cos(declinationRad),
  y: centre.y - radius * Math.sin(declinationRad),
} as const;
const arcRadius = 38;
const arcEnd = {
  x: centre.x + arcRadius * Math.cos(declinationRad),
  y: centre.y - arcRadius * Math.sin(declinationRad),
} as const;
const angleLabelRadius = 27;
const angleLabelRad = declinationRad / 2;
const angleLabel = {
  x: centre.x + angleLabelRadius * Math.cos(angleLabelRad),
  y: centre.y - angleLabelRadius * Math.sin(angleLabelRad),
} as const;

export const DECLINATION_DIAGRAM = {
  viewBox: "0 0 520 154",
  centre,
  radius,
  declinationDeg,
  moon,
  angleArcRadius: arcRadius,
  angleLabel,
  equator: {
    start: { x: centre.x - radius - 15, y: centre.y },
    end: { x: centre.x + radius + 15, y: centre.y },
  },
  northPole: { x: centre.x, y: centre.y - radius },
  southPole: { x: centre.x, y: centre.y + radius },
  angleArcPath: `M ${centre.x + arcRadius} ${centre.y} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEnd.x} ${arcEnd.y}`,
  equatorLabel: "Celestial equator · 0°",
  northLabel: "+ declination · north",
  southLabel: "− declination · south",
} as const;
