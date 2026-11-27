import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

const artifacts = process.env.MOON_SKY_ARTIFACT_DIR;
const fontDirectory = process.env.MOON_SKY_FONT_DIR;
let controlledFontCss = "";
const previousAuth = process.env.VITE_AUTH_ENABLED;
const previousDatabase = process.env.DATABASE_URL;
let server;
let browser;
let base;
const north = "?lat=51.5&lon=-0.1&date=2026-12-21&time=21:00";

before(
  async () => {
    // Optional primary-font pass from cached, real Outfit bytes. Ordinary
    // discovery remains offline and tests font-loading failure/fallback.
    if (fontDirectory) {
      for (const weight of [400, 500, 600]) {
        const bytes = await readFile(
          join(fontDirectory, `outfit-${weight}.ttf`),
        );
        controlledFontCss += `@font-face { font-family: Outfit; font-weight: ${weight}; src: url(data:font/ttf;base64,${bytes.toString("base64")}) format('truetype'); }`;
      }
    }
    process.env.VITE_AUTH_ENABLED = "false";
    delete process.env.DATABASE_URL;
    server = await createServer({
      root: projectRoot(),
      logLevel: "error",
      server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
    });
    await server.listen();
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== "string" && address.port > 0);
    base = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch();
    if (artifacts) await mkdir(artifacts, { recursive: true });
  },
  { timeout: 120_000 },
);

after(
  async () => {
    const resources = {
      base,
      contextsBeforeClose: browser?.contexts().length ?? 0,
    };
    try {
      const remaining = browser?.contexts().length ?? 0;
      await browser?.close();
      assert.equal(remaining, 0, "owned contexts closed");
      assert.equal(
        browser?.isConnected() ?? false,
        false,
        "owned browser closed",
      );
    } finally {
      try {
        await server?.close();
        assert.equal(
          server?.httpServer?.listening ?? false,
          false,
          "owned Vite closed",
        );
        Object.assign(resources, {
          browserConnected: browser?.isConnected() ?? false,
          serverListening: server?.httpServer?.listening ?? false,
        });
        if (artifacts)
          await writeFile(
            join(artifacts, "resources.json"),
            JSON.stringify(resources, null, 2),
          );
        console.log("[sky fixture resources]", JSON.stringify(resources));
      } finally {
        if (previousAuth === undefined) delete process.env.VITE_AUTH_ENABLED;
        else process.env.VITE_AUTH_ENABLED = previousAuth;
        if (previousDatabase === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previousDatabase;
      }
    }
  },
  { timeout: 120_000 },
);

async function open(t, viewport = { width: 1440, height: 900 }, query = north) {
  const context = await browser.newContext({ viewport });
  t.after(() => context.close());
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: controlledFontCss }),
  );
  await context.route("https://grok.com/grok-app-builder/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  const page = await context.newPage();
  await page.addInitScript(() => {
    const NativeObserver = window.ResizeObserver;
    window.__skyObserverTargets = new Set();
    window.ResizeObserver = class extends NativeObserver {
      observe(target, options) {
        this.__target = target;
        if (target.matches("svg") && target.querySelector("[data-sky-horizon]"))
          window.__skyObserverTargets.add(target);
        super.observe(target, options);
      }
      disconnect() {
        window.__skyObserverTargets.forEach((target) => {
          if (this.__target === target)
            window.__skyObserverTargets.delete(target);
        });
        super.disconnect();
      }
    };
  });
  page.setDefaultTimeout(25_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  t.after(() => assert.deepEqual(errors, [], "no browser/hydration errors"));
  await page.goto(base + "/" + query);
  await page.waitForFunction(() => {
    const params = new URLSearchParams(location.search);
    return (
      document.querySelector('input[type="date"]')?.value ===
        params.get("date") &&
      document.querySelector('input[type="time"]')?.value === params.get("time")
    );
  });
  if (viewport.width < 1024)
    await page
      .getByRole("button", { name: "Change place or time", exact: true })
      .click();
  await page.waitForFunction(
    () =>
      document.body.textContent.includes("Civil ·") &&
      !document.body.textContent.includes("calculating…"),
  );
  await page.evaluate(() => document.fonts.ready);
  if (fontDirectory)
    assert.ok(
      await page.evaluate(() =>
        [...document.fonts].some(
          (face) => face.family === "Outfit" && face.status === "loaded",
        ),
      ),
      "controlled primary Outfit really loaded",
    );
  return page;
}

function chart(page) {
  // Never mistake the hidden 1px canonical export for the displayed chart.
  return page
    .locator("svg:not([data-share-sky-chart])")
    .filter({ has: page.locator("[data-sky-horizon]") });
}

async function measure(svg) {
  return svg.evaluate((node) => {
    const ctm = node.getScreenCTM();
    const rect = node.getBoundingClientRect();
    const box = node.viewBox.baseVal;
    const frameTopLeft = new DOMPoint(box.x, box.y).matrixTransform(ctm);
    const frameBottomRight = new DOMPoint(
      box.x + box.width,
      box.y + box.height,
    ).matrixTransform(ctm);
    const labels = [...node.querySelectorAll("text")].map((text) => {
      const r = text.getBoundingClientRect();
      return {
        text: text.textContent,
        size:
          parseFloat(getComputedStyle(text).fontSize) *
          Math.hypot(ctm.a, ctm.b),
        cardinal: text.hasAttribute("data-sky-cardinal"),
        left: r.left - frameTopLeft.x,
        top: r.top - frameTopLeft.y,
        right: frameBottomRight.x - r.right,
        bottom: frameBottomRight.y - r.bottom,
      };
    });
    const horizon = node.querySelector("[data-sky-horizon]");
    return {
      viewBox: node.getAttribute("viewBox"),
      width: rect.width,
      height: rect.height,
      scaleX: ctm.a,
      scaleY: ctm.d,
      horizon: [
        ...["cx", "cy", "r"].map((name) => +horizon.getAttribute(name)),
      ],
      diameter: horizon.getBoundingClientRect().width,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
        scale: visualViewport?.scale,
        rootFont: getComputedStyle(document.documentElement).fontSize,
      },
      labels,
    };
  });
}

