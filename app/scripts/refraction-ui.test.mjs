import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { chromium, devices } from "playwright";
import { PNG } from "pngjs";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

// Saved provider fixture: the centre is geometrically hidden but apparently
// above the horizon. Expected values are not computed by the UI under test.
const fixture = {
  query: "?lat=51.5&lon=0&date=2026-11-19&time=00:39",
  apparent: "0.3°",
  geometric: "−0.3°",
  refraction: "+31.3′",
  top: "33.1°",
  point: { x: 43.61, y: 185.18 },
  azimuthDeg: 261.60571872289836,
  apparentAltitudeDeg: 0.2628903746705359,
};
const artifacts = process.env.MOON_REFRACTION_ARTIFACT_DIR;
const previousAuthFlag = process.env.VITE_AUTH_ENABLED;
const previousDatabaseUrl = process.env.DATABASE_URL;
let server;
let browser;
let base;

before(
  async () => {
    // This isolated test worker serves a local fixture, not a signed-in account.
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
    try {
      const remainingContexts = browser?.contexts().length ?? 0;
      await browser?.close();
      assert.equal(
        remainingContexts,
        0,
        "all owned browser contexts are closed",
      );
      assert.equal(
        browser?.isConnected() ?? false,
        false,
        "owned browser is closed",
      );
    } finally {
      try {
        await server?.close();
        if (server?.httpServer) {
          assert.equal(
            server.httpServer.listening,
            false,
            "owned fixture server is closed",
          );
        }
      } finally {
        if (previousAuthFlag === undefined)
          delete process.env.VITE_AUTH_ENABLED;
        else process.env.VITE_AUTH_ENABLED = previousAuthFlag;
        if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  },
  // Chromium can take more than 30 seconds to exit on a loaded Windows host
  // even with zero remaining contexts. Keep cleanup bounded, not skipped.
  { timeout: 120_000 },
);

async function open(t, { device, mutation } = {}) {
  const context = await browser.newContext(
    device ?? { viewport: { width: 1280, height: 800 } },
  );
  t.after(() => context.close());
  // Fonts and platform extensions are not inputs to the astronomy regression.
  // Keep this test offline/deterministic; use real local app/ephemeris modules.
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await context.route("https://grok.com/grok-app-builder/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  t.after(() => assert.deepEqual(errors, [], "no browser/hydration errors"));

  let injected = false;
  let injectionError;
  if (mutation) {
    // Fault injection changes only a served response in this fresh context.
    // Neither the repository nor another browser context is modified.
    await page.route(`**/src/components/${mutation.file}*`, async (route) => {
      try {
        const response = await route.fetch();
        const source = await response.text();
        const altered = source.replace(mutation.pattern, mutation.replacement);
        assert.notEqual(
          altered,
          source,
          `mutation seam exists: ${mutation.name}`,
        );
        injected = true;
        await route.fulfill({ response, body: altered });
      } catch (error) {
        injectionError = error;
        await route.abort();
      }
    });
  }
  try {
    await page.goto(base + "/" + fixture.query);
    await page.waitForFunction(
      () =>
        document.querySelector('input[type="date"]')?.value === "2026-11-19" &&
        document.querySelector('input[type="time"]')?.value === "00:39",
    );
    if (device && device.viewport.width < 1024)
      await page
        .getByRole("button", { name: "Change place or time", exact: true })
        .click();
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Civil ·") &&
        !document.body.innerText.includes("calculating…"),
    );
  } catch (error) {
    throw injectionError ?? error;
  }
  if (mutation) {
    if (injectionError) throw injectionError;
    assert.ok(injected, `mutation served: ${mutation.name}`);
  }
  return page;
}

async function value(root, label) {
  return root
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::div[dd][1]/dd")
    .innerText();
}

async function assertMain(page) {
  const stats = page.locator("dl").first();
  assert.equal(
    await value(stats, "Apparent altitude"),
    fixture.apparent,
    "main apparent altitude",
  );
  const altitudeTerm = stats
    .locator("dt")
    .filter({ hasText: "Apparent altitude" });
  assert.equal(
    await altitudeTerm
      .getByText("Standard atmosphere", { exact: true })
      .count(),
    1,
    "main altitude identifies its standard-atmosphere model",
  );
  assert.equal(
    await value(stats, "Top of path"),
    fixture.top,
    "apparent top of path",
  );
  assert.match(await value(stats, "Rise"), /^13:34/, "apparent-centre rise");
  assert.match(await value(stats, "Set"), /^00:41/, "apparent-centre set");
  const riseSetNote = "Rise/set · Moon centre, standard refraction";
  assert.equal(
    await stats.getByText(riseSetNote, { exact: true }).count(),
    0,
    "rise/set note is not an invalid direct child of the description list",
  );
  assert.equal(
    await stats
      .locator("xpath=following-sibling::*[1]")
      .getByText(riseSetNote, { exact: true })
      .count(),
    1,
    "rise/set convention remains immediately beside the values",
  );
}

async function calculation(page) {
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Explain this moment" });
  assert.equal(
    await value(dialog, "Apparent altitude"),
    fixture.apparent,
    "Explain summary apparent altitude",
  );
  await dialog
    .getByRole("button", { name: "How was this calculated?", exact: true })
    .click();
  return dialog;
}

async function assertExplanation(page) {
  const dialog = await calculation(page);
  assert.equal(
    await value(dialog, "Geometric altitude"),
    fixture.geometric,
    "Explain geometric altitude",
  );
  assert.equal(
    await value(dialog, "Atmospheric refraction"),
    fixture.refraction,
    "Explain refraction lift",
  );
  assert.equal(
    await value(dialog, "Apparent altitude"),
    fixture.apparent,
    "Explain calculation apparent altitude",
  );
  return dialog;
}

async function assertSky(page) {
  const chart = page.getByRole("img", {
    name: "Tonight’s Moon and Sun paths on the sky",
    exact: true,
  });
  const point = await chart.locator("[data-moon-point]").evaluate((node) => ({
    x: +node.getAttribute("cx"),
    y: +node.getAttribute("cy"),
  }));
  assert.deepEqual(point, fixture.point, "apparent Moon SVG point");
  const paths = await chart.locator("[data-moon-path]").evaluateAll((nodes) =>
    nodes.flatMap((node) =>
      node
        .getAttribute("points")
        .split(" ")
        .map((pair) => pair.split(",").map(Number)),
    ),
  );
  const distance = Math.min(
    ...paths.map(([x, y]) => Math.hypot(x - point.x, y - point.y)),
  );
  assert.ok(
    distance < 0.09,
    "rendered apparent Moon point remains on its rendered path",
  );
}

async function assertOrientation(page) {
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
  await heading.fill("90");
  const point = await page
    .locator('[data-orientation-active="true"] [data-moon-point]')
    .evaluate((node) => ({
      x: +node.getAttribute("cx"),
      y: +node.getAttribute("cy"),
    }));
  const r = ((90 - fixture.apparentAltitudeDeg) / 90) * 118;
  const az = ((fixture.azimuthDeg - 90) * Math.PI) / 180;
  assert.ok(
    Math.hypot(
      point.x - (180 + r * Math.sin(az)),
      point.y - (188 - r * Math.cos(az)),
    ) < 0.008,
    "orientation projects apparent altitude",
  );
  const canonical = await page
    .locator("[data-share-sky-chart] [data-moon-point]")
    .evaluate((node) => ({
      x: +node.getAttribute("cx"),
      y: +node.getAttribute("cy"),
    }));
  assert.deepEqual(
    canonical,
    fixture.point,
    "share chart remains canonical north-up",
  );
  await heading.fill("262");
  const status = await page.locator("[data-orientation-status]").innerText();
  assert.match(
    status,
    /Aligned with Moon azimuth/,
    "orientation apparent-horizon visibility",
  );
  assert.doesNotMatch(status, /below the horizon/);
}

async function assertExport(page, name = "refraction-share") {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const image = page.getByAltText("Preview of the Moon Geometry infographic");
  await image.waitFor();
  await image.evaluate((img) => img.decode());
  // Compare pixels of the decoded, real exported PNG, not its thumbnail or a
  // mocked formatter. The reference text uses the same controlled browser font.
  const comparison = await image.evaluate((img) => {
    const actual = document.createElement("canvas");
    actual.width = 1600;
    actual.height = 900;
    const a = actual.getContext("2d");
    a.drawImage(img, 0, 0);
    const expected = document.createElement("canvas");
    expected.width = 1600;
    expected.height = 900;
    const e = expected.getContext("2d");
    e.fillStyle = "#151c2c";
    e.fillRect(0, 0, 1600, 900);
    e.fillStyle = "#e7e1d6";
    e.font = "600 20px Outfit, Segoe UI, sans-serif";
    e.fillText("0.3°", 1042, 715);
    const av = a.getImageData(1040, 696, 210, 28).data;
    const ev = e.getImageData(1040, 696, 210, 28).data;
    let differences = 0;
    let ink = 0;
    for (let i = 0; i < av.length; i++) if (av[i] !== ev[i]) differences++;
    for (let i = 0; i < ev.length; i += 4)
      if (ev[i] !== 21 || ev[i + 1] !== 28 || ev[i + 2] !== 44) ink++;
    return {
      differences,
      ink,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  });
  assert.equal(comparison.width, 1600);
  assert.equal(comparison.height, 900);
  assert.ok(comparison.ink > 20, "reference includes actual altitude glyphs");
  assert.equal(
    comparison.differences,
    0,
    "PNG paints apparent altitude, not geometric/below-horizon output",
  );
  const bytes = await image.evaluate(async (img) =>
    Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())),
  );
  const buffer = Buffer.from(bytes);
  const png = PNG.sync.read(buffer);
  assert.equal(png.width, 1600);
  assert.equal(png.height, 900);
  const scale = 310 / 672;
  const x = Math.round(
    1052 + (444 - 640 * scale) / 2 + fixture.point.x * 2 * scale,
  );
  const y = Math.round(354 + fixture.point.y * 2 * scale);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const offset = ((y + dy) * png.width + x + dx) * 4;
      assert.deepEqual(
        [...png.data.subarray(offset, offset + 4)],
        [213, 221, 230, 255],
        "PNG Moon marker is at the canonical apparent position",
      );
    }
  if (artifacts) await writeFile(join(artifacts, name + ".png"), buffer);
}

