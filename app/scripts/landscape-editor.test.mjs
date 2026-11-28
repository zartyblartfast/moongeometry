import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

const query = "?lat=40.7&lon=-74&date=2026-11-27&time=20:00";
const artifacts = process.env.MOON_LAYOUT_ARTIFACT_DIR;
const baselineOnly = process.env.MOON_LAYOUT_BASELINE === "1";
const previous = {
  auth: process.env.VITE_AUTH_ENABLED,
  db: process.env.DATABASE_URL,
};
let server, browser, base;
const evidence = { states: [], warnings: [], cleanup: {} };
before(
  async () => {
    process.env.VITE_AUTH_ENABLED = "false";
    delete process.env.DATABASE_URL;
    server = await createServer({
      root: process.env.MOON_LAYOUT_ROOT ?? projectRoot(),
      logLevel: "error",
      server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
    });
    await server.listen();
    base = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch();
    if (artifacts) await mkdir(artifacts, { recursive: true });
  },
  { timeout: 120_000 },
);
after(
  async () => {
    try {
      const remaining = browser?.contexts().length ?? 0;
      await browser?.close();
      evidence.cleanup.contextsRemaining = remaining;
      evidence.cleanup.browserClosed = !browser?.isConnected();
      assert.equal(remaining, 0);
    } finally {
      try {
        await server?.close();
        evidence.cleanup.serverClosed = !server?.httpServer?.listening;
      } finally {
        if (previous.auth === undefined) delete process.env.VITE_AUTH_ENABLED;
        else process.env.VITE_AUTH_ENABLED = previous.auth;
        if (previous.db === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previous.db;
        evidence.cleanup.environmentRestored =
          process.env.VITE_AUTH_ENABLED === previous.auth &&
          process.env.DATABASE_URL === previous.db;
        if (artifacts)
          await writeFile(
            join(artifacts, "evidence.json"),
            JSON.stringify(evidence, null, 2),
          );
      }
    }
  },
  { timeout: 120_000 },
);

async function open(
  t,
  {
    width = 844,
    height = 390,
    fallback = true,
    touch = true,
    url = query,
    geolocation,
    instrument = false,
    cameraProbe = false,
  } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
    ...(geolocation ? { geolocation, permissions: ["geolocation"] } : {}),
  });
  t.after(() => context.close());
  if (fallback)
    await context.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
  await context.route("https://grok.com/grok-app-builder/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  const page = await context.newPage();
  if (instrument)
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.__layoutListeners = new Set();
      window.matchMedia = (query) => {
        const media = original(query);
        if (
          query ===
          "(min-width: 640px) and (max-width: 1023px) and (max-height: 540px)"
        ) {
          const add = media.addEventListener.bind(media),
            remove = media.removeEventListener.bind(media);
          media.addEventListener = (type, callback, options) => {
            if (type === "change") window.__layoutListeners.add(callback);
            return add(type, callback, options);
          };
          media.removeEventListener = (type, callback, options) => {
            if (type === "change") window.__layoutListeners.delete(callback);
            return remove(type, callback, options);
          };
        }
        return media;
      };
    });
  if (cameraProbe)
    await page.route("**/src/components/moon-app.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const call = "observedViewState(instant, lat, lon, orbit)";
      assert.ok(
        source.includes(call),
        "response-only observed-view call counter seam",
      );
      await route.fulfill({
        response,
        body: source.replace(
          call,
          `(window.__layoutObservedCalls = (window.__layoutObservedCalls ?? 0) + 1, ${call})`,
        ),
      });
    });
  if (cameraProbe)
    await page.route("**/src/components/space-scene.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      assert.ok(
        source.includes("renderer.render(scene, camera);"),
        "response-only camera inspection seam",
      );
      await route.fulfill({
        response,
        body: source.replaceAll(
          "renderer.render(scene, camera);",
          "window.__layoutCamera={camera,renderer}; renderer.render(scene,camera);",
        ),
      });
    });
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") evidence.warnings.push(message.text());
  });
  t.after(() => assert.deepEqual(errors, [], "no browser/hydration errors"));
  await page.goto(url.startsWith("http") ? url : base + "/" + url);
  const expectedTime = new URL(url, base).searchParams.get("time") ?? "20:00";
  await page.waitForFunction(
    (expectedTime) =>
      document.querySelector('input[type="time"]')?.value === expectedTime &&
      document.querySelector('[title^="IANA zone:"]'),
    expectedTime,
  );
  await page.evaluate(() => document.fonts.ready);
  return page;
}
function sky(page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Local sky path", exact: true }),
  });
}
function disclosure(page) {
  return page.getByRole("button", {
    name: "Change place or time",
    exact: true,
  });
}
const time = (page) => page.getByLabel("Mean solar time", { exact: true });
const latitude = (page) => page.getByRole("slider", { name: /^Latitude / });
const scrubber = (page) =>
  page.getByRole("slider", {
    name: "Scrub mean solar time through the selected day",
    exact: true,
  });