function readable(m) {
  assert.equal(m.scaleX, m.scaleY, "uniform SVG transform");
  assert.deepEqual(m.horizon, [160, 168, 118], "world projection unchanged");
  assert.equal(
    m.labels
      .filter((label) => label.cardinal)
      .map((label) => label.text)
      .sort()
      .join(""),
    "ENSW",
  );
  for (const label of m.labels) {
    assert.ok(
      Math.abs(label.size - (label.cardinal ? 13 : 12)) < 0.15,
      `${label.text}: ${label.size} CSS px`,
    );
    assert.ok(
      Math.min(label.left, label.top, label.right, label.bottom) >= 3,
      `${label.text} has frame clearance`,
    );
  }
}

async function evidence(page, name, m) {
  if (!artifacts) return;
  await writeFile(join(artifacts, name + ".json"), JSON.stringify(m, null, 2));
  await page.screenshot({
    path: join(artifacts, name + ".png"),
    fullPage: true,
  });
}

test(
  "desktop B uses a tighter uniform frame and readable screen-sized labels",
  { timeout: 90_000 },
  async (t) => {
    const page = await open(t);
    const m = await measure(chart(page));
    await evidence(page, "desktop-1440-north", m);
    assert.equal(m.viewBox, "12 20 296 296");
    assert.equal(m.height, 256, "no panel height increase");
    readable(m);
    assert.ok(Math.abs(m.diameter - 204.1081) < 0.01);
  },
);

test(
  "native 208px phone keeps readable labels through resize without scaling the hidden export",
  { timeout: 90_000 },
  async (t) => {
    const page = await open(t, { width: 390, height: 844 });
    const canonical = page.locator("[data-share-sky-chart]");
    const hiddenBefore = await canonical.evaluate((node) => node.outerHTML);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      const m = await measure(chart(page));
      await evidence(page, `resize-${viewport.width}-${viewport.height}`, m);
      assert.equal(
        m.height,
        viewport.width >= 1024 ? 256 : 208,
        "original native stage height",
      );
      readable(m);
      assert.equal(
        await canonical.evaluate((node) => node.outerHTML),
        hiddenBefore,
        "canonical export does not use its hidden 1px dimensions or responsive viewport",
      );
    }
    const displayed = chart(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await displayed.evaluate((node) => {
      node.style.width = "220px";
    });
    await page.waitForTimeout(100);
    const constrained = await measure(displayed);
    readable(constrained);
    assert.ok(
      Math.abs(constrained.scaleX - 220 / 296) < 1e-8,
      "actual meet scale, not viewport breakpoint",
    );
    assert.equal(
      await canonical.evaluate((node) => node.outerHTML),
      hiddenBefore,
    );
    await displayed.evaluate((node) => node.style.removeProperty("width"));
    const fonts = await canonical
      .locator("text")
      .evaluateAll((nodes) =>
        nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)),
      );
    assert.ok(
      fonts.every((size) => size > 10 && size < 20),
      "export uses a meaningful nominal chart size",
    );
  },
);