test(
  "rendered near-horizon stats, Explain and SVG use apparent altitude",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t);
    await assertMain(page);
    await assertSky(page);
    const dialog = await assertExplanation(page);
    if (artifacts)
      await page.screenshot({
        path: join(artifacts, "refraction-explain.png"),
      });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
  },
);

test(
  "Explain labels its geometric formula and approximates rounded same-unit arithmetic",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t, {
      device: { viewport: { width: 1440, height: 900 } },
    });
    const dialog = await calculation(page);
    const formula = dialog.locator(".font-mono");
    const text = await formula.innerText();
    assert.match(
      text,
      /h geometric = asin\(/,
      "spherical formula is explicitly geometric",
    );
    assert.match(text, /h apparent = h geometric \+ R\(h geometric\)/);
    assert.match(
      text,
      /h apparent ≈ −0\.259° \+ 0\.522° ≈ 0\.263°/,
      "rounded operands are approximate and use the same unit",
    );
    assert.match(await dialog.innerText(), /Worked values are rounded/);
    assert.match(await dialog.innerText(), /60′ = 1°/);
    if (artifacts) {
      await formula.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(artifacts, "refraction-worked-calculation.png"),
      });
    }
  },
);

test(
  "orientation uses apparent visibility while a real PNG remains north-up",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t);
    await assertOrientation(page);
    await assertExport(page);
  },
);

