const toRad = (degrees: number) => (degrees * Math.PI) / 180;

const altitudeObserver = { x: 48, y: 105 } as const;
const altitudeDeg = 32;
const altitudeRayLength = 126;
const altitudeRad = toRad(altitudeDeg);
const altitudeMoon = {
  x: altitudeObserver.x + altitudeRayLength * Math.cos(altitudeRad),
  y: altitudeObserver.y - altitudeRayLength * Math.sin(altitudeRad),
} as const;
const altitudeArcRadius = 31;
const altitudeArcEnd = {
  x: altitudeObserver.x + altitudeArcRadius * Math.cos(altitudeRad),
  y: altitudeObserver.y - altitudeArcRadius * Math.sin(altitudeRad),
} as const;

export const ALTITUDE_DIAGRAM = {
  viewBox: "0 0 260 145",
  observer: altitudeObserver,
  moon: altitudeMoon,
  altitudeDeg,
  horizontalEnd: { x: 225, y: altitudeObserver.y },
  zenithEnd: { x: altitudeObserver.x, y: 20 },
  visibleHorizonEnd: { x: 225, y: 120 },
  angleArcPath: `M ${altitudeObserver.x + altitudeArcRadius} ${altitudeObserver.y} A ${altitudeArcRadius} ${altitudeArcRadius} 0 0 0 ${altitudeArcEnd.x} ${altitudeArcEnd.y}`,
} as const;

const azimuthCentre = { x: 130, y: 74 } as const;
const azimuthRadius = 49;
const azimuthDeg = 132;
const azimuthRad = toRad(azimuthDeg);
const directionRadius = 43;
const azimuthMoonDirection = {
  x: azimuthCentre.x + directionRadius * Math.sin(azimuthRad),
  y: azimuthCentre.y - directionRadius * Math.cos(azimuthRad),
} as const;
const azimuthArcRadius = 24;
const azimuthArcStart = {
  x: azimuthCentre.x,
  y: azimuthCentre.y - azimuthArcRadius,
} as const;
const azimuthArcEnd = {
  x: azimuthCentre.x + azimuthArcRadius * Math.sin(azimuthRad),
  y: azimuthCentre.y - azimuthArcRadius * Math.cos(azimuthRad),
} as const;

export const AZIMUTH_DIAGRAM = {
  viewBox: "0 0 260 145",
  centre: azimuthCentre,
  radius: azimuthRadius,
  azimuthDeg,
  moonDirection: azimuthMoonDirection,
  angleArcPath: `M ${azimuthArcStart.x} ${azimuthArcStart.y} A ${azimuthArcRadius} ${azimuthArcRadius} 0 0 1 ${azimuthArcEnd.x} ${azimuthArcEnd.y}`,
  cardinals: {
    north: "N · 0°",
    east: "E · 90°",
    south: "S · 180°",
    west: "W · 270°",
  },
} as const;
