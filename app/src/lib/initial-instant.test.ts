import assert from "node:assert/strict";
import test from "node:test";
import { dateInputValue, fromLocal, timeInputValue } from "./astro.ts";
import { resolveInitialInstant } from "./initial-instant.ts";

test("current instant populates the existing fields with mean solar date and time", () => {
  const now = Date.UTC(2026, 9, 5, 23, 30);
  const instant = resolveInitialInstant(undefined, undefined, 15, now);

  assert.equal(instant, now);
  assert.equal(dateInputValue(instant, 15), "2026-10-06");
  assert.equal(timeInputValue(instant, 15), "00:30");
});

test("a complete URL date and time override the current instant", () => {
  const now = Date.UTC(2026, 9, 5, 23, 30);
  const instant = resolveInitialInstant("2026-12-21", "21:00", 15, now);

  assert.equal(instant, fromLocal(2026, 11, 21, 21, 0, 15));
});
