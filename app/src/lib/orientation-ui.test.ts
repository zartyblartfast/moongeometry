import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  activeSkyChartGeometry,
  projectSkyPoint,
  segmentCrossesBox,
  skyChartLayout,
} from "../components/sky-chart-model.ts";
import {
  OrientationStatusText,
  canonicalShareHeading,
  orientationAvailabilityTransition,
  orientationLiveAnnouncement,
  orientationStatusMessage,
  selectedTimeNeedsWarning,
  shouldShowOrientationPreview,
  useOrientationInvalidationBoundary,
} from "../components/orientation-ui.ts";
import type { TrueNorthOrientationState } from "./use-true-north-orientation.ts";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const active = (
  overrides: Partial<
    Extract<TrueNorthOrientationState, { status: "active" }>
  > = {},
): Extract<TrueNorthOrientationState, { status: "active" }> => ({
  status: "active",
  trueHeadingDeg: 100,
  displayAzimuthDeg: 20,
  turnToMoonDeg: 20,
  aligned: false,
  posture: "flat",
  quality: "good",
  headingReference: "true",
  ...overrides,
});

test("default sky chart keeps the legacy north-up layout", () => {
  assert.deepEqual(skyChartLayout(undefined), {
    viewBoxWidth: 320,
    viewBoxHeight: 336,
    cx: 160,
    cy: 168,
    horizonRadius: 118,
    orientationActive: false,
  });
  assert.equal(canonicalShareHeading(273), undefined);
});

test("active precision bezel has one fixed sight, 72 ticks, four labels, and a clear zero label", () => {
  const geometry = activeSkyChartGeometry(0);
  assert.equal(geometry.sight.fixed, true);
  assert.equal(geometry.ticks.length, 72);
  assert.deepEqual(
    geometry.degreeLabels.map((label) => label.degrees),
    [0, 90, 180, 270],
  );
  assert.equal(geometry.cardinalBandCircles.length, 0);
  assert.equal(geometry.showSummitTick, false);
  for (const label of geometry.degreeLabels) {
    const cardinal = geometry.cardinals.find(
      (item) => item.trueAzimuthDeg === label.degrees,
    );
    assert.ok(cardinal);
    assert.ok(Math.hypot(label.x - cardinal.x, label.y - cardinal.y) >= 18);
  }
  const zeroTick = geometry.ticks.find((tick) => tick.degrees === 0);
  assert.ok(zeroTick);
  assert.equal(
    segmentCrossesBox(zeroTick, geometry.zeroLabelClearanceBox),
    false,
  );
});

test("cardinals rotate by heading while remaining upright", () => {
  const expectedNorthPositions = [
    [180, 62],
    [54, 188],
    [180, 314],
    [306, 188],
  ];
  for (const [index, heading] of [0, 90, 180, 270].entries()) {
    const geometry = activeSkyChartGeometry(heading);
    const north = geometry.cardinals.find((cardinal) => cardinal.label === "N");
    assert.ok(north);
    assert.deepEqual(
      [Math.round(north.x), Math.round(north.y)],
      expectedNorthPositions[index],
    );
    assert.equal(north.textRotationDeg, 0);
  }
});

test("Moon dot and path sample use the same heading-adjusted projection", () => {
  const layout = skyChartLayout(90);
  const moonDot = projectSkyPoint(35, 120, layout, 90);
  const matchingPathSample = projectSkyPoint(35, 120, layout, 90);
  assert.deepEqual(moonDot, matchingPathSample);
  assert.ok(moonDot.x > layout.cx);
  assert.ok(moonDot.y < layout.cy);
});

test("orientation status maps each Human UI state to one primary instruction", () => {
  assert.equal(
    orientationStatusMessage({ status: "requesting" }, 20).text,
    "Finding your direction…",
  );
  assert.equal(
    orientationStatusMessage({ status: "acquiring-heading" }, 20).text,
    "Finding true north…",
  );
  assert.equal(
    orientationStatusMessage(
      {
        status: "location-mismatch",
        deviceLocation: { latDeg: 51.5, lonDeg: -0.1 },
      },
      20,
    ).text,
    "Updating current location…",
  );
  assert.equal(
    orientationStatusMessage(active({ posture: "tilted" }), 20).text,
    "Hold phone flat",
  );
  assert.equal(
    orientationStatusMessage(active({ quality: "unknown" }), 20).text,
    "Hold steady while direction settles",
  );
  assert.equal(
    orientationStatusMessage(active({ quality: "limited" }), 20).text,
    "Direction may be inaccurate — move away from metal",
  );
  assert.equal(
    orientationStatusMessage(active({ turnToMoonDeg: 25 }), -1).text,
    "Moon is below the horizon in this direction",
  );
  assert.equal(
    orientationStatusMessage(active({ aligned: true, turnToMoonDeg: 1 }), 20)
      .text,
    "Aligned with Moon azimuth",
  );
  assert.equal(
    orientationStatusMessage(active({ turnToMoonDeg: -24.4 }), 20).text,
    "Turn 24° left",
  );
  assert.equal(
    orientationStatusMessage(active({ turnToMoonDeg: 24.6 }), 20).text,
    "Turn 25° right",
  );
});

