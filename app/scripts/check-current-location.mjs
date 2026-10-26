import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

// Deterministic browser fixtures: no physical location or live search is used.
const baseUrl = process.argv[2] ?? "http://localhost:8080";
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, options] of [
    ["pixel-portrait", devices["Pixel 7"]],
    ["pixel-landscape", devices["Pixel 7 landscape"]],
    ["desktop-1280", { viewport: { width: 1280, height: 800 } }],
    ["desktop-1440", { viewport: { width: 1440, height: 900 } }],
  ]) {
    const context = await browser.newContext({
      ...options,
      permissions: ["geolocation"],
      geolocation: { latitude: 51.507123, longitude: -0.128456 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://nominatim.openstreetmap.org/search?**", (route) =>
      route.fulfill({
        json: [
          { display_name: "Test place, Test region", lat: "40", lon: "-74" },
        ],
      }),
    );
    await page.goto(`${baseUrl}/?lat=0&lon=0&date=2026-10-26&time=12%3A00`);
    await page.waitForFunction(
      () => document.querySelector('input[type="range"]')?.value === "720",
    );
    const button = page.getByRole("button", {
      name: "Use my location",
      exact: true,
    });
    const form = button.locator("xpath=ancestor::form");
    const status = form.getByRole("status");
    await button.click();
    await page.waitForFunction(() =>
      document.body.textContent.includes(
        "Using your location · 51.507° N, 0.128° W",
      ),
    );
    assert.equal(
      await status.textContent(),
      "Using your location · 51.507° N, 0.128° W",
    );
    assert.equal(
      await form.locator('input[type="search"]').inputValue(),
      "Current location",
    );
    await status.scrollIntoViewIfNeeded();
    const bounds = await status.boundingBox();
    assert.ok(
      bounds &&
        bounds.x >= 0 &&
        bounds.x + bounds.width <= options.viewport.width,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (process.env.SCREENSHOT_DIR) {
      await form.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/location-${name}.png`,
      });
    }
    // Both manual sliders must stop claiming the selected point is device-derived.
    for (const index of [1, 2]) {
      await page.locator('input[type="range"]').nth(index).focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await status.textContent(), "");
      await button.click();
      await page.waitForFunction(() =>
        document.body.textContent.includes(
          "Using your location · 51.507° N, 0.128° W",
        ),
      );
    }
    await context.setGeolocation({
      latitude: -33.868812,
      longitude: 151.209345,
    });
    // New document for the changed fixture; wait for client time-zone resolution
    // so the SSR-visible button has hydrated before clicking it.
    await page.reload();
    await page.waitForFunction(
      () => !document.body.textContent.includes("Civil · calculating…"),
    );
    await button.click();
    await page.waitForFunction(() =>
      document.body.textContent.includes(
        "Using your location · 33.869° S, 151.209° E",
      ),
    );
    assert.equal(
      await status.textContent(),
      "Using your location · 33.869° S, 151.209° E",
    );
    await form.locator('input[type="search"]').fill("Test place");
    await form.getByRole("button", { name: "Search", exact: true }).click();
    await form
      .getByRole("button", { name: "Test place, Test region", exact: true })
      .click();
    assert.equal(await status.textContent(), "");
    await button.click();
    await page.waitForFunction(() =>
      document.body.textContent.includes(
        "Using your location · 33.869° S, 151.209° E",
      ),
    );
    await page.reload();
    await button.waitFor();
    assert.equal(
      await status.textContent(),
      "",
      "Reload must not restore a device-location claim",
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${name}: coordinates visible; hemispheres correct; manual/search/reload clear confirmation; no overflow`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
