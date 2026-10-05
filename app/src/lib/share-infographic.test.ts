import assert from "node:assert/strict";
import test from "node:test";
import { fromLocal } from "./astro.ts";
import {
  formatShareCoordinates,
  formatShareMetadata,
  formatShareSkyStats,
  shareInfographicFilename,
} from "./share-infographic.ts";

const longitude = -4.75;
const instant = fromLocal(2026, 9, 4, 18, 17, longitude);

test("share metadata favours the selected place label and keeps coordinates visible", () => {
  assert.deepEqual(
    formatShareMetadata({
      instant,
      lat: 51.5,
      lon: longitude,
      placeLabel: "Swansea, Wales",
      civilTimeLine: "Civil · 19:17 BST, 4 Oct · UTC+01:00",
    }),
    {
      location: "Swansea, Wales · 51.5° N, 4.8° W",
      date: "4 Oct 2026",
      time: "18:17 mean solar time",
      civilTime: "Civil · 19:17 BST, 4 Oct · UTC+01:00",
    },
  );
});

test("share metadata falls back to signed compass coordinates", () => {
  assert.equal(formatShareCoordinates(-33.9, 151.2), "33.9° S, 151.2° E");
  assert.equal(
    formatShareMetadata({
      instant,
      lat: -33.9,
      lon: 151.2,
      placeLabel: null,
      civilTimeLine: "Civil · 05:03 AEDT, 5 Oct · UTC+11:00",
    }).location,
    "33.9° S, 151.2° E",
  );
});

test("share PNG filename follows the selected mean-solar date and time", () => {
  assert.equal(
    shareInfographicFilename(instant, longitude),
    "moon-geometry-2026-10-04-1817.png",
  );
});

test("share sky stats preserve the app's altitude and compass formatting", () => {
  assert.deepEqual(
    formatShareSkyStats({
      altitudeDeg: 62.2,
      azimuthDeg: 258.1,
      declinationDeg: 23.4,
      transitAltitudeDeg: 80.7,
    }),
    {
      altitude: "62.2°",
      azimuth: "258.1° · WSW",
      declination: "23.4°",
      topOfPath: "80.7°",
    },
  );

  assert.equal(
    formatShareSkyStats({
      altitudeDeg: -4.2,
      azimuthDeg: 0,
      declinationDeg: -12.3,
      transitAltitudeDeg: null,
    }).altitude,
    "Below horizon",
  );
});
