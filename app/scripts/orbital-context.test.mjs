import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

const query = "?lat=51.5&lon=0&date=2026-11-28&time=18:11";
const noteText = "Moon below your horizon — Earth blocks the sightline.";
const simulatedText =
  "Simulated Moon below your horizon — Earth blocks the sightline.";
const artifacts = process.env.MOON_ORBIT_CONTEXT_ARTIFACT_DIR;
const previous = {
  auth: process.env.VITE_AUTH_ENABLED,
  db: process.env.DATABASE_URL,
};
let server, browser, base;
const evidence = { viewports: [], cleanup: {} };
before(
  async () => {
    process.env.VITE_AUTH_ENABLED = "false";
    delete process.env.DATABASE_URL;
    server = await createServer({
      root: projectRoot(),
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
  viewport = { width: 1440, height: 900 },
  boundaryAltitude,
) {
  const context = await browser.newContext({ viewport });
  const errors = [];
  t.after(async () => {
    try {
      assert.deepEqual(errors, [], "no browser/hydration errors");
    } finally {
      await context.close();
    }
  });
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await context.route("https://grok.com/grok-app-builder/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  if (boundaryAltitude !== undefined) {
    // Response-only branch fixture, not an astronomical prediction or shipped hook.
    await page.route("**/src/components/moon-app.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const seam = "const altDeg = sky.moon.horizontal.apparentAltitudeDeg;";
      assert(source.includes(seam));
      await route.fulfill({
        response,
        body: source.replace(
          seam,
          `const altDeg = mounted ? ${boundaryAltitude} : sky.moon.horizontal.apparentAltitudeDeg;`,
        ),
      });
    });
  }
  await page.goto(base + "/" + query);
  await page.waitForFunction(
    () =>
      document.querySelector("input[type=time]")?.value === "18:11" &&
      !!document.querySelector('[title^="IANA zone:"]'),
  );
  return page;
}
const orbital = (page) => page.locator(".orbital-panel");
const note = (page) =>
  orbital(page)
    .locator("p")
    .filter({
      hasText: /Moon below your horizon — Earth blocks the sightline\./,
    });
const canvas = (page) => orbital(page).locator("canvas");

test(
  "below-horizon context sits outside the orbital canvas without shrinking diagrams",
  { timeout: 90_000 },
  async (t) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 340, height: 452 },
    ]) {
      const page = await open(t, viewport);
      assert.equal(
        await note(page).count(),
        1,
        "orbital diagram has one contextual explanation",
      );
      assert.equal(await note(page).innerText(), noteText);
      await note(page).scrollIntoViewIfNeeded();
      const geometry = await page.evaluate(() => {
        const section = document.querySelector(".orbital-panel");
        const p = [...section.querySelectorAll("p")].find((e) =>
          e.textContent.includes("Earth blocks the sightline."),
        );
        const scene = section.querySelector("canvas").getBoundingClientRect();
        const r = p.getBoundingClientRect();
        const sky = document
          .querySelector(
            "svg:not([data-share-sky-chart]):has([data-sky-horizon])",
          )
          .getBoundingClientRect();
        return {
          canvasHeight: scene.height,
          skyHeight: sky.height,
          outsideCanvas: r.top >= scene.bottom,
          fits: r.left >= 0 && r.right <= innerWidth,
          invalidContainer: !!p.closest("dl,svg,canvas"),
          live: !!p.closest('[aria-live],[role="alert"],[role="status"]'),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(geometry.canvasHeight, viewport.width >= 1024 ? 388 : 320);
      assert.equal(geometry.skyHeight, viewport.width >= 1024 ? 256 : 208);
      assert(geometry.outsideCanvas && geometry.fits);
      assert.equal(geometry.invalidContainer, false);
      assert.equal(
        geometry.live,
        false,
        "animation must not repeatedly announce the note",
      );
      assert.equal(geometry.overflow, false);
      evidence.viewports.push({ viewport, ...geometry });
      if (artifacts)
        await orbital(page).screenshot({
          path: join(artifacts, `orbital-${viewport.width}.png`),
        });
    }
  },
);

test(
  "native time edits remove and restore context without remounting the orbital canvas",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t);
    assert.equal(await note(page).count(), 1);
    const original = await canvas(page).elementHandle();
    const time = page.getByLabel("Mean solar time", { exact: true });
    await time.fill("06:00");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "06:00",
    );
    const altitude = page
      .locator(".local-sky-panel dt")
      .filter({ hasText: /^Apparent altitude/ })
      .locator("+ dd");
    assert(
      Number.parseFloat(await altitude.innerText()) >= 0,
      "real above-horizon fixture",
    );
    assert.equal(await note(page).count(), 0);
    assert(
      await original.evaluate(
        (e) =>
          e.isConnected &&
          e === document.querySelector(".orbital-panel canvas"),
      ),
    );
    await time.fill("18:11");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "18:11",
    );
    assert.equal(await note(page).innerText(), noteText);
    assert(await original.evaluate((e) => e.isConnected));
  },
);

test(
  "zero and positive apparent altitude do not claim Earth blocks a below-horizon Moon",
  { timeout: 60_000 },
  async (t) => {
    for (const altitude of [0, 0.2]) {
      const page = await open(t, undefined, altitude);
      assert.equal(await note(page).count(), 0);
    }
  },
);

test(
  "active and paused independent-orbit context explicitly identifies the simulated Moon",
  { timeout: 60_000 },
  async (t) => {
    const page = await open(t);
    assert.equal(await note(page).innerText(), noteText);
    const slide = page.getByRole("button", {
      name: "Slide the Moon",
      exact: true,
    });
    const declination = page
      .locator(".local-sky-panel dt")
      .filter({ hasText: /^Declination$/ })
      .locator("+ dd");
    const before = await declination.innerText();
    await slide.click();
    await page
      .locator(".local-sky-panel")
      .getByText("Simulated sky.", { exact: true })
      .waitFor();
    assert.equal(await note(page).innerText(), simulatedText);
    await page.waitForFunction(
      (before) =>
        [...document.querySelectorAll(".local-sky-panel dt")].find(
          (e) => e.textContent === "Declination",
        )?.nextElementSibling?.textContent !== before,
      before,
    );
    await slide.click();
    assert.equal(await slide.getAttribute("aria-pressed"), "false");
    assert.equal(await note(page).innerText(), simulatedText);
  },
);