test(
  "Pixel near-horizon visibility agrees with the rendered apparent chart",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t, { device: devices["Pixel 7"] });
    assert.match(
      await page.locator("body").innerText(),
      /The Moon is 0\.3° above the horizon/,
    );
    await assertSky(page);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (artifacts)
      await page.screenshot({
        path: join(artifacts, "refraction-pixel.png"),
        fullPage: true,
      });
    const dialog = await calculation(page);
    const formula = dialog.locator(".font-mono");
    assert.match(
      await formula.innerText(),
      /h apparent ≈ −0\.259° \+ 0\.522° ≈ 0\.263°/,
    );
    assert.equal(
      await dialog
        .locator(".overflow-y-auto")
        .evaluate((element) => element.scrollWidth > element.clientWidth),
      false,
      "mobile calculation has no horizontal overflow",
    );
    if (artifacts) {
      await formula.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(artifacts, "refraction-pixel-calculation.png"),
      });
    }
  },
);

test(
  "real time controls move the Moon below the apparent horizon",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t);
    await page.getByLabel("Mean solar time", { exact: true }).fill("00:49");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "00:49",
    );
    assert.equal(
      await value(page.locator("dl").first(), "Apparent altitude"),
      "Below horizon",
    );
    const chart = page.getByRole("img", {
      name: "Tonight’s Moon and Sun paths on the sky",
      exact: true,
    });
    assert.equal(await chart.locator("[data-moon-point]").count(), 0);
    await page.getByRole("button", { name: "Explain", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Explain this moment" });
    assert.equal(await value(dialog, "Apparent altitude"), "Below horizon");
    await dialog
      .getByRole("button", { name: "How was this calculated?", exact: true })
      .click();
    assert.equal(await value(dialog, "Geometric altitude"), "−1.7°");
    assert.equal(await value(dialog, "Apparent altitude"), "−1.1°");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Preview the orientation instrument",
        exact: true,
      })
      .click();
    assert.match(
      await page.locator("[data-orientation-status]").innerText(),
      /Moon is below the horizon/,
    );
  },
);