async function labelAudit(svg) {
  return svg.evaluate((node) => {
    const labels = [...node.querySelectorAll("text")];
    const rect = (element) => element.getBoundingClientRect();
    const overlap = (a, b) =>
      a.left < b.right + 1 &&
      a.right > b.left - 1 &&
      a.top < b.bottom + 1 &&
      a.bottom > b.top - 1;
    const markers = [
      ...node.querySelectorAll("[data-sun-point], [data-moon-point]"),
    ];
    const overlaps = labels.flatMap((label, i) =>
      labels
        .slice(i + 1)
        .filter((other) => overlap(rect(label), rect(other)))
        .map((other) => [label.textContent, other.textContent]),
    );
    const markerOverlaps = labels.flatMap((label) =>
      markers
        .filter((marker) => overlap(rect(label), rect(marker)))
        .map((marker) => [
          label.textContent,
          marker.hasAttribute("data-sun-point") ? "Sun" : "Moon",
        ]),
    );
    const protection = labels.map((label) => {
      const style = getComputedStyle(label);
      return {
        text: label.textContent,
        stroke: style.stroke,
        width: parseFloat(style.strokeWidth),
        paintOrder: style.paintOrder,
        abovePaths: [
          ...node.querySelectorAll("[data-sun-path], [data-moon-path]"),
        ].every(
          (path) =>
            !!(
              path.compareDocumentPosition(label) &
              Node.DOCUMENT_POSITION_FOLLOWING
            ),
        ),
      };
    });
    return { overlaps, markerOverlaps, protection };
  });
}

test(
  "north-up labels remain distinct and protected from dynamic paths in representative skies",
  { timeout: 120_000 },
  async (t) => {
    const states = [
      ["north", north],
      ["south", "?lat=-33.9&lon=151.2&date=2026-12-21&time=21:00"],
      ["horizon", "?lat=51.5&lon=0&date=2026-11-19&time=00:39"],
      ["equator", "?lat=0&lon=0&date=2026-12-21&time=21:00"],
      ["high-latitude", "?lat=78&lon=15&date=2026-06-21&time=12:00"],
      ["near-zenith", "?lat=0&lon=0&date=2026-03-20&time=12:00"],
    ];
    const page = await open(t);
    const failures = [];
    for (const [name, query] of states) {
      await page.goto(base + "/" + query);
      await page.waitForFunction(
        () =>
          document.querySelector('input[type="date"]')?.value ===
          new URLSearchParams(location.search).get("date"),
      );
      await page.waitForFunction(
        () =>
          document.body.textContent.includes("Civil ·") &&
          !document.body.textContent.includes("calculating…"),
      );
      for (const width of [1440, 390]) {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await page.waitForTimeout(100);
        const svg = chart(page);
        const m = await measure(svg);
        const audit = await labelAudit(svg);
        await evidence(page, `${name}-${width}`, { ...m, ...audit });
        readable(m);
        assert.deepEqual(
          audit.overlaps,
          [],
          `${name}/${width}: labels do not overlap`,
        );
        if (audit.markerOverlaps.length)
          failures.push(
            `${name}/${width}: point overlaps ${JSON.stringify(audit.markerOverlaps)}`,
          );
        if (
          !audit.protection.every(
            (label) =>
              label.stroke !== "none" &&
              label.width >= 2 &&
              label.width <= 4 &&
              label.paintOrder.startsWith("stroke") &&
              label.abovePaths,
          )
        )
          failures.push(`${name}/${width}: paths can obscure labels`);
      }
    }
    assert.deepEqual(
      failures,
      [],
      "restrained halos above the dynamic paths protect readable glyphs",
    );
  },
);

