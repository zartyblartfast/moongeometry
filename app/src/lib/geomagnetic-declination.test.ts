import assert from "node:assert/strict";
import test from "node:test";
import { geomagneticDeclination } from "./geomagnetic-declination.ts";

// Representative rows from magvar's vendored NOAA WMM2025 test data.
const NOAA_FIXTURES = [
  {
    date: new Date("2025-01-01T00:00:00.000Z"),
    altitudeMetres: 18_000,
    latDeg: 0,
    lonDeg: 21,
    declinationDeg: 1.29,
  },
  {
    date: new Date("2025-07-02T12:00:00.000Z"),
    altitudeMetres: 6_000,
    latDeg: -36,
    lonDeg: -137,
    declinationDeg: 20.28,
  },
  {
    date: new Date("2026-01-01T00:00:00.000Z"),
    altitudeMetres: 69_000,
    latDeg: 23,
    lonDeg: 63,
    declinationDeg: 1.17,
  },
  {
    date: new Date("2026-01-01T00:00:00.000Z"),
    altitudeMetres: 46_000,
    latDeg: -24,
    lonDeg: -122,
    declinationDeg: 14.01,
  },
] as const;

test("geomagneticDeclination matches representative NOAA WMM2025 fixtures", () => {
  for (const fixture of NOAA_FIXTURES) {
    assert.deepEqual(
      geomagneticDeclination(
        fixture.latDeg,
        fixture.lonDeg,
        fixture.altitudeMetres,
        fixture.date,
      ),
      { declinationDeg: fixture.declinationDeg, model: "WMM2025", valid: true },
    );
  }
});

test("geomagneticDeclination marks only 2025.0 through before 2030.0 valid", () => {
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    assert.equal(
      geomagneticDeclination(0, 0, null, new Date("2024-12-31T23:59:59Z"))
        .valid,
      false,
    );
    assert.equal(
      geomagneticDeclination(0, 0, null, new Date("2025-01-01T00:00:00Z"))
        .valid,
      true,
    );
    assert.equal(
      geomagneticDeclination(0, 0, null, new Date("2029-12-31T23:59:59Z"))
        .valid,
      true,
    );
    assert.equal(
      geomagneticDeclination(0, 0, null, new Date("2030-01-01T00:00:00Z"))
        .valid,
      false,
    );
  } finally {
    console.warn = originalWarn;
  }
});

test("geomagneticDeclination rejects invalid coordinates, altitude, and date", () => {
  const date = new Date("2026-01-01T00:00:00Z");
  assert.throws(
    () => geomagneticDeclination(Number.NaN, 0, null, date),
    RangeError,
  );
  assert.throws(() => geomagneticDeclination(91, 0, null, date), RangeError);
  assert.throws(() => geomagneticDeclination(0, 181, null, date), RangeError);
  assert.throws(
    () => geomagneticDeclination(0, 0, Number.POSITIVE_INFINITY, date),
    RangeError,
  );
  assert.throws(
    () => geomagneticDeclination(0, 0, null, new Date(Number.NaN)),
    RangeError,
  );
});