async function snapshot(page, name) {
  const data = await page.evaluate(() => {
    const section = [...document.querySelectorAll("section")].find(
      (n) => n.querySelector("h2")?.textContent === "Local sky path",
    );
    const svg = [
      ...section.querySelectorAll("svg:not([data-share-sky-chart])"),
    ].find(
      (n) =>
        n.querySelector("[data-sky-horizon]") &&
        n.getBoundingClientRect().height > 10,
    );
    const clock = document.querySelector('input[type="time"]');
    const lat = [...document.querySelectorAll('input[type="range"]')].find(
      (n) => n.closest("label")?.textContent.startsWith("Latitude"),
    );
    const result = [...section.querySelectorAll("p")].find((n) =>
      n.textContent.startsWith("The Moon is"),
    );
    const rect = (n) => {
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height };
    };
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
        scale: visualViewport.scale,
        coarse: matchMedia("(pointer:coarse)").matches,
      },
      fonts: [...document.fonts].map((f) => ({
        family: f.family,
        status: f.status,
      })),
      rectangles: {
        sky: rect(section),
        stage: rect(svg.parentElement),
        time: rect(clock.parentElement),
        latitude: rect(lat.closest("label")),
        result: rect(result),
        place: rect(
          document.querySelector('section[aria-label="Place and time"]'),
        ),
        orbit: rect(
          document.querySelector("[data-share-orbit-scene]").closest("section"),
        ),
      },
      inputs: [...document.querySelectorAll("main input")].map((n) => ({
        type: n.type,
        label:
          n.labels?.[0]?.textContent?.trim() ?? n.getAttribute("aria-label"),
        value: n.value,
        rect: rect(n),
      })),
      stats: section.querySelector("dl").textContent,
      header: section.querySelector("h2").parentElement.textContent,
      geometry: [
        ...svg.querySelectorAll("path,circle,line,ellipse,polyline"),
      ].map((n) =>
        [...n.attributes]
          .filter((a) =>
            [
              "d",
              "cx",
              "cy",
              "r",
              "x1",
              "x2",
              "y1",
              "y2",
              "rx",
              "ry",
              "points",
              "transform",
            ].includes(a.name),
          )
          .map((a) => [a.name, a.value]),
      ),
      overflow: document.documentElement.scrollWidth > innerWidth,
      query: location.search,
    };
  });
  evidence.states.push({ name, ...data });
  if (artifacts) {
    await writeFile(
      join(artifacts, name + ".json"),
      JSON.stringify(data, null, 2),
    );
    await page.screenshot({
      path: join(artifacts, name + ".png"),
      fullPage: /^(fallback|fonts)-/.test(name),
    });
  }
  return data;
}
async function comparison(page, name = "comparison") {
  const data = await snapshot(page, name);
  const rects = ["stage", "time", "latitude", "result"].map(
    (k) => data.rectangles[k],
  );
  const top = Math.min(...rects.map((r) => r.y));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  assert.equal(data.rectangles.stage.height, 208, "native ordinary sky stage");
  assert.ok(
    bottom - top <= 390,
    `full sky, complete time, latitude and primary result need ${bottom - top}px; viewport has 390px`,
  );
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, top - 8));
  return data;
}

async function compareBaseline(name, current) {
  if (baselineOnly || !process.env.MOON_LAYOUT_BASELINE_DIR) return;
  const baseline = JSON.parse(
    await readFile(
      join(process.env.MOON_LAYOUT_BASELINE_DIR, name + ".json"),
      "utf8",
    ),
  );
  for (const key of ["rectangles", "inputs", "geometry", "stats", "header"])
    assert.deepEqual(current[key], baseline[key], name + " " + key);
}

