import { dateInputValue, formatDate, timeInputValue } from "./astro.ts";
import { palette } from "./palette.ts";

export const SHARE_IMAGE_WIDTH = 1600;
export const SHARE_IMAGE_HEIGHT = 900;

export type ShareMetadata = {
  location: string;
  date: string;
  time: string;
};

export type ShareInfographicInput = {
  orbitalCanvas: HTMLCanvasElement;
  skySvg: SVGSVGElement;
  instant: number;
  lat: number;
  lon: number;
  placeLabel: string | null;
  phaseName: string;
  appUrl: string;
};

function coordinate(value: number, positive: string, negative: string) {
  const direction = value < 0 ? negative : positive;
  return `${Math.abs(value).toFixed(1)}° ${direction}`;
}

export function formatShareCoordinates(lat: number, lon: number) {
  return `${coordinate(lat, "N", "S")}, ${coordinate(lon, "E", "W")}`;
}

export function formatShareMetadata({
  instant,
  lat,
  lon,
  placeLabel,
}: Pick<
  ShareInfographicInput,
  "instant" | "lat" | "lon" | "placeLabel"
>): ShareMetadata {
  const coordinates = formatShareCoordinates(lat, lon);
  return {
    location: placeLabel ? `${placeLabel} · ${coordinates}` : coordinates,
    date: formatDate(instant, lon),
    time: `${timeInputValue(instant, lon)} mean solar time`,
  };
}

export function shareInfographicFilename(instant: number, lon: number) {
  return `moon-geometry-${dateInputValue(instant, lon)}-${timeInputValue(instant, lon).replace(":", "")}.png`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawImageContained(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function cssVariable(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function waitForFonts() {
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 750)),
  ]);
}

async function svgImage(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "640");
  clone.setAttribute("height", "672");
  const variables: [string, string][] = [
    ["--color-bg", palette.bg],
    ["--color-line", "#2a354c"],
    ["--color-muted", "#9aa3b2"],
    ["--color-gold", palette.gold],
    ["--color-silver", palette.silver],
  ];
  for (const [name, fallback] of variables)
    clone.style.setProperty(name, cssVariable(name, fallback));
  clone.style.fontFamily = 'Outfit, "Segoe UI", sans-serif';

  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("The local sky diagram could not be rendered."));
    });
    image.src = url;
    await loaded;
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else
        reject(
          new Error("The browser could not encode the infographic as PNG."),
        );
    }, "image/png");
  });
}

function drawMetadata(ctx: CanvasRenderingContext2D, metadata: ShareMetadata) {
  const items = [
    ["LOCATION", metadata.location],
    ["DATE", metadata.date],
    ["TIME", metadata.time],
  ] as const;
  const x = [74, 690, 1075];
  const widths = [570, 340, 450];

  items.forEach(([label, value], index) => {
    drawText(
      ctx,
      label,
      x[index]!,
      174,
      "600 15px Outfit, Segoe UI, sans-serif",
      "#9aa3b2",
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(x[index]!, 184, widths[index]!, 33);
    ctx.clip();
    drawText(
      ctx,
      value,
      x[index]!,
      211,
      "500 25px Outfit, Segoe UI, sans-serif",
      palette.cream,
    );
    ctx.restore();
  });
}

function drawLegendItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  drawText(
    ctx,
    label,
    x + 14,
    y,
    "500 16px Outfit, Segoe UI, sans-serif",
    "#b8c0ce",
  );
}

export async function createShareInfographic(input: ShareInfographicInput) {
  await waitForFonts();
  const skyImage = await svgImage(input.skySvg);
  const metadata = formatShareMetadata(input);
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_IMAGE_WIDTH;
  canvas.height = SHARE_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export is not available in this browser.");

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawText(
    ctx,
    "ANGLES TRUE · DISTANCES SCHEMATIC",
    74,
    62,
    "600 16px Outfit, Segoe UI, sans-serif",
    palette.gold,
  );
  drawText(
    ctx,
    "Moon Geometry",
    74,
    126,
    "640 58px Fraunces, Georgia, serif",
    palette.cream,
  );
  ctx.textAlign = "right";
  drawText(
    ctx,
    input.appUrl,
    1526,
    112,
    "500 21px Outfit, Segoe UI, sans-serif",
    "#b8c0ce",
  );
  ctx.textAlign = "left";

  drawMetadata(ctx, metadata);
  ctx.strokeStyle = "#2a354c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(74, 238);
  ctx.lineTo(1526, 238);
  ctx.stroke();

  const left = { x: 62, y: 270, w: 928, h: 548 };
  const right = { x: 1010, y: 270, w: 528, h: 548 };
  for (const panel of [left, right]) {
    roundedRect(ctx, panel.x, panel.y, panel.w, panel.h, 24);
    ctx.fillStyle = "#151c2c";
    ctx.fill();
    ctx.strokeStyle = "#2a354c";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawText(
    ctx,
    "Orbital geometry",
    92,
    316,
    "600 24px Outfit, Segoe UI, sans-serif",
    palette.cream,
  );
  drawText(
    ctx,
    "Current interactive view",
    92,
    343,
    "400 17px Outfit, Segoe UI, sans-serif",
    "#9aa3b2",
  );
  ctx.save();
  roundedRect(ctx, 82, 362, 888, 382, 16);
  ctx.clip();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(82, 362, 888, 382);
  drawImageContained(
    ctx,
    input.orbitalCanvas,
    input.orbitalCanvas.width,
    input.orbitalCanvas.height,
    82,
    362,
    888,
    382,
  );
  ctx.restore();
  drawLegendItem(ctx, 96, 786, palette.equator, "Equator");
  drawLegendItem(ctx, 222, 786, palette.gold, "Ecliptic 23.4° · sunlight");
  drawLegendItem(ctx, 482, 786, palette.silver, "Moon orbit 5.1°");

  drawText(
    ctx,
    "Local sky path",
    1040,
    316,
    "600 24px Outfit, Segoe UI, sans-serif",
    palette.cream,
  );
  drawText(
    ctx,
    input.phaseName,
    1040,
    343,
    "400 17px Outfit, Segoe UI, sans-serif",
    "#9aa3b2",
  );
  drawImageContained(ctx, skyImage, 640, 672, 1038, 360, 472, 394);
  drawLegendItem(ctx, 1060, 786, palette.gold, "Sun");
  drawLegendItem(ctx, 1150, 786, palette.silver, "Moon");
  drawText(
    ctx,
    "Center = zenith · rim = horizon",
    1250,
    786,
    "400 15px Outfit, Segoe UI, sans-serif",
    "#9aa3b2",
  );

  drawText(
    ctx,
    "MoonGeometry · topocentric ephemeris · geometric horizon · no refraction",
    74,
    866,
    "400 16px Outfit, Segoe UI, sans-serif",
    "#7f8999",
  );

  const blob = await canvasBlob(canvas);
  return { canvas, blob };
}

export async function copyPngToClipboard(blob: Blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard access is not supported by this browser.");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
