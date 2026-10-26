import { displayAzimuth } from "../lib/true-north-orientation.ts";

export interface SkyChartLayout {
  viewBoxWidth: number;
  viewBoxHeight: number;
  cx: number;
  cy: number;
  horizonRadius: number;
  orientationActive: boolean;
}

export interface SkyChartPoint {
  x: number;
  y: number;
}

export interface ClearanceBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function segmentCrossesBox(
  segment: { x: number; y: number; x2: number; y2: number },
  box: ClearanceBox,
): boolean {
  const minX = Math.min(segment.x, segment.x2);
  const maxX = Math.max(segment.x, segment.x2);
  const minY = Math.min(segment.y, segment.y2);
  const maxY = Math.max(segment.y, segment.y2);
  return !(
    maxX < box.left ||
    minX > box.right ||
    maxY < box.top ||
    minY > box.bottom
  );
}

export interface BezelTick extends SkyChartPoint {
  degrees: number;
  x2: number;
  y2: number;
  kind: "minor" | "intermediate" | "major";
}

const LEGACY_LAYOUT: SkyChartLayout = {
  viewBoxWidth: 320,
  viewBoxHeight: 336,
  cx: 160,
  cy: 168,
  horizonRadius: 118,
  orientationActive: false,
};

const ORIENTATION_LAYOUT: SkyChartLayout = {
  viewBoxWidth: 360,
  viewBoxHeight: 376,
  cx: 180,
  cy: 188,
  horizonRadius: 118,
  orientationActive: true,
};

export function skyChartLayout(
  orientationHeadingDeg: number | undefined,
): SkyChartLayout {
  return orientationHeadingDeg === undefined
    ? { ...LEGACY_LAYOUT }
    : { ...ORIENTATION_LAYOUT };
}

export function projectSkyPoint(
  altDeg: number,
  trueAzimuthDeg: number,
  layout: SkyChartLayout,
  orientationHeadingDeg?: number,
): SkyChartPoint {
  const radius = ((90 - altDeg) / 90) * layout.horizonRadius;
  const azimuthDeg =
    orientationHeadingDeg === undefined
      ? trueAzimuthDeg
      : displayAzimuth(trueAzimuthDeg, orientationHeadingDeg);
  const azimuth = (azimuthDeg * Math.PI) / 180;
  return {
    x: layout.cx + radius * Math.sin(azimuth),
    y: layout.cy - radius * Math.cos(azimuth),
  };
}

function radialPoint(
  degrees: number,
  radius: number,
  layout: SkyChartLayout,
): SkyChartPoint {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: layout.cx + radius * Math.sin(radians),
    y: layout.cy - radius * Math.cos(radians),
  };
}

export function activeSkyChartGeometry(orientationHeadingDeg: number) {
  const layout = skyChartLayout(orientationHeadingDeg);
  const bezelOuterRadius = 158;
  const ticks: BezelTick[] = Array.from({ length: 72 }, (_, index) => {
    const degrees = index * 5;
    const kind =
      degrees % 30 === 0
        ? "major"
        : degrees % 10 === 0
          ? "intermediate"
          : "minor";
    const innerRadius =
      degrees === 0
        ? 154
        : kind === "major"
          ? 146
          : kind === "intermediate"
            ? 150
            : 153;
    const inner = radialPoint(degrees, innerRadius, layout);
    const outer = radialPoint(degrees, bezelOuterRadius, layout);
    return { degrees, kind, x: inner.x, y: inner.y, x2: outer.x, y2: outer.y };
  });
  const degreeLabels = [0, 90, 180, 270].map((degrees) => ({
    degrees,
    ...radialPoint(degrees, degrees === 0 ? 144 : 170, layout),
  }));
  const zeroLabel = degreeLabels[0];
  const zeroLabelClearanceBox: ClearanceBox = {
    left: zeroLabel.x - 14,
    top: zeroLabel.y - 7,
    right: zeroLabel.x + 14,
    bottom: zeroLabel.y + 7,
  };
  const cardinalRadius = 126;
  const cardinals = [
    { label: "N", trueAzimuthDeg: 0 },
    { label: "E", trueAzimuthDeg: 90 },
    { label: "S", trueAzimuthDeg: 180 },
    { label: "W", trueAzimuthDeg: 270 },
  ].map(({ label, trueAzimuthDeg }) => {
    const displayDegrees = displayAzimuth(
      trueAzimuthDeg,
      orientationHeadingDeg,
    );
    return {
      label,
      trueAzimuthDeg,
      displayAzimuthDeg: displayDegrees,
      ...radialPoint(displayDegrees, cardinalRadius, layout),
      textRotationDeg: 0,
    };
  });

  return {
    layout,
    ticks,
    degreeLabels,
    zeroLabelClearanceBox,
    cardinals,
    cardinalBandCircles: [] as never[],
    showSummitTick: false,
    sight: {
      fixed: true,
      points: `${layout.cx - 7},8 ${layout.cx + 7},8 ${layout.cx},20`,
    },
  };
}