test(
  "outside-gate native geometry retains the fixed New York baseline",
  { timeout: 180_000 },
  async (t) => {
    for (const fallback of [true, false]) {
      for (const [width, height] of [
        [1440, 900],
        [1280, 800],
        [390, 844],
        [340, 452],
        [844, 390],
      ]) {
        const page = await open(t, {
          width,
          height,
          fallback,
          touch: width < 1024,
        });
        const name = `${fallback ? "fallback" : "fonts"}-${width}x${height}`;
        const current = await snapshot(page, name);
        assert.equal(current.overflow, false);
        assert.equal(
          current.rectangles.stage.height,
          width >= 1024 ? 256 : 208,
        );
        await compareBaseline(name, current);
        if (width < 640) {
          await disclosure(page).click();
          const expanded = await snapshot(page, name + "-expanded");
          assert.equal(expanded.overflow, false);
          assert.equal(expanded.rectangles.stage.height, 208);
          await compareBaseline(name + "-expanded", expanded);
        }
        await page.context().close();
      }
    }
  },
);

async function visibleComparison(page) {
  const visibility = await page.evaluate(() => {
    const section = document.querySelector(".local-sky-panel");
    const stage = [...section.querySelectorAll("svg")].find((n) =>
      n.querySelector("[data-sky-horizon]"),
    ).parentElement;
    const nodes = [
      stage,
      document.querySelector('input[type="time"]').parentElement,
      document.querySelector("#observer-latitude").closest("label"),
      ...[...section.querySelectorAll("p")].filter((n) =>
        n.textContent.startsWith("The Moon is"),
      ),
    ];
    return nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        visible: r.top >= 0 && r.bottom <= innerHeight,
        height: r.height,
      };
    });
  });
  assert.ok(
    visibility.every((n) => n.visible),
    JSON.stringify(visibility),
  );
  return visibility;
}
async function trustedDrag(page, locator, target) {
  const box = await locator.boundingBox();
  const before = await locator.evaluate((n) => ({
    min: +n.min,
    max: +n.max,
    value: +n.value,
  }));
  const x = (value) =>
    box.x +
    8 +
    ((box.width - 16) * (value - before.min)) / (before.max - before.min);
  const y = box.y + box.height / 2;
  await locator.evaluate((n) => {
    n.__inputs = [];
    n.addEventListener("input", (e) =>
      n.__inputs.push({ trusted: e.isTrusted, value: n.value }),
    );
  });
  const cdp = await page.context().newCDPSession(page);
  const intermediate = [];
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: x(before.value), y }],
    });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x(before.value) + ((x(target) - x(before.value)) * i) / 12, y },
        ],
      });
      await page.waitForTimeout(35);
      const rect = await locator.boundingBox();
      assert.ok(
        Math.abs(rect.y - box.y) < 1 &&
          Math.abs(rect.x - box.x) < 1 &&
          Math.abs(rect.width - box.width) < 1 &&
          Math.abs(rect.height - box.height) < 1,
        "native track remains under the finger at every intermediate",
      );
      intermediate.push(await locator.inputValue());
      await visibleComparison(page);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
  assert.equal(
    +(await locator.inputValue()),
    target,
    "exact native drag endpoint",
  );
  assert.ok(
    new Set(intermediate).size >= 5,
    "continuous native intermediate updates",
  );
  const events = await locator.evaluate((n) => n.__inputs);
  assert.ok(
    events.length >= 5 && events.every((e) => e.trusted),
    "all scientific drag inputs are trusted",
  );
  return { before, target, intermediate, events };
}

