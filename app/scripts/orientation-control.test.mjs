import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function loadModules() {
  const server = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const [{ OrientationControl }, { observedViewState }] = await Promise.all([
      server.ssrLoadModule("/src/components/orientation-control.tsx"),
      server.ssrLoadModule("/src/lib/astronomy/observed.ts"),
    ]);
    return { OrientationControl, observedViewState };
  } finally {
    await server.close();
  }
}

function renderedControl(OrientationControl, props) {
  return createElement(
    OrientationControl,
    props,
    ({ controls, status, chart }) =>
      createElement("section", null, controls, status, chart),
  );
}

function commonProps(observed, instant, orientationHook) {
  return {
    snapshot: observed.snapshot,
    moonPath: observed.moonPath,
    sunPath: observed.sunPath,
    selectedLatDeg: 51.5,
    selectedLonDeg: -0.12,
    currentLocationAvailable: true,
    locationRevision: 0,
    instant,
    stopAnimation() {},
    setInstant() {},
    adoptDeviceLocation() {},
    orientationHook,
  };
}

test("OrientationControl gates a stale heading on source invalidation and keeps sharing canonical", async () => {
  const { OrientationControl, observedViewState } = await loadModules();
  const instant = Date.UTC(2026, 9, 25, 20);
  const observed = observedViewState(instant, 51.5, -0.12, instant);
  let stopCalls = 0;
  const orientationHook = () => ({
    state: {
      status: "active",
      trueHeadingDeg: 120,
      displayAzimuthDeg: 40,
      turnToMoonDeg: 40,
      aligned: false,
      posture: "flat",
      quality: "good",
      headingReference: "true",
    },
    start() {},
    stop() {
      stopCalls += 1;
    },
    acceptDeviceLocation() {},
  });
  const props = commonProps(observed, instant, orientationHook);

  let renderer;
  await act(async () => {
    renderer = create(renderedControl(OrientationControl, props));
  });
  let svgs = renderer.root.findAllByType("svg");
  assert.equal(svgs.length, 2);
  assert.equal(svgs[0].props["data-orientation-active"], "true");
  assert.equal(svgs[1].props["data-share-sky-chart"], true);
  assert.equal(svgs[1].props["data-orientation-active"], undefined);

  await act(async () => {
    renderer.update(
      renderedControl(OrientationControl, {
        ...props,
        currentLocationAvailable: false,
      }),
    );
  });
  svgs = renderer.root.findAllByType("svg");
  assert.equal(stopCalls, 1);
  assert.equal(svgs[0].props["data-orientation-active"], undefined);
  assert.equal(svgs[1].props["data-orientation-active"], undefined);

  await act(async () => renderer.unmount());
});

test("OrientationControl automatically adopts only rounded mismatch coordinates", async () => {
  const { OrientationControl, observedViewState } = await loadModules();
  const instant = Date.UTC(2026, 9, 25, 20);
  const observed = observedViewState(instant, 51.5, -0.12, instant);
  let state = {
    status: "location-mismatch",
    deviceLocation: { latDeg: 40.712776, lonDeg: -74.005974 },
  };
  const adopted = [];
  let acceptCalls = 0;
  const orientationHook = () => ({
    state,
    start() {},
    stop() {},
    acceptDeviceLocation() {
      acceptCalls += 1;
      state = { status: "acquiring-heading" };
    },
  });
  const props = {
    ...commonProps(observed, instant, orientationHook),
    adoptDeviceLocation(latDeg, lonDeg) {
      adopted.push([latDeg, lonDeg]);
    },
  };

  let renderer;
  await act(async () => {
    renderer = create(renderedControl(OrientationControl, props));
  });
  assert.deepEqual(adopted, [[40.713, -74.006]]);
  assert.equal(acceptCalls, 0);

  await act(async () => {
    renderer.update(
      renderedControl(OrientationControl, {
        ...props,
        selectedLatDeg: 40.713,
        selectedLonDeg: -74.006,
      }),
    );
  });
  assert.equal(acceptCalls, 1);

  await act(async () => renderer.unmount());
});

test("OrientationControl keeps exact visual guidance out of its one polite live node", async () => {
  const { OrientationControl, observedViewState } = await loadModules();
  const instant = Date.UTC(2026, 9, 25, 20);
  const observed = observedViewState(instant, 51.5, -0.12, instant);
  const orientationHook = () => ({
    state: {
      status: "active",
      trueHeadingDeg: 120,
      displayAzimuthDeg: 24.4,
      turnToMoonDeg: 24.4,
      aligned: false,
      posture: "flat",
      quality: "good",
      headingReference: "true",
    },
    start() {},
    stop() {},
    acceptDeviceLocation() {},
  });

  let renderer;
  await act(async () => {
    renderer = create(
      renderedControl(
        OrientationControl,
        commonProps(observed, instant, orientationHook),
      ),
    );
  });
  const liveNodes = renderer.root.findAll(
    (node) => node.props["aria-live"] === "polite",
  );
  assert.equal(liveNodes.length, 1);
  assert.match(liveNodes[0].props.className, /sr-only/);
  assert.equal(liveNodes[0].children.join(""), "Turn 30° right");
  const exactNodes = renderer.root.findAll(
    (node) => node.children.join("") === "Turn 24° right",
  );
  assert.equal(exactNodes.length, 1);
  assert.equal(exactNodes[0].props["aria-live"], undefined);

  await act(async () => renderer.unmount());
});
