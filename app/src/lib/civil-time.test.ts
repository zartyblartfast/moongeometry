import assert from "node:assert/strict";
import test from "node:test";
import { formatCivilTime } from "./civil-time.ts";

type ExpectedCivilTime = {
  clock: string;
  date: string;
  year: number;
  utcOffsetMinutes: number;
  utcOffsetLabel: string;
};

function assertCivilTime(
  instant: number,
  timeZoneId: string,
  expected: ExpectedCivilTime,
): void {
  const actual = formatCivilTime(instant, timeZoneId);
  assert.ok(actual, `${timeZoneId} should be supported`);
  assert.equal(actual.timeZoneId, timeZoneId);
  assert.equal(actual.clock, expected.clock);
  assert.equal(actual.date, expected.date);
  assert.equal(actual.year, expected.year);
  assert.equal(actual.utcOffsetMinutes, expected.utcOffsetMinutes);
  assert.equal(actual.utcOffsetLabel, expected.utcOffsetLabel);
  assert.ok(actual.zoneName);
  assert.ok(actual.zoneName.length > 0);
}

test("formats London standard and daylight civil time", () => {
  assertCivilTime(Date.UTC(2024, 0, 15, 12, 34), "Europe/London", {
    clock: "12:34",
    date: "15 Jan",
    year: 2024,
    utcOffsetMinutes: 0,
    utcOffsetLabel: "UTC+00:00",
  });
  assertCivilTime(Date.UTC(2024, 6, 15, 12, 34), "Europe/London", {
    clock: "13:34",
    date: "15 Jul",
    year: 2024,
    utcOffsetMinutes: 60,
    utcOffsetLabel: "UTC+01:00",
  });
});

test("formats New York standard and daylight civil time", () => {
  assertCivilTime(Date.UTC(2024, 0, 15, 12, 34), "America/New_York", {
    clock: "07:34",
    date: "15 Jan",
    year: 2024,
    utcOffsetMinutes: -300,
    utcOffsetLabel: "UTC-05:00",
  });
  assertCivilTime(Date.UTC(2024, 6, 15, 12, 34), "America/New_York", {
    clock: "08:34",
    date: "15 Jul",
    year: 2024,
    utcOffsetMinutes: -240,
    utcOffsetLabel: "UTC-04:00",
  });
});

test("formats Sydney standard and daylight civil time", () => {
  assertCivilTime(Date.UTC(2024, 0, 15, 12, 34), "Australia/Sydney", {
    clock: "23:34",
    date: "15 Jan",
    year: 2024,
    utcOffsetMinutes: 660,
    utcOffsetLabel: "UTC+11:00",
  });
  assertCivilTime(Date.UTC(2024, 6, 15, 12, 34), "Australia/Sydney", {
    clock: "22:34",
    date: "15 Jul",
    year: 2024,
    utcOffsetMinutes: 600,
    utcOffsetLabel: "UTC+10:00",
  });
});

test("Phoenix does not change offset seasonally", () => {
  for (const instant of [Date.UTC(2024, 0, 15, 12), Date.UTC(2024, 6, 15, 12)]) {
    const actual = formatCivilTime(instant, "America/Phoenix");
    assert.ok(actual);
    assert.equal(actual.utcOffsetMinutes, -420);
    assert.equal(actual.utcOffsetLabel, "UTC-07:00");
  }
});

test("formats Kathmandu quarter-hour offset", () => {
  assertCivilTime(Date.UTC(2024, 0, 15, 12, 34), "Asia/Kathmandu", {
    clock: "18:19",
    date: "15 Jan",
    year: 2024,
    utcOffsetMinutes: 345,
    utcOffsetLabel: "UTC+05:45",
  });
});

test("formats Lord Howe's thirty-minute seasonal offset change", () => {
  assertCivilTime(Date.UTC(2024, 0, 15, 12, 34), "Australia/Lord_Howe", {
    clock: "23:34",
    date: "15 Jan",
    year: 2024,
    utcOffsetMinutes: 660,
    utcOffsetLabel: "UTC+11:00",
  });
  assertCivilTime(Date.UTC(2024, 6, 15, 12, 34), "Australia/Lord_Howe", {
    clock: "23:04",
    date: "15 Jul",
    year: 2024,
    utcOffsetMinutes: 630,
    utcOffsetLabel: "UTC+10:30",
  });
});

test("returns the civil date and year across a UTC year boundary", () => {
  assertCivilTime(Date.UTC(2024, 11, 31, 23, 30), "Pacific/Kiritimati", {
    clock: "13:30",
    date: "1 Jan",
    year: 2025,
    utcOffsetMinutes: 840,
    utcOffsetLabel: "UTC+14:00",
  });
});

test("rounds historical second-precision offsets to the nearest minute", () => {
  const actual = formatCivilTime(Date.UTC(1900, 0, 1), "Europe/Paris");
  assert.ok(actual);
  assert.equal(actual.utcOffsetMinutes, 9);
  assert.equal(actual.utcOffsetLabel, "UTC+00:09");
});

test("uses Intl offset semantics and no zone name for Etc/GMT zones", () => {
  const actual = formatCivilTime(Date.UTC(2024, 0, 15, 12), "Etc/GMT+5");
  assert.ok(actual);
  assert.equal(actual.clock, "07:00");
  assert.equal(actual.utcOffsetMinutes, -300);
  assert.equal(actual.utcOffsetLabel, "UTC-05:00");
  assert.equal(actual.zoneName, null);
});

test("returns null for invalid instants", () => {
  assert.equal(formatCivilTime(Number.NaN, "Europe/London"), null);
  assert.equal(formatCivilTime(Number.POSITIVE_INFINITY, "Europe/London"), null);
});

test("returns null for unsupported time zones", () => {
  assert.equal(formatCivilTime(Date.UTC(2024, 0, 15), "Not/A_Time_Zone"), null);
});