test(
  "native touch and keyboard edits compare in place, replace the URL and restore in a fresh context",
  { timeout: 120_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t);
    await disclosure(page).click();
    await comparison(page); // The only initial reveal; never repair scroll during edits.
    await visibleComparison(page);
    const before = await snapshot(page, "interaction-start");
    const historyLength = await page.evaluate(() => history.length);
    const initialScroll = await page.evaluate(() => scrollY);
    evidence.states.push({
      name: "comparison-position",
      initialRevealScroll: initialScroll,
    });
    await page.evaluate(() => {
      window.__layoutScrollCalls = [];
      for (const key of ["scrollTo", "scrollBy"]) {
        const original = window[key].bind(window);
        window[key] = (...args) => {
          window.__layoutScrollCalls.push({ key, args });
          return original(...args);
        };
      }
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (...args) {
        window.__layoutScrollCalls.push({ key: "scrollIntoView", args });
        return original.apply(this, args);
      };
    });
    const drags = [];
    for (const [locator, target, key, value] of [
      [scrubber(page), 1380, "time", "23:00"],
      [scrubber(page), 1200, "time", "20:00"],
      [latitude(page), 20, "lat", "20"],
      [latitude(page), 40.7, "lat", "40.7"],
    ]) {
      console.log(
        "DRAG",
        key,
        value,
        "scroll",
        await page.evaluate(() => scrollY),
      );
      drags.push(await trustedDrag(page, locator, target));
      await page.waitForFunction(
        ({ key, value }) =>
          new URLSearchParams(location.search).get(key) === value,
        { key, value },
      );
      assert.equal(await page.evaluate(() => history.length), historyLength);
      assert.equal(await page.evaluate(() => scrollY), initialScroll);
      assert.deepEqual(
        await page.evaluate(() => window.__layoutScrollCalls),
        [],
      );
      await snapshot(page, `touch-${key}-${value.replace(":", "-")}`);
    }
    for (const hour of ["23", "20"]) {
      await time(page).click({ position: { x: 16, y: 18 } });
      await time(page).pressSequentially(hour);
      await page.waitForFunction(
        (hour) =>
          new URLSearchParams(location.search).get("time") === hour + ":00",
        hour,
      );
      await visibleComparison(page);
    }
    await latitude(page).focus();
    for (const [key, target] of [
      ["ArrowLeft", 20],
      ["ArrowRight", 40.7],
    ]) {
      for (let i = 0; i < 207; i++) await page.keyboard.press(key);
      assert.equal(+(await latitude(page).inputValue()), target);
      await visibleComparison(page);
    }
    assert.equal(await page.evaluate(() => scrollY), initialScroll);
    assert.deepEqual(await page.evaluate(() => window.__layoutScrollCalls), []);
    assert.equal(await page.evaluate(() => history.length), historyLength);
    const after = await snapshot(page, "interaction-restored");
    assert.deepEqual(after.geometry, before.geometry);
    assert.equal(after.stats, before.stats);
    await time(page).focus();
    await time(page).press("Home");
    await time(page).pressSequentially("23");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "23:00",
    );
    const shared = await open(t, { url: page.url() });
    await disclosure(shared).click();
    assert.equal(await time(shared).inputValue(), "23:00");
    assert.equal(await latitude(shared).inputValue(), "40.7");
    assert.equal(
      await shared.getByLabel("Date", { exact: true }).inputValue(),
      "2026-11-27",
    );
    assert.equal(new URL(shared.url()).searchParams.get("lon"), "-74");
    assert.deepEqual([...new URL(shared.url()).searchParams.keys()].sort(), [
      "date",
      "lat",
      "lon",
      "time",
    ]);
    assert.equal(
      await sky(shared).locator("dl").innerText(),
      await sky(page).locator("dl").innerText(),
    );
    evidence.states.push({
      name: "native-interactions",
      drags,
      repeatedComparisonTravel: 0,
      programmaticScrollCalls: [],
      historyLength,
      shared: shared.url(),
    });
  },
);

