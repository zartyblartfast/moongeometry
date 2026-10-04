import assert from "node:assert/strict";
import test from "node:test";
import { fromLocal, localParts } from "./astro.ts";
import {
  formatTimeScrubberValue,
  instantForTimeScrubberMinute,
  timeScrubberMinute,
} from "./time-scrubber.ts";

const longitude = -4.75;
const instant = fromLocal(2026, 9, 4, 18, 17, longitude);

test("time scrubber reads the selected mean-solar minute", () => {
  assert.equal(timeScrubberMinute(instant, longitude), 18 * 60 + 17);
  assert.equal(formatTimeScrubberValue(18 * 60 + 17), "18:17 mean solar time");
});

test("time scrubber changes time while preserving the selected mean-solar date", () => {
  const changed = instantForTimeScrubberMinute(
    instant,
    longitude,
    23 * 60 + 55,
  );
  const parts = localParts(changed, longitude);

  assert.deepEqual(
    { y: parts.y, m: parts.m, day: parts.day, h: parts.h, min: parts.min },
    { y: 2026, m: 9, day: 4, h: 23, min: 55 },
  );
});

test("time scrubber clamps values to the selected day", () => {
  assert.equal(
    timeScrubberMinute(
      instantForTimeScrubberMinute(instant, longitude, -5),
      longitude,
    ),
    0,
  );
  assert.equal(
    timeScrubberMinute(
      instantForTimeScrubberMinute(instant, longitude, 1500),
      longitude,
    ),
    23 * 60 + 59,
  );
});
