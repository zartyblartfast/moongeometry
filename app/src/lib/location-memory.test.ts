import assert from "node:assert/strict";
import test from "node:test";
import {
  locationMemoryValue,
  parseLocationMemory,
  rememberedPlaceAfterCoordinateChange,
  rememberedPlaceForCoordinates,
  resolveInitialLocation,
} from "./location-memory.ts";

const london = {
  label: "London, Greater London, England",
  lat: 51.5074456,
  lon: -0.1277653,
};

test("parses a remembered selected place alongside existing preferences", () => {
  const stored = parseLocationMemory(
    JSON.stringify({
      lat: london.lat,
      lon: london.lon,
      spinHours: 2,
      place: london,
    }),
  );

  assert.deepEqual(stored, {
    lat: london.lat,
    lon: london.lon,
    spinHours: 2,
    place: london,
  });
});

test("restores a remembered place only at its selected coordinates", () => {
  assert.deepEqual(
    rememberedPlaceForCoordinates(london, london.lat, london.lon),
    london,
  );
  assert.equal(
    rememberedPlaceForCoordinates(london, london.lat + 0.1, london.lon),
    null,
  );
});

test("keeps legacy coordinate preferences without inventing a place label", () => {
  assert.deepEqual(
    parseLocationMemory('{"lat":40.7,"lon":-74,"spinHours":4}'),
    { lat: 40.7, lon: -74, spinHours: 4 },
  );
});

test("persists the place label only while coordinates still match", () => {
  assert.deepEqual(locationMemoryValue(london.lat, london.lon, 2, london), {
    lat: london.lat,
    lon: london.lon,
    spinHours: 2,
    place: london,
  });
  assert.deepEqual(
    locationMemoryValue(london.lat, london.lon + 0.1, 2, london),
    { lat: london.lat, lon: london.lon + 0.1, spinHours: 2 },
  );
});

test("does not clear the restored place during the pre-mount coordinate effect", () => {
  assert.deepEqual(
    rememberedPlaceAfterCoordinateChange(false, london, 0, 0),
    london,
  );
  assert.equal(rememberedPlaceAfterCoordinateChange(true, london, 0, 0), null);
});

test("restores the exact saved place when the normal URL contains its rounded coordinates", () => {
  assert.deepEqual(
    resolveInitialLocation(
      { lat: london.lat, lon: london.lon, spinHours: 2, place: london },
      51.5,
      -0.1,
      0,
      0,
    ),
    { lat: london.lat, lon: london.lon, place: london },
  );
});

test("an unrelated shared URL overrides the saved place", () => {
  assert.deepEqual(
    resolveInitialLocation(
      { lat: london.lat, lon: london.lon, place: london },
      40.7,
      -74,
      0,
      0,
    ),
    { lat: 40.7, lon: -74, place: null },
  );
});

test("rejects malformed or out-of-range remembered place data", () => {
  assert.deepEqual(parseLocationMemory("not json"), {});
  assert.deepEqual(
    parseLocationMemory(
      JSON.stringify({
        lat: 95,
        lon: -181,
        spinHours: "fast",
        place: { label: "Nowhere", lat: 95, lon: 0 },
      }),
    ),
    {},
  );
});