test(
  "focused primary edits survive every responsive boundary without changing the observation or remounting diagrams",
  { timeout: 90_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t, { cameraProbe: true });
    await disclosure(page).click();
    const canvas = await page
      .locator("[data-share-orbit-scene] canvas")
      .elementHandle();
    await page
      .getByRole("button", { name: "From the north", exact: true })
      .click();
    const orbital = page.locator("[data-share-orbit-scene] canvas");
    await orbital.scrollIntoViewIfNeeded();
    const box = await orbital.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 38,
      box.y + box.height / 2 - 16,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForFunction(() => !!window.__layoutCamera);
    const camera = await page.evaluateHandle(
      () => window.__layoutCamera.camera,
    );
    const cameraPosition = await page.evaluate(() => ({
      position: window.__layoutCamera.camera.position.toArray(),
      up: window.__layoutCamera.camera.up.toArray(),
    }));
    const horizon = await page
      .locator("svg:not([data-share-sky-chart]) [data-sky-horizon]")
      .elementHandle();
    await time(page).fill("23:00");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "23:00",
    );
    const url = page.url();
    await time(page).focus();
    await time(page).press("Home");
    await time(page).press("Backspace");
    assert.equal(await time(page).inputValue(), "");
    await page.evaluate(() => {
      window.__resizeWrites = [];
      for (const key of ["replaceState", "pushState"]) {
        const original = history[key].bind(history);
        history[key] = (...args) => {
          window.__resizeWrites.push({ key, url: args[2] });
          return original(...args);
        };
      }
    });
    const callsBeforeResize = await page.evaluate(
      () => window.__layoutObservedCalls,
    );
    assert.ok(callsBeforeResize > 0, "real observed view counter attached");
    for (const [width, height] of [
      [639, 390],
      [640, 390],
      [1023, 390],
      [1024, 390],
      [1023, 540],
      [1023, 541],
      [640, 541],
      [640, 540],
      [390, 844],
      [844, 390],
      [1024, 540],
      [1023, 540],
      [640, 540],
      [639, 540],
      [640, 540],
    ]) {
      await page.setViewportSize({ width, height });
      const active = width >= 640 && width <= 1023 && height <= 540;
      await page.waitForFunction(
        (active) =>
          document
            .querySelector("main")
            .hasAttribute("data-landscape-editor") === active,
        active,
      );
      assert.equal(
        await time(page).evaluate((n) => n === document.activeElement),
        true,
        `focused time survives ${width}x${height}`,
      );
      assert.equal(
        await time(page).inputValue(),
        "",
        "incomplete local draft remains correctable",
      );
      assert.equal(
        page.url(),
        url,
        "resize cannot commit an incomplete edit or write observation URL",
      );
      assert.equal(
        await canvas.evaluate(
          (n) =>
            n.isConnected &&
            n === document.querySelector("[data-share-orbit-scene] canvas"),
        ),
        true,
        "same orbital canvas",
      );
      assert.equal(
        await horizon.evaluate((n) => n.isConnected),
        true,
        "same sky geometry element",
      );
      assert.equal(
        await camera.evaluate((n) => n === window.__layoutCamera.camera),
        true,
        "same camera instance",
      );
      assert.deepEqual(
        await page.evaluate(() => ({
          position: window.__layoutCamera.camera.position.toArray(),
          up: window.__layoutCamera.camera.up.toArray(),
        })),
        cameraPosition,
        "free camera view is not reset by responsive editing",
      );
      assert.deepEqual(
        await page.evaluate(() => window.__resizeWrites),
        [],
        "resize never writes URL history",
      );
      assert.equal(
        await page.evaluate(() => window.__layoutObservedCalls),
        callsBeforeResize,
        "reflow does not recalculate snapshots or paths",
      );
      assert.equal(await page.locator('input[type="time"]').count(), 1);
      assert.equal(await page.locator('input[type="date"]').count(), 1);
      assert.equal(await page.locator('input[type="range"]').count(), 4);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    await page.getByLabel("Date", { exact: true }).focus();
    assert.equal(
      await time(page).inputValue(),
      "23:00",
      "blur restores committed instant after boundary crossings",
    );
    assert.equal(page.url(), url);
    for (const [control, key, value, sizes] of [
      [
        latitude(page),
        "lat",
        "40.6",
        [
          [639, 540],
          [640, 540],
        ],
      ],
      [
        scrubber(page),
        "time",
        "22:55",
        [
          [640, 541],
          [640, 540],
        ],
      ],
    ]) {
      await control.focus();
      await control.press("ArrowLeft");
      await page.waitForFunction(
        ({ key, value }) =>
          new URLSearchParams(location.search).get(key) === value,
        { key, value },
      );
      const committedUrl = page.url();
      const committed = await control.inputValue();
      await page.evaluate(() => (window.__resizeWrites = []));
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        const active = width >= 640 && width <= 1023 && height <= 540;
        await page.waitForFunction(
          (active) =>
            document
              .querySelector("main")
              .hasAttribute("data-landscape-editor") === active,
          active,
        );
        assert.equal(
          await control.evaluate((n) => n === document.activeElement),
          true,
          "focused range restored before paint",
        );
        assert.equal(await control.inputValue(), committed);
        assert.equal(page.url(), committedUrl);
        assert.deepEqual(await page.evaluate(() => window.__resizeWrites), []);
      }
    }
    evidence.states.push({
      name: "responsive-boundaries",
      count: 19,
      url,
      retainedDraft: true,
      canvasStable: true,
      skyStable: true,
      cameraStable: true,
      primaryRangeFocus: true,
      resizeUrlWrites: [],
      resizeObservedRecalculations: 0,
    });
  },
);

