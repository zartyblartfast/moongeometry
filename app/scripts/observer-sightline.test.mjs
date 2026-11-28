import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { before, after } from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

const artifacts = process.env.MOON_SIGHTLINE_ARTIFACT_DIR;
const oldAuth = process.env.VITE_AUTH_ENABLED;
const oldDatabase = process.env.DATABASE_URL;
let server;
let browser;
let base;

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
      assert.equal(browser?.contexts().length ?? 0, 0, "owned contexts closed");
    } finally {
      try {
        await browser?.close();
      } finally {
        await server?.close();
        assert.equal(browser?.isConnected() ?? false, false);
        assert.equal(server?.httpServer?.listening ?? false, false);
        if (oldAuth === undefined) delete process.env.VITE_AUTH_ENABLED;
        else process.env.VITE_AUTH_ENABLED = oldAuth;
        if (oldDatabase === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = oldDatabase;
      }
    }
  },
  { timeout: 120_000 },
);

async function inspect(page, checkPixels = false) {
  return page.evaluate((pixels) => {
    const { scene, renderer, camera, sight, figure, moon, earth } =
      window.__observerSightTest;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const position = sight.geometry.attributes.position;
    const start = figure.position
      .clone()
      .fromBufferAttribute(position, 0)
      .applyMatrix4(sight.matrixWorld);
    const end = figure.position
      .clone()
      .fromBufferAttribute(position, 1)
      .applyMatrix4(sight.matrixWorld);
    const marker = figure.getWorldPosition(figure.position.clone());
    const target = moon.getWorldPosition(moon.position.clone());
    const project = (v) => {
      const p = v.clone().project(camera);
      return [
        (p.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
        (-p.y * 0.5 + 0.5) * renderer.domElement.clientHeight,
      ];
    };
    const a = project(start),
      b = project(marker),
      c = project(end);
    let pixelChanges = null;
    if (pixels) {
      const gl = renderer.getContext();
      const read = () => {
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
      const withSight = read();
      sight.visible = false;
      let withoutSight;
      try {
        withoutSight = read();
      } finally {
        sight.visible = true;
        renderer.render(scene, camera);
      }
      const length = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const centre = [
        b[0] + ((c[0] - b[0]) * 6) / length,
        b[1] + ((c[1] - b[1]) * 6) / length,
      ];
      const sx = gl.drawingBufferWidth / renderer.domElement.clientWidth;
      const sy = gl.drawingBufferHeight / renderer.domElement.clientHeight;
      pixelChanges = 0;
      for (
        let y = Math.max(0, Math.floor((centre[1] - 2) * sy));
        y <=
        Math.min(gl.drawingBufferHeight - 1, Math.ceil((centre[1] + 2) * sy));
        y++
      ) {
        for (
          let x = Math.max(0, Math.floor((centre[0] - 2) * sx));
          x <=
          Math.min(gl.drawingBufferWidth - 1, Math.ceil((centre[0] + 2) * sx));
          x++
        ) {
          const i =
            ((gl.drawingBufferHeight - 1 - y) * gl.drawingBufferWidth + x) * 4;
          if (
            withSight[i] !== withoutSight[i] ||
            withSight[i + 1] !== withoutSight[i + 1] ||
            withSight[i + 2] !== withoutSight[i + 2]
          )
            pixelChanges++;
        }
      }
    }
    const direction = target.clone().sub(start);
    const t = Math.max(
      0,
      Math.min(1, -start.dot(direction) / direction.lengthSq()),
    );
    return {
      worldGap: start.distanceTo(marker),
      pixelGap: Math.hypot(a[0] - b[0], a[1] - b[1]),
      moonGap: end.distanceTo(target),
      depthTest: sight.material.depthTest,
      cameraRadius: camera.position.length(),
      earthClearance:
        start.clone().addScaledVector(direction, t).length() -
        earth.geometry.parameters.radius,
      pixelChanges,
      glError: renderer.getContext().getError(),
    };
  }, checkPixels);
}

function assertAttached(result, label) {
  assert(
    result.worldGap < 1e-6,
    `${label}: sightline starts at actual location marker (gap ${result.worldGap})`,
  );
  assert(
    result.pixelGap < 0.05,
    `${label}: location/sightline coincide in CSS pixels (gap ${result.pixelGap})`,
  );
  assert(
    result.moonGap < 1e-6,
    `${label}: Moon endpoint remains at Moon centre`,
  );
  assert.equal(
    result.depthTest,
    true,
    `${label}: preserve real scene occlusion`,
  );
  assert.equal(result.glError, 0);
}

test(
  "Moon sightline remains attached to the location marker through camera changes",
  { timeout: 120_000 },
  async (t) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    t.after(() => context.close());
    await context.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    await context.route("https://grok.com/grok-app-builder/**", (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(25_000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/src/components/space-scene.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      assert(source.includes("renderer.render(scene, camera);"));
      await route.fulfill({
        response,
        body: source.replaceAll(
          "renderer.render(scene, camera);",
          "window.__observerSightTest={scene,renderer,camera,sight,figure,moon,earth}; renderer.render(scene,camera);",
        ),
      });
    });
    await page.goto(`${base}/?lat=40.7&lon=-74&date=2026-11-27&time=20:00`);
    await page.waitForFunction(
      () =>
        !!window.__observerSightTest &&
        document.querySelector("input[type=time]")?.value === "20:00" &&
        !!document.querySelector('[title^="IANA zone:"]'),
    );
    const canvas = page.locator(
      'canvas[aria-label="Rotatable Earth with equator, ecliptic, and Moon orbit"]',
    );
    const measurements = [];
    await canvas.scrollIntoViewIfNeeded();
    const initial = await inspect(page, true);
    measurements.push({ label: "initial near-horizon", ...initial });
    assertAttached(initial, "initial near-horizon");
    assert(
      initial.earthClearance > 0,
      "schematic connector to the visible near-horizon Moon is not swallowed by Earth",
    );
    assert(
      initial.pixelChanges > 0,
      "actual sightline pixels exist immediately outside the cream marker",
    );
    for (const preset of ["Three-quarter", "Edge-on", "From the north"]) {
      await page.getByRole("button", { name: preset, exact: true }).click();
      await canvas.scrollIntoViewIfNeeded();
      for (const [zoom, delta] of [
        ["preset", 0],
        ["close", -5000],
        ["far", 5000],
      ]) {
        if (delta) {
          await canvas.hover();
          await page.mouse.wheel(0, delta);
        }
        await page.waitForTimeout(80);
        const result = await inspect(page);
        assertAttached(result, `${preset}/${zoom}`);
        measurements.push({ label: `${preset}/${zoom}`, ...result });
      }
    }
    await page
      .getByRole("button", { name: "Three-quarter", exact: true })
      .click();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 65,
      box.y + box.height / 2 - 25,
      { steps: 8 },
    );
    await page.mouse.up();
    assertAttached(await inspect(page), "free rotation");
    for (const viewport of [
      { width: 340, height: 452 },
      { width: 844, height: 390 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.bringToFront();
      await page.waitForFunction(() => {
        const { camera, renderer } = window.__observerSightTest;
        return (
          Math.abs(
            camera.aspect -
              renderer.domElement.clientWidth /
                renderer.domElement.clientHeight,
          ) < 1e-6
        );
      });
      assertAttached(
        await inspect(page),
        `resized ${viewport.width}x${viewport.height}`,
      );
    }
    assert.deepEqual(errors, []);
    if (artifacts)
      await writeFile(
        join(artifacts, "observer-sightline.json"),
        JSON.stringify(measurements, null, 2),
      );
  },
);