// The sky-dot fault applies only below the geometric horizon. The initial
// server-rendered seed stays unchanged, so rejection must come from the real
// fixture's SVG assertion rather than an intentionally induced hydration error.
const mutations = [
  {
    name: "main altitude",
    file: "moon-app.tsx",
    pattern: /const altDeg = sky\.moon\.horizontal\.apparentAltitudeDeg;/,
    replacement: "const altDeg = sky.moon.horizontal.altitudeDeg;",
    check: assertMain,
    message: /main apparent altitude/,
  },
  {
    name: "Explain prop",
    file: "moon-app.tsx",
    pattern: /altitudeDeg: altDeg,(\s*geometricAltitudeDeg: geometricAltDeg)/,
    replacement: "altitudeDeg: geometricAltDeg,$1",
    check: assertExplanation,
    message: /Explain summary apparent altitude/,
  },
  {
    name: "sky dot",
    file: "sky-chart.tsx",
    pattern: /const moonAlt = snapshot\.moon\.horizontal\.apparentAltitudeDeg;/,
    replacement:
      "const moonAlt = snapshot.moon.horizontal.altitudeDeg < 0 ? snapshot.moon.horizontal.altitudeDeg : snapshot.moon.horizontal.apparentAltitudeDeg;",
    check: assertSky,
    message: /apparent Moon SVG point/,
  },
  {
    name: "orientation visibility",
    file: "orientation-control.tsx",
    pattern:
      /const moonAltitudeDeg = snapshot\.moon\.horizontal\.apparentAltitudeDeg;/,
    replacement:
      "const moonAltitudeDeg = snapshot.moon.horizontal.altitudeDeg;",
    check: assertOrientation,
    message: /orientation apparent-horizon visibility/,
  },
  {
    name: "export altitude",
    file: "moon-app.tsx",
    pattern: /(createShareInfographic\(\{[\s\S]*?\baltitudeDeg: )altDeg\b/,
    replacement: "$1geometricAltDeg",
    check: assertExport,
    message: /PNG paints apparent altitude/,
  },
];
for (const mutation of mutations) {
  test(
    `regression guard rejects geometric wiring in ${mutation.name}`,
    { timeout: 60_000 },
    async (t) => {
      const page = await open(t, { mutation });
      await assert.rejects(
        () => mutation.check(page),
        (error) =>
          error.code === "ERR_ASSERTION" &&
          mutation.message.test(error.message),
        `behavioral check catches ${mutation.name}, not a module/hydration failure`,
      );
    },
  );
}