test(
  "keyboard disclosure enters the primary fields in logical native DOM and Tab order",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t, { touch: false });
    await disclosure(page).focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await time(page).evaluate((n) => n === document.activeElement),
      true,
      "keyboard opening focuses primary time, not offscreen search",
    );
    const order = await page.evaluate(() => {
      const sky = document.querySelector(".local-sky-panel");
      const primary = document.getElementById("primary-observation-fields");
      const place = document.querySelector('[aria-label="Place and time"]');
      const orbit = document
        .querySelector("[data-share-orbit-scene]")
        .closest("section");
      return {
        primaryInSky: sky.contains(primary),
        skyBeforePlace: !!(
          sky.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
        placeBeforeOrbit: !!(
          place.compareDocumentPosition(orbit) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
        controls: document
          .querySelector('[aria-controls*="manual-moment-fields"]')
          .getAttribute("aria-controls")
          .split(" ")
          .map((id) => ({ id, exists: !!document.getElementById(id) })),
        positive: document.querySelectorAll(
          '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])',
        ).length,
      };
    });
    assert.equal(order.primaryInSky, true);
    assert.equal(order.skyBeforePlace, true);
    assert.equal(
      order.placeBeforeOrbit,
      true,
      "orbital controls follow editor in both DOM and visual order",
    );
    assert.ok(
      order.controls.some((n) => n.id === "primary-observation-fields"),
    );
    assert.ok(order.controls.every((n) => n.exists));
    assert.equal(order.positive, 0);
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page
        .getByRole("button", { name: "Explain", exact: true })
        .evaluate((n) => n === document.activeElement),
      true,
      "backward Tab reaches the preceding sky action",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await time(page).evaluate((n) => n === document.activeElement),
      true,
    );
    // Native time has multiple internal segments; Tab through them to the range.
    for (
      let i = 0;
      i < 5 &&
      !(await scrubber(page).evaluate((n) => n === document.activeElement));
      i++
    )
      await page.keyboard.press("Tab");
    assert.equal(
      await scrubber(page).evaluate((n) => n === document.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await latitude(page).evaluate((n) => n === document.activeElement),
      true,
    );
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await scrubber(page).evaluate((n) => n === document.activeElement),
      true,
    );
    const chain = [
      latitude(page),
      page.getByRole("button", { name: "Use my location", exact: true }),
      page.getByRole("button", { name: "Use current time", exact: true }),
      disclosure(page),
      page.getByLabel("Viewing location", { exact: true }),
      page.getByRole("button", { name: "Search", exact: true }),
      page.getByLabel("Date", { exact: true }),
      page.getByRole("slider", { name: /^Longitude / }),
      page.getByRole("slider", { name: /^Earth spin / }),
      page.getByRole("button", {
        name: "Explain the orbital geometry colors",
        exact: true,
      }),
    ];
    await chain[0].focus();
    for (const key of ["Tab", "Shift+Tab"]) {
      const traversal = key === "Tab" ? chain : [...chain].reverse();
      for (let i = 1; i < traversal.length; i++) {
        const previous = traversal[i - 1],
          next = traversal[i];
        for (let segment = 0; segment < 8; segment++) {
          await page.keyboard.press(key);
          if (await next.evaluate((n) => n === document.activeElement)) break;
          assert.equal(
            await previous.evaluate((n) => n === document.activeElement),
            true,
            "only native date segments may consume an extra Tab",
          );
        }
        assert.equal(
          await next.evaluate((n) => n === document.activeElement),
          true,
          `native ${key} follows semantic control order`,
        );
      }
    }
    await disclosure(page).focus();
    await page.keyboard.press("Enter");
    assert.equal(await disclosure(page).getAttribute("aria-expanded"), "false");
    assert.equal(
      await disclosure(page).evaluate((n) => n === document.activeElement),
      true,
    );
    await disclosure(page).click();
    assert.equal(
      await time(page).evaluate((n) => n === document.activeElement),
      false,
      "pointer opening must not summon the keyboard",
    );
  },
);

test(
  "portrait keyboard disclosure does not defer an autofocus into a later landscape resize",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t, { width: 390, height: 844, touch: false });
    await disclosure(page).focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await disclosure(page).evaluate((n) => n === document.activeElement),
      true,
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() =>
      document.querySelector("main").hasAttribute("data-landscape-editor"),
    );
    assert.equal(
      await disclosure(page).evaluate((n) => n === document.activeElement),
      true,
      "resize cannot resurrect an old keyboard entry request",
    );
  },
);

