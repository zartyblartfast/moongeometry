#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_URL = "https://naciscdn.org/naturalearth/50m/physical/ne_50m_land.zip";
const SOURCE_SHA256 = "0b8e670cf80dce9cbebe2a193bc44ba5602758c22e1fa603980553646d7ff162";
const WIDTH = 2048;
const HEIGHT = 1024;
const OCEAN = [0x18, 0x52, 0x7d, 0xff];
const LAND = [0x72, 0xa4, 0x6f, 0xff];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const defaultOutput = resolve(repositoryRoot, "app/src/assets/earth-land.png");
const appRequire = createRequire(resolve(repositoryRoot, "app/package.json"));

function usage() {
  return `Usage: node scripts/generate-earth-land-map.mjs [options]\n\nOptions:\n  --source-archive <path>  Use a local Natural Earth ZIP archive\n  --output <path>          Write the PNG to this path\n  --help                   Show this help\n\nEnvironment:\n  EARTH_LAND_SOURCE_ARCHIVE  Alternative to --source-archive\n`;
}

function parseArguments(argv) {
  const options = {
    sourceArchive: process.env.EARTH_LAND_SOURCE_ARCHIVE || null,
    output: defaultOutput,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (argument === "--source-archive" || argument === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a path`);
      if (argument === "--source-archive") options.sourceArchive = resolve(value);
      else options.output = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
  }

  return options;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function downloadSource(destination) {
  const response = await fetch(SOURCE_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Natural Earth download failed: ${response.status} ${response.statusText}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function normalizeLongitude(longitude) {
  const wrapped = ((longitude + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function unwrapRing(ring) {
  if (ring.length === 0) return [];
  const result = [[normalizeLongitude(ring[0][0]), ring[0][1]]];

  for (let index = 1; index < ring.length; index += 1) {
    let longitude = normalizeLongitude(ring[index][0]);
    const previous = result[index - 1][0];
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    result.push([longitude, ring[index][1]]);
  }

  return result;
}

function ringLongitudeMean(ring) {
  return ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
}

function alignRingToLongitude(ring, referenceLongitude) {
  const offset = Math.round((referenceLongitude - ringLongitudeMean(ring)) / 360) * 360;
  return ring.map(([longitude, latitude]) => [longitude + offset, latitude]);
}

function intersectVertical(a, b, boundary) {
  const delta = b[0] - a[0];
  if (delta === 0) return [boundary, a[1]];
  const amount = (boundary - a[0]) / delta;
  return [boundary, a[1] + amount * (b[1] - a[1])];
}

function clipRingAgainstBoundary(ring, boundary, keepGreater) {
  if (ring.length < 3) return [];
  const output = [];
  let previous = ring[ring.length - 1];
  let previousInside = keepGreater ? previous[0] >= boundary : previous[0] <= boundary;

  for (const current of ring) {
    const currentInside = keepGreater ? current[0] >= boundary : current[0] <= boundary;
    if (currentInside !== previousInside) {
      output.push(intersectVertical(previous, current, boundary));
    }
    if (currentInside) output.push(current);
    previous = current;
    previousInside = currentInside;
  }

  return output;
}

function clipRingToWorld(ring) {
  return clipRingAgainstBoundary(
    clipRingAgainstBoundary(ring, -180, true),
    180,
    false,
  );
}

// Unwrap each ring and clip shifted copies into [-180, +180]. This makes
// antimeridian crossings explicit instead of drawing a chord across the ocean.
function splitPolygonAtAntimeridian(rings) {
  if (!rings.length || !rings[0].length) return [];
  const exterior = unwrapRing(rings[0]);
  const referenceLongitude = ringLongitudeMean(exterior);
  const unwrapped = [
    exterior,
    ...rings.slice(1).map((ring) => alignRingToLongitude(unwrapRing(ring), referenceLongitude)),
  ];
  const longitudes = unwrapped.flatMap((ring) => ring.map((point) => point[0]));
  const minimum = Math.min(...longitudes);
  const maximum = Math.max(...longitudes);
  const firstShift = Math.ceil((-180 - maximum) / 360);
  const lastShift = Math.floor((180 - minimum) / 360);
  const pieces = [];

  for (let shiftIndex = firstShift; shiftIndex <= lastShift; shiftIndex += 1) {
    const offset = shiftIndex * 360;
    const clipped = unwrapped
      .map((ring) => clipRingToWorld(ring.map(([longitude, latitude]) => [longitude + offset, latitude])))
      .filter((ring) => ring.length >= 3);
    if (clipped.length) pieces.push(clipped);
  }

  return pieces;
}

function project([longitude, latitude]) {
  return [
    ((longitude + 180) / 360) * (WIDTH - 1),
    ((90 - Math.max(-90, Math.min(90, latitude))) / 180) * (HEIGHT - 1),
  ];
}

function paintSpan(data, y, startX, endX) {
  const first = Math.max(0, startX);
  const last = Math.min(WIDTH - 1, endX);
  for (let x = first; x <= last; x += 1) {
    const offset = (y * WIDTH + x) * 4;
    data[offset] = LAND[0];
    data[offset + 1] = LAND[1];
    data[offset + 2] = LAND[2];
    data[offset + 3] = LAND[3];
  }
}

function rasterizePolygon(data, rings) {
  const projectedRings = rings.map((ring) => ring.map(project));
  const yValues = projectedRings.flatMap((ring) => ring.map((point) => point[1]));
  const firstY = Math.max(0, Math.ceil(Math.min(...yValues) - 0.5));
  const lastY = Math.min(HEIGHT - 1, Math.floor(Math.max(...yValues) - 0.5));

  for (let y = firstY; y <= lastY; y += 1) {
    const scanY = y + 0.5;
    const intersections = [];

    for (const ring of projectedRings) {
      let previous = ring[ring.length - 1];
      for (const current of ring) {
        if ((previous[1] <= scanY && current[1] > scanY) || (current[1] <= scanY && previous[1] > scanY)) {
          const amount = (scanY - previous[1]) / (current[1] - previous[1]);
          intersections.push(previous[0] + amount * (current[0] - previous[0]));
        }
        previous = current;
      }
    }

    intersections.sort((a, b) => a - b);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      paintSpan(
        data,
        y,
        Math.ceil(intersections[index] - 0.5),
        Math.floor(intersections[index + 1] - 0.5),
      );
    }
  }
}

function polygonsFromGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  throw new Error(`Unexpected Natural Earth geometry type: ${geometry.type}`);
}

function matchSeamColumns(data) {
  for (let y = 0; y < HEIGHT; y += 1) {
    const left = (y * WIDTH) * 4;
    const right = (y * WIDTH + WIDTH - 1) * 4;
    data[right] = data[left];
    data[right + 1] = data[left + 1];
    data[right + 2] = data[left + 2];
    data[right + 3] = data[left + 3];
  }
}

async function loadDependencies() {
  const shpRequirePath = appRequire.resolve("shpjs");
  const shpImportPath = resolve(dirname(shpRequirePath), "../lib/index.js");
  const shpModule = await import(pathToFileURL(shpImportPath).href);
  const { PNG } = appRequire("pngjs");
  return { shp: shpModule.default, PNG };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let temporaryDirectory = null;

  try {
    let sourceArchive = options.sourceArchive;
    if (!sourceArchive) {
      temporaryDirectory = await mkdtemp(resolve(tmpdir(), "earth-land-"));
      sourceArchive = resolve(temporaryDirectory, "ne_50m_land.zip");
      await downloadSource(sourceArchive);
    }

    const archive = await readFile(sourceArchive);
    const archiveChecksum = sha256(archive);
    if (archiveChecksum !== SOURCE_SHA256) {
      throw new Error(`Natural Earth archive checksum mismatch: expected ${SOURCE_SHA256}, got ${archiveChecksum}`);
    }

    const { shp, PNG } = await loadDependencies();
    const geojson = await shp(archive);
    if (Array.isArray(geojson)) {
      throw new Error(`Expected one shapefile in the archive, found ${geojson.length}`);
    }

    const png = new PNG({ width: WIDTH, height: HEIGHT, colorType: 6, inputColorType: 6 });
    for (let offset = 0; offset < png.data.length; offset += 4) {
      png.data[offset] = OCEAN[0];
      png.data[offset + 1] = OCEAN[1];
      png.data[offset + 2] = OCEAN[2];
      png.data[offset + 3] = OCEAN[3];
    }

    for (const feature of geojson.features) {
      for (const polygon of polygonsFromGeometry(feature.geometry)) {
        for (const piece of splitPolygonAtAntimeridian(polygon)) {
          rasterizePolygon(png.data, piece);
        }
      }
    }

    matchSeamColumns(png.data);
    const output = PNG.sync.write(png, {
      bitDepth: 8,
      colorType: 6,
      inputColorType: 6,
      deflateChunkSize: 32 * 1024,
      deflateLevel: 9,
      deflateStrategy: 3,
      filterType: 4,
    });
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, output);

    process.stdout.write(`source sha256  ${archiveChecksum}\n`);
    process.stdout.write(`output sha256  ${sha256(output)}\n`);
    process.stdout.write(`wrote ${options.output} (${WIDTH}x${HEIGHT})\n`);
  } finally {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
