import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

// Run against Vite: the response-only hook exposes the real scene to this test,
// without adding globals or diagnostic UI to production code.
const baseUrl = process.argv[2] ?? "http://localhost:8080";
const output = process.argv[3];
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, options] of [
    [
      "desktop-1280",
      { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    ],
    [
      "desktop-1440-hidpi",
      { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    ],
    ["pixel-portrait", devices["Pixel 7"]],
    ["pixel-landscape", devices["Pixel 7 landscape"]],
    [
      "desktop-no-msaa",
      { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    ],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    if (name === "desktop-no-msaa") {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, attributes) {
          return original.call(
            this,
            kind,
            kind === "webgl2" || kind === "webgl"
              ? { ...attributes, antialias: false }
              : attributes,
          );
        };
      });
    }
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/src/components/space-scene.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      assert.ok(source.includes("renderer.render(scene, camera);"));
      await route.fulfill({
        response,
        body: source.replaceAll(
          "renderer.render(scene, camera);",
          "window.__orbitalTest = {scene,renderer,camera}; renderer.render(scene,camera);",
        ),
      });
    });
    await page.goto(`${baseUrl}/?lat=51.5&lon=0&date=2026-10-26&time=12%3A00`);
    await page.waitForFunction(
      () =>
        window.__orbitalTest?.scene.children.filter((o) => o.isLine2).length ===
        3,
    );
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => {
        const { scene, renderer } = window.__orbitalTest;
        const gl = renderer.getContext();
        return scene.children
          .filter((o) => o.isLine2)
          .every(
            (line) =>
              line.material.alphaToCoverage === gl.getParameter(gl.SAMPLES) > 1,
          );
      }),
      true,
    );
    const canvas = page.locator(
      'canvas[aria-label="Rotatable Earth with equator, ecliptic, and Moon orbit"]',
    );
    for (const [button, label] of [
      ["Three-quarter", "oblique"],
      ["From the north", "north"],
      ["Edge-on", "edge"],
    ]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      const result = await page.evaluate(() => {
        const { scene, renderer, camera } = window.__orbitalTest;
        const gl = renderer.getContext();
        const lines = scene.children.filter((o) => o.isLine2);
        const pixels = () => {
          renderer.render(scene, camera);
          const data = new Uint8Array(
            gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
          );
          gl.readPixels(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data,
          );
          return data;
        };
        const withAll = pixels();
        const changes = lines.map((line) => {
          line.visible = false;
          const without = pixels();
          line.visible = true;
          let count = 0;
          for (let i = 0; i < withAll.length; i += 4) {
            if (
              withAll[i] !== without[i] ||
              withAll[i + 1] !== without[i + 1] ||
              withAll[i + 2] !== without[i + 2]
            )
              count++;
          }
          return count;
        });
        renderer.render(scene, camera);
        return {
          changes,
          widths: lines.map((l) => l.material.linewidth),
          resolutions: lines.map((l) => l.material.resolution.toArray()),
          size: [
            renderer.domElement.clientWidth,
            renderer.domElement.clientHeight,
          ],
          glError: gl.getError(),
        };
      });
      assert.deepEqual(result.widths, [1.25, 1.25, 1.25]);
      assert.ok(
        result.changes.every((count) => count > 30),
        `${name}/${label}: each line must actually render, including reflected quads`,
      );
      for (const resolution of result.resolutions)
        assert.deepEqual(resolution, result.size);
      assert.equal(result.glError, 0);
      if (output)
        await canvas.screenshot({ path: `${output}/${name}-${label}.png` });
    }
    // Resizing must update the addon resolution without multiplying CSS width by DPR.
    await page.setViewportSize({
      width: options.viewport.width - 40,
      height: options.viewport.height - 20,
    });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => {
        const { scene, renderer } = window.__orbitalTest;
        return scene.children
          .filter((o) => o.isLine2)
          .every(
            (line) =>
              line.material.resolution.x === renderer.domElement.clientWidth &&
              line.material.resolution.y === renderer.domElement.clientHeight,
          );
      }),
      true,
    );
    await page.setViewportSize(options.viewport);
    await page
      .getByRole("button", { name: "Three-quarter", exact: true })
      .click();
    await canvas.hover();
    for (const [delta, label] of [
      [-5000, "near"],
      [5000, "far"],
    ]) {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() =>
          window.__orbitalTest.renderer.getContext().getError(),
        ),
        0,
      );
      if (output)
        await canvas.screenshot({ path: `${output}/${name}-${label}.png` });
    }
    // Free rotation and both animation modes remain live.
    await page
      .getByRole("button", { name: "Three-quarter", exact: true })
      .click();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 40,
      box.y + box.height / 2 + 15,
      { steps: 6 },
    );
    await page.mouse.up();
    for (const label of ["Slide the Moon", "Spin Earth"]) {
      const before = await page.evaluate(
        () => window.__orbitalTest.renderer.info.render.frame,
      );
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: label, exact: true }).click();
      assert.ok(
        (await page.evaluate(
          () => window.__orbitalTest.renderer.info.render.frame,
        )) >
          before + 3,
      );
    }
    // Date-dependent line replacement and component cleanup release the new GPU resources.
    await page.evaluate(() => {
      window.__oldLoopDisposals = 0;
      window.__orbitalTest.scene.children
        .filter((o) => o.isLine2)
        .forEach((l) =>
          l.geometry.addEventListener(
            "dispose",
            () => window.__oldLoopDisposals++,
          ),
        );
    });
    await page.locator('input[type="date"]').fill("2027-01-15");
    await page.waitForFunction(() => window.__oldLoopDisposals === 3);
    if (name === "desktop-1280" && output) {
      await page
        .getByRole("button", { name: "Three-quarter", exact: true })
        .click();
      await page.getByRole("button", { name: "Share", exact: true }).click();
      const downloadReady = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download PNG", exact: true })
        .click();
      const download = await downloadReady;
      await download.saveAs(`${output}/orbital-line-export.png`);
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => {
      window.__lineCleanup = { geometry: 0, material: 0 };
      window.__orbitalTest.scene.children
        .filter((o) => o.isLine2)
        .forEach((l) => {
          l.geometry.addEventListener(
            "dispose",
            () => window.__lineCleanup.geometry++,
          );
          l.material.addEventListener(
            "dispose",
            () => window.__lineCleanup.material++,
          );
        });
    });
    // Client route transition lets us inspect cleanup before a document reload.
    await page.evaluate(async () => {
      const { useMoon } = await import("/src/lib/store.ts");
      useMoon.getState().setPlaying("none");
      const link = document.querySelector('a[href="/guide/"]');
      // The app's guide anchor uses full navigation; use the router history to unmount in-place.
      history.pushState({}, "", link.getAttribute("href"));
    });
    await page.waitForFunction(
      () =>
        window.__lineCleanup.geometry === 3 &&
        window.__lineCleanup.material === 3,
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${name}: all primary curves render; presets/resize/zoom/animation/update/cleanup verified`,
    );
    await context.close();
  }
  // Force WebGL failure and verify the existing SVG fallback still appears.
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (
        kind === "webgl" ||
        kind === "webgl2" ||
        kind === "experimental-webgl"
      )
        return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto(`${baseUrl}/?lat=51.5&lon=0&date=2026-10-26&time=12%3A00`);
  await page.waitForTimeout(1000);
  assert.equal(
    await page
      .locator(
        'canvas[aria-label="Rotatable Earth with equator, ecliptic, and Moon orbit"]',
      )
      .count(),
    0,
  );
  assert.deepEqual(
    await page
      .locator("[data-share-orbit-scene] > svg > path")
      .evaluateAll((paths) =>
        paths.slice(0, 3).map((path) => path.getAttribute("stroke-width")),
      ),
    ["2.6", "2.6", "2.4"],
  );
  if (output)
    await page.screenshot({ path: `${output}/fallback.png`, fullPage: true });
  console.log("PASS forced WebGL-unavailable fallback");
  await page.close();
} finally {
  await browser.close();
}