test(
  "one original control each, scientific semantics and secondary controls remain reachable on one page",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t);
    await disclosure(page).click();
    assert.equal(await page.locator('main input[type="time"]').count(), 1);
    assert.equal(await page.locator('main input[type="date"]').count(), 1);
    assert.equal(await page.locator('main input[type="range"]').count(), 4);
    assert.equal(await page.locator('main input[type="search"]').count(), 1);
    const semantics = await sky(page).evaluate((section) => ({
      validData: [...section.querySelector("dl").children].every(
        (n) =>
          n.tagName === "DIV" && n.querySelector("dt") && n.querySelector("dd"),
      ),
      caveat: section.textContent.includes(
        "Rise/set · Moon centre, standard refraction",
      ),
      atmosphere: section.textContent.includes("Standard atmosphere"),
      legend: section.querySelector("fieldset legend")?.textContent,
      uniqueIds:
        [...document.querySelectorAll("[id]")].length ===
        new Set([...document.querySelectorAll("[id]")].map((n) => n.id)).size,
      nestedScroll: [...document.querySelectorAll("main *")].filter(
        (n) =>
          ["auto", "scroll"].includes(getComputedStyle(n).overflowY) &&
          n.scrollHeight > n.clientHeight,
      ).length,
    }));
    assert.deepEqual(semantics, {
      validData: true,
      caveat: true,
      atmosphere: true,
      legend: "Time and latitude",
      uniqueIds: true,
      nestedScroll: 0,
    });
    const controls = [
      page.getByLabel("Viewing location", { exact: true }),
      page.getByRole("button", { name: "Search", exact: true }),
      page.getByRole("button", { name: "Use my location", exact: true }),
      page.getByRole("button", { name: "Use current time", exact: true }),
      disclosure(page),
      page.getByLabel("Date", { exact: true }),
      page.getByRole("slider", { name: /^Longitude / }),
      page.getByRole("slider", { name: /^Earth spin / }),
      page.getByRole("button", { name: "Spin Earth", exact: true }),
      page.getByRole("button", { name: "Slide the Moon", exact: true }),
    ];
    for (const control of controls) {
      await control.scrollIntoViewIfNeeded();
      const r = await control.boundingBox();
      assert.ok(
        r && r.height > 0 && r.y >= 0 && r.y + r.height <= 391,
        "original secondary control is actually reachable in the window",
      );
    }
    evidence.states.push({
      name: "secondary-reachability",
      controls: controls.length,
      semantics,
    });
  },
);

test(
  "native media subscription is removed on workspace unmount and renewed once on return",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t, { instrument: true });
    assert.equal(await page.evaluate(() => window.__layoutListeners.size), 1);
    await page
      .getByRole("link", { name: "Lunar Parallax", exact: true })
      .click();
    await page.waitForURL("**/lunar-parallax/");
    await page.waitForFunction(() => window.__layoutListeners.size === 0);
    await page.getByRole("link", { name: "Moon Path", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('input[type="time"]')?.value === "20:00" &&
        window.__layoutListeners.size === 1,
    );
    evidence.states.push({
      name: "media-lifecycle",
      active: 1,
      unmounted: 0,
      returned: 1,
    });
  },
);

test(
  "real playback, hemisphere edits and native resets retain conditional scientific disclosures",
  { timeout: 90_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t);
    await disclosure(page).click();
    await comparison(page);
    await trustedDrag(page, latitude(page), -40.7);
    await snapshot(page, "southern-hemisphere");
    await trustedDrag(page, latitude(page), 40.7);
    const declination = sky(page)
      .locator("dt")
      .filter({ hasText: /^Declination$/ })
      .locator("..")
      .locator("dd");
    const original = await declination.innerText();
    const slide = page.getByRole("button", {
      name: "Slide the Moon",
      exact: true,
    });
    const notice = sky(page).getByText("Simulated sky.", { exact: true });
    await slide.click();
    await notice.waitFor();
    await page.waitForFunction(
      (before) =>
        [...document.querySelectorAll("dt")].find(
          (n) => n.textContent === "Declination",
        )?.nextElementSibling?.textContent !== before,
      original,
    );
    await slide.click();
    assert.equal(await slide.getAttribute("aria-pressed"), "false");
    assert.equal(await notice.isVisible(), true);
    assert.notEqual(await declination.innerText(), original);
    await sky(page).scrollIntoViewIfNeeded();
    await snapshot(page, "paused-slide");
    const spin = page.getByRole("button", { name: "Spin Earth", exact: true });
    const clock = await time(page).inputValue();
    await spin.click();
    await page.waitForFunction(
      (clock) => document.querySelector('input[type="time"]').value !== clock,
      clock,
    );
    await spin.click();
    assert.equal(
      await notice.isVisible(),
      true,
      "Spin does not erase independent orbit",
    );
    await page
      .getByRole("button", { name: "Use current time", exact: true })
      .click();
    await notice.waitFor({ state: "detached" });
    await slide.click();
    await notice.waitFor();
    await slide.click();
    await page
      .getByRole("button", { name: "Summer full Moon", exact: true })
      .click();
    await notice.waitFor({ state: "detached" });
    assert.equal(await time(page).inputValue(), "22:00");
    evidence.states.push({
      name: "actual-playback",
      declinationBefore: original,
      slidePaused: true,
      spinChangedClock: true,
      currentTimeCleared: true,
      presetCleared: true,
      hemispheres: [40.7, -40.7],
    });
  },
);