test("live turning announcements coarsen adjacent sensor degrees into stable buckets", () => {
  assert.equal(
    orientationLiveAnnouncement(active({ turnToMoonDeg: 23.8 }), 20),
    "Turn 30° right",
  );
  assert.equal(
    orientationLiveAnnouncement(active({ turnToMoonDeg: 24.4 }), 20),
    "Turn 30° right",
  );
  assert.equal(
    orientationLiveAnnouncement(active({ turnToMoonDeg: -8 }), 20),
    "Turn slightly left",
  );
  assert.equal(
    orientationLiveAnnouncement(
      active({ aligned: true, turnToMoonDeg: 1 }),
      20,
    ),
    "Aligned with Moon azimuth",
  );
  assert.equal(
    orientationLiveAnnouncement(active({ posture: "tilted" }), 20),
    "Hold phone flat",
  );
});

test("visual exact guidance is readable but only coarsened text is aria-live", () => {
  const html = renderToStaticMarkup(
    createElement(OrientationStatusText, {
      state: active({ turnToMoonDeg: 24.4 }),
      moonAltitudeDeg: 20,
    }),
  );
  assert.match(html, />Turn 24° right</);
  assert.match(
    html,
    /class="sr-only"[^>]*aria-live="polite"[^>]*>Turn 30° right</,
  );
  assert.equal((html.match(/aria-live=/g) ?? []).length, 1);
});

test("location mismatch renders only transient updating copy with no comparison actions", () => {
  const html = renderToStaticMarkup(
    createElement(OrientationStatusText, {
      state: {
        status: "location-mismatch",
        deviceLocation: { latDeg: 51.5, lonDeg: -0.1 },
      },
      moonAltitudeDeg: 20,
    }),
  );
  assert.match(html, /Updating current location…/);
  assert.doesNotMatch(
    html,
    /Use my current location|Cancel|different location/,
  );
});

test("manual or searched remote location changes close real and preview orientation", () => {
  assert.deepEqual(orientationAvailabilityTransition(true, false, 0, 1), {
    stop: true,
  });
  assert.deepEqual(orientationAvailabilityTransition(false, false, 0, 1), {
    stop: true,
  });
});

test("mount hydration and controller location adoption do not close orientation", () => {
  assert.deepEqual(orientationAvailabilityTransition(false, false, 0, 0), {
    stop: false,
  });
  assert.deepEqual(orientationAvailabilityTransition(true, true, 0, 0), {
    stop: false,
  });
  assert.deepEqual(orientationAvailabilityTransition(false, true, 0, 0), {
    stop: false,
  });
});

test("render boundary gates stale orientation and invalidates in a layout effect", async () => {
  const events: string[] = [];
  let revision = 0;

  function Harness(): ReactNode {
    const allowOrientation = useOrientationInvalidationBoundary({
      currentLocationAvailable: true,
      locationRevision: revision,
      invalidate() {
        events.push("invalidate");
      },
    });
    events.push(`render:${allowOrientation ? "oriented" : "canonical"}`);
    return createElement(
      "span",
      null,
      allowOrientation ? "oriented" : "canonical",
    );
  }

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Harness));
  });
  assert.deepEqual(events, ["render:oriented"]);

  revision = 1;
  await act(async () => {
    renderer.update(createElement(Harness));
  });
  assert.deepEqual(renderer.root.findByType("span").children, ["canonical"]);
  assert.deepEqual(events.slice(1), ["render:canonical", "invalidate"]);

  await act(async () => renderer.unmount());
});

test("unavailable reasons render concise specific copy with a Close action", () => {
  const reasons = {
    "insecure-context": "Orientation needs a secure connection.",
    "location-denied": "Location access was denied.",
    "location-unavailable": "Your current location is unavailable.",
    "orientation-denied": "Direction access was denied.",
    "no-heading-source":
      "This device does not provide a usable compass heading.",
    "unknown-heading-reference":
      "This browser cannot identify true north reliably.",
    "model-expired": "True-north correction is unavailable for today.",
    "polar-location":
      "True-north orientation is unavailable at the geographic poles.",
  } as const;
  for (const [reason, copy] of Object.entries(reasons)) {
    const state = {
      status: "unavailable",
      reason,
    } as TrueNorthOrientationState;
    const html = renderToStaticMarkup(
      createElement(OrientationStatusText, { state, moonAltitudeDeg: 20 }),
    );
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /Close/);
  }
});

test("selected-time warning uses a strict ten-minute threshold", () => {
  const now = Date.UTC(2026, 9, 25, 12, 0, 0);
  assert.equal(selectedTimeNeedsWarning(now + 10 * 60_000, now), false);
  assert.equal(selectedTimeNeedsWarning(now + 10 * 60_000 + 1, now), true);
});

test("development preview is impossible in production mode", () => {
  assert.equal(shouldShowOrientationPreview(false), false);
  assert.equal(shouldShowOrientationPreview(true), true);
});
