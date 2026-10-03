import assert from "node:assert/strict";
import test from "node:test";
import { composeCivilTimeLine } from "./civil-time-line.ts";

const london = {
  timeZoneId: "Europe/London",
  clock: "19:10",
  date: "3 Oct",
  year: 2026,
  zoneName: "BST",
  utcOffsetMinutes: 60,
  utcOffsetLabel: "UTC+01:00",
};

test("composes a civil line with a zone name and no redundant year", () => {
  assert.equal(
    composeCivilTimeLine(london, 2026),
    "Civil time: 19:10 BST, 3 Oct · UTC+01:00.",
  );
});

test("appends the civil year when it differs from the mean-solar year", () => {
  assert.equal(
    composeCivilTimeLine({ ...london, date: "1 Jan", year: 2027 }, 2026),
    "Civil time: 19:10 BST, 1 Jan 2027 · UTC+01:00.",
  );
});

test("omits a missing zone name for fixed-offset ocean zones", () => {
  assert.equal(
    composeCivilTimeLine(
      {
        ...london,
        timeZoneId: "Etc/GMT+5",
        clock: "13:10",
        zoneName: null,
        utcOffsetMinutes: -300,
        utcOffsetLabel: "UTC-05:00",
      },
      2026,
    ),
    "Civil time: 13:10, 3 Oct · UTC-05:00.",
  );
});