test(
  "Explain restores the actual opener and Share downloads a real native PNG in B",
  { timeout: 90_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t);
    await disclosure(page).click();
    const opener = page.getByRole("button", { name: "Explain", exact: true });
    const trigger = await opener.elementHandle();
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: "Explain this moment",
      exact: true,
    });
    await dialog.waitFor();
    assert.match(
      await dialog.innerText(),
      /Rise \/ set · mean solar, then UTC/,
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction((n) => document.activeElement === n, trigger, {
      timeout: 2000,
    });
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const share = page.getByRole("dialog", {
      name: "Moon Geometry infographic",
      exact: true,
    });
    await share
      .getByAltText("Preview of the Moon Geometry infographic", { exact: true })
      .evaluate((img) => img.decode());
    const downloadPromise = page.waitForEvent("download");
    await share
      .getByRole("button", { name: "Download PNG", exact: true })
      .click();
    const download = await downloadPromise;
    assert.equal(await download.failure(), null);
    const png = PNG.sync.read(await readFile(await download.path()));
    assert.equal(png.width, 1600);
    assert.equal(png.height, 900);
    const colours = new Set();
    for (let i = 0; i < png.data.length; i += 4)
      colours.add(png.data.subarray(i, i + 3).toString("hex"));
    assert.ok(
      colours.size > 1000,
      "actual rendered infographic, not an empty decoded image",
    );
    if (artifacts) await download.saveAs(join(artifacts, "layout-b-share.png"));
    await page.keyboard.press("Escape");
    await share.waitFor({ state: "hidden" });
    evidence.states.push({
      name: "dialogs-export",
      focusReturn: true,
      png: { width: png.width, height: png.height, colours: colours.size },
    });
  },
);

test(
  "simulated current location and unsupported orientation preserve readable notices without changing ordinary sky size",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    const page = await open(t, {
      geolocation: { latitude: 40.7, longitude: -74 },
    });
    await disclosure(page).click();
    await page
      .getByRole("button", { name: "Use my location", exact: true })
      .click();
    await page.getByText(/Using your location/).waitFor();
    const orient = page.getByRole("button", {
      name: "Orient the sky path to true north",
      exact: true,
    });
    await orient.click();
    await page.locator('[data-orientation-status="unavailable"]').waitFor();
    const data = await snapshot(page, "unsupported-orientation");
    assert.equal(data.rectangles.stage.height, 208);
    assert.equal(data.overflow, false);
    await sky(page).getByRole("button", { name: "Close", exact: true }).click();
    // Exercise the app's existing DEV preview, not simulated physical sensors.
    await page
      .getByRole("button", {
        name: "Preview the orientation instrument",
        exact: true,
      })
      .click();
    const heading = page.getByRole("slider", {
      name: "Preview true heading",
      exact: true,
    });
    await heading.focus();
    await heading.press("Home");
    for (let i = 0; i < 37; i++) await heading.press("ArrowRight");
    for (const [width, height] of [
      [390, 844],
      [844, 390],
      [1024, 800],
      [1023, 540],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await page.bringToFront();
      assert.equal(
        await heading.inputValue(),
        "37",
        "orientation controller session persists at layout boundaries",
      );
      assert.equal(
        await page
          .getByRole("button", {
            name: "Finish true-north orientation",
            exact: true,
          })
          .getAttribute("aria-pressed"),
        "true",
      );
      const instrumentHeight = await page
        .locator(".sky-comparison > div")
        .evaluate((n) => n.getBoundingClientRect().height);
      assert.ok(
        instrumentHeight > 208,
        "active instrument retains its own native height",
      );
    }
    await snapshot(page, "active-instrument-preview");
  },
);

test(
  "expanded landscape admits one shared sky/time/latitude comparison position",
  { timeout: 60_000, skip: baselineOnly },
  async (t) => {
    for (const fallback of [true, false]) {
      for (const width of [640, 844, 1023]) {
        const page = await open(t, { width, fallback });
        await disclosure(page).click();
        const name = `comparison-${fallback ? "fallback" : "fonts"}-${width}`;
        await comparison(page, name);
        await visibleComparison(page);
        if (artifacts)
          await page.screenshot({
            path: join(artifacts, name + "-position.png"),
          });
        await page.context().close();
      }
    }
  },
);