test(
  "all three captured skies retain every original non-text geometric attribute",
  { timeout: 90_000 },
  async (t) => {
    const captures = JSON.parse(
      await readFile(
        new URL(
          "../../sketches/010-sky-chart-legibility/captures.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const state of captures.states) {
      const page = await open(
        t,
        { width: 1280, height: 800 },
        new URL(state.sourceUrl).search,
      );
      const comparison = await chart(page).evaluate((node, source) => {
        const previous = new DOMParser().parseFromString(
          source,
          "image/svg+xml",
        ).documentElement;
        const geometry = (svg) =>
          [...svg.querySelectorAll("circle, polyline, line, polygon")].map(
            (element) => ({
              tag: element.tagName,
              attributes: Object.fromEntries(
                [...element.attributes]
                  .map((a) => [a.name, a.value])
                  .sort(([a], [b]) => a.localeCompare(b)),
              ),
            }),
          );
        return { actual: geometry(node), expected: geometry(previous) };
      }, state.svg);
      assert.deepEqual(
        comparison.actual,
        comparison.expected,
        `${state.id}: geometry, strokes, colors, points and summit unchanged`,
      );
    }
  },
);

async function png(page, name) {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const image = page.getByAltText("Preview of the Moon Geometry infographic");
  await image.waitFor();
  await image.evaluate((img) => img.decode());
  const pixels = await image.evaluate((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      sky: Array.from(ctx.getImageData(1052, 354, 444, 310).data),
      metadata: Array.from(ctx.getImageData(0, 140, 1600, 100).data),
    };
  });
  assert.deepEqual([pixels.width, pixels.height], [1600, 900]);
  if (artifacts) {
    const bytes = await image.evaluate(async (img) =>
      Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())),
    );
    await writeFile(join(artifacts, name + ".png"), Buffer.from(bytes));
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close share preview", exact: true })
    .click();
  return {
    sky: createHash("sha256").update(Buffer.from(pixels.sky)).digest("hex"),
    metadata: createHash("sha256")
      .update(Buffer.from(pixels.metadata))
      .digest("hex"),
  };
}

test(
  "orientation stays a 360x376 instrument and real PNG sky/metadata stay canonical through headings and resize",
  { timeout: 120_000 },
  async (t) => {
    const page = await open(t);
    const canonical = page.locator("[data-share-sky-chart]");
    const initial = await canonical.evaluate((node) => node.outerHTML);
    assert.equal(
      await page.evaluate(() => window.__skyObserverTargets.size),
      1,
      "only visible chart observes size",
    );
    const before = await png(page, "canonical-north-export");
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
    for (const degrees of [0, 90, 180, 270]) {
      await heading.fill(String(degrees));
      const instrument = chart(page);
      assert.equal(await instrument.getAttribute("viewBox"), "0 0 360 376");
      assert.equal(
        await instrument.locator("[data-orientation-tick]").count(),
        72,
      );
      assert.equal(
        await instrument.locator("[data-orientation-sight]").count(),
        1,
      );
      assert.equal(
        await instrument.locator("[data-orientation-degree-label]").count(),
        4,
      );
      assert.equal(await instrument.locator("[data-moon-summit]").count(), 0);
      const cardinals = await instrument
        .locator("[data-sky-cardinal]")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            label: node.textContent,
            x: +node.getAttribute("x"),
            y: +node.getAttribute("y"),
            transform: node.getAttribute("transform"),
            font: +node.getAttribute("font-size"),
          })),
        );
      for (const cardinal of cardinals) {
        const az =
          (({ N: 0, E: 90, S: 180, W: 270 }[cardinal.label] - degrees) *
            Math.PI) /
          180;
        assert.ok(
          Math.hypot(
            cardinal.x - (180 + 126 * Math.sin(az)),
            cardinal.y - (188 - 126 * Math.cos(az)),
          ) < 1e-8,
        );
        assert.equal(cardinal.transform, null, "upright cardinals");
        assert.equal(cardinal.font, 13);
      }
      assert.equal(await canonical.evaluate((node) => node.outerHTML), initial);
      await evidence(page, `orientation-${degrees}`, { cardinals });
    }
    assert.equal(
      await page.evaluate(() => window.__skyObserverTargets.size),
      0,
      "north-up observer disconnected in orientation",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const after = await png(page, "oriented-phone-canonical-export");
    assert.deepEqual(
      after,
      before,
      "real PNG sky pixels and metadata unchanged by device heading or viewport",
    );
    await page
      .getByRole("button", {
        name: "Finish true-north orientation",
        exact: true,
      })
      .click();
    await page.waitForFunction(() => window.__skyObserverTargets.size === 1);
    readable(await measure(chart(page)));
    assert.equal(await canonical.evaluate((node) => node.outerHTML), initial);
    if (artifacts)
      await writeFile(
        join(artifacts, "export-digests.json"),
        JSON.stringify({ before, after }, null, 2),
      );
  },
);

test(
  "SSR first paint and alternate fallback fonts fit the unchanged phone stage",
  { timeout: 90_000 },
  async (t) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    t.after(() => context.close());
    await context.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/" + north);
    await chart(page).waitFor();
    readable(await measure(chart(page)));
    assert.deepEqual(errors, []);
    const hydrated = await open(t, { width: 390, height: 844 });
    await hydrated.addStyleTag({
      content: "svg text { font-family: Georgia, serif !important; }",
    });
    readable(await measure(chart(hydrated)));
    assert.deepEqual((await labelAudit(chart(hydrated))).overlaps, []);
    await evidence(
      hydrated,
      "phone-serif-fallback",
      await measure(chart(hydrated)),
    );
  },
);
