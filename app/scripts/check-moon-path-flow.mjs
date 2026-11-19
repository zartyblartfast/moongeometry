import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const base = process.argv[2] ?? "http://localhost:8080";
const browser = await chromium.launch();
try {
  for (const [name, options] of [
    ["portrait", devices["Pixel 7"]],
    ["landscape", devices["Pixel 7 landscape"]],
    ["desktop", { viewport: { width: 1280, height: 800 } }],
    ["wide", { viewport: { width: 1440, height: 900 } }],
  ]) {
    const page = await browser.newPage(options);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/?lat=0&lon=0&date=2020-01-01&time=12:00`);
    await page.waitForFunction(
      () => document.querySelector('input[type="date"]').value === "2020-01-01",
    );
    const button = (name) => page.getByRole("button", { name, exact: true });
    const now = button("Use current time");
    assert.equal(await now.count(), 1, "one current time action");
    const loc = button("Use my location");
    const a = await loc.boundingBox(),
      b = await now.boundingBox();
    assert.equal(a.y, b.y);
    const sky = await page
      .getByRole("heading", { name: "Local sky path", exact: true })
      .boundingBox();
    const orbit = await page
      .getByRole("heading", { name: "Orbital geometry", exact: true })
      .boundingBox();
    const mobile = options.viewport.width < 1024;
    const date = page.locator("input[type=date]");
    assert.equal(await date.isVisible(), !mobile);
    if (mobile) {
      assert.ok(a.y < sky.y && sky.y < orbit.y);
      const toggle = button("Change place or time");
      await toggle.click();
      assert.ok(await date.isVisible());
      // At the equator these moments put the Moon on opposite sides of the horizon.
      const outcomes = new Set();
      for (const time of ["00:00", "12:00"]) {
        await page.getByLabel("Mean solar time", { exact: true }).fill(time);
        await page.waitForFunction(
          (t) => new URLSearchParams(location.search).get("time") === t,
          time,
        );
        const result = await page
          .getByText(
            /^The Moon is (below the horizon|[\d.]+° above the horizon, toward [NSEW]+)\.$/,
          )
          .innerText();
        outcomes.add(result.includes("below"));
      }
      assert.equal(outcomes.size, 2);
      await toggle.click();
    } else {
      assert.ok(orbit.x < sky.x && Math.abs(orbit.y - sky.y) < 60);
      assert.ok(
        (
          await page
            .getByRole("img", {
              name: "Tonight’s Moon and Sun paths on the sky",
            })
            .boundingBox()
        ).height > 208,
      );
    }
    await page.evaluate(() =>
      Object.defineProperty(navigator, "geolocation", {
        value: { getCurrentPosition: (_, fail) => fail({ code: 1 }) },
      }),
    );
    await loc.click();
    await page.getByText("Location access was denied.").waitFor();
    await page.getByPlaceholder("Town or place").waitFor();
    assert.equal(await date.inputValue(), "2020-01-01");
    await now.click();
    await page.waitForFunction(
      () =>
        document.querySelector("input[type=date]").value ===
        new Date().toISOString().slice(0, 10),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    if (name === "desktop") {
      await button("Share").click();
      const image = page.getByAltText(
        "Preview of the Moon Geometry infographic",
      );
      await image.waitFor();
      await image.evaluate((img) => img.decode());
      assert.ok(await image.evaluate((img) => img.naturalWidth > 0));
    }
    console.log(
      `PASS ${name}: layout, controls, refusal fallback, current time, overflow`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
