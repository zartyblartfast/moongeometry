import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

// Run against a running app: npm run test:sliders -- http://localhost:8080
const baseUrl = process.argv[2] ?? "http://localhost:8080";
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const landscape of [false, true]) {
    const device = devices[landscape ? "Pixel 7 landscape" : "Pixel 7"];
    const context = await browser.newContext(device);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `${baseUrl}/?lat=51.5&lon=0.0&date=2026-10-26&time=12%3A00`,
    );
    const ranges = page.locator('input[type="range"]');
    await ranges.first().waitFor();
    await page.waitForFunction(
      () => document.querySelector('input[type="range"]')?.value === "720",
    );
    await page.waitForTimeout(1000);
    assert.equal(await ranges.count(), 4);
    const historyLength = await page.evaluate(() => history.length);
    await page.evaluate(() => {
      window.__sliderScrollCalls = [];
      const original = window.scrollTo.bind(window);
      window.scrollTo = (...args) => {
        window.__sliderScrollCalls.push(args);
        return original(...args);
      };
    });
    const cdp = await context.newCDPSession(page);
    for (let index = 0; index < 4; index += 1) {
      const slider = ranges.nth(index);
      await slider.evaluate((element) =>
        element.scrollIntoView({ block: "center" }),
      );
      await page.waitForTimeout(250);
      const before = await slider.evaluate((element) => ({
        value: element.value,
        top: element.getBoundingClientRect().top,
        url: location.href,
      }));
      const box = await slider.boundingBox();
      assert.ok(box);
      const limits = await slider.evaluate((element) => ({
        min: +element.min,
        max: +element.max,
      }));
      const fraction = (+before.value - limits.min) / (limits.max - limits.min);
      const startX = box.x + 8 + fraction * (box.width - 16);
      const y = box.y + box.height / 2;
      const endX = box.x + box.width * (fraction > 0.65 ? 0.25 : 0.8);
      await page.evaluate(() => {
        window.__sliderScrollCalls = [];
      });
      const positions = [];
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y }],
      });
      for (let step = 1; step <= 12; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: startX + ((endX - startX) * step) / 12, y }],
        });
        await page.waitForTimeout(35);
        positions.push(
          await slider.evaluate(
            (element) => element.getBoundingClientRect().top,
          ),
        );
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(400);
      const after = await slider.evaluate((element) => ({
        value: element.value,
        top: element.getBoundingClientRect().top,
        url: location.href,
        historyLength: history.length,
        scrollCalls: window.__sliderScrollCalls,
      }));
      const label = `${landscape ? "landscape" : "portrait"} slider ${index + 1}`;
      try {
        assert.notEqual(
          after.value,
          before.value,
          `${label}: touch drag must change value`,
        );
        assert.equal(
          after.scrollCalls.length,
          0,
          `${label}: must not reset or repair scroll`,
        );
        assert.ok(
          [...positions, after.top].every(
            (top) => Math.abs(top - before.top) <= 2,
          ),
          `${label}: control must stay under finger`,
        );
        assert.equal(
          after.historyLength,
          historyLength,
          `${label}: must replace, not push history`,
        );
        if (index < 3)
          assert.notEqual(after.url, before.url, `${label}: URL must update`);
        else
          assert.equal(
            after.url,
            before.url,
            `${label}: speed must not affect URL`,
          );
        console.log(
          `PASS ${label}: ${before.value} -> ${after.value}; viewport stable; history unchanged`,
        );
      } catch (error) {
        failures.push(error.message);
        console.error(
          `FAIL ${label}`,
          JSON.stringify({ before, after, positions }),
        );
      }
      await slider.focus();
      const keyboardTop = await slider.evaluate(
        (element) => element.getBoundingClientRect().top,
      );
      await page.evaluate(() => {
        window.__sliderScrollCalls = [];
      });
      await page.keyboard.down("ArrowLeft");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.up("ArrowLeft");
      await page.waitForTimeout(300);
      assert.notEqual(
        await slider.inputValue(),
        after.value,
        `${label}: keyboard must change value`,
      );
      assert.equal(
        await page.evaluate(() => window.__sliderScrollCalls.length),
        0,
        `${label}: keyboard must not reset scroll`,
      );
      assert.ok(
        Math.abs(
          (await slider.evaluate(
            (element) => element.getBoundingClientRect().top,
          )) - keyboardTop,
        ) <= 2,
      );
      console.log(`PASS ${label}: repeated keyboard input stays in place`);
    }
    const expectedValues = await ranges.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => element.value),
    );
    const expectedDate = await page.locator('input[type="date"]').inputValue();
    const expectedTime = await page.locator('input[type="time"]').inputValue();
    const sharedUrl = page.url();
    const params = new URL(sharedUrl).searchParams;
    assert.deepEqual([...params.keys()].sort(), ["date", "lat", "lon", "time"]);
    assert.equal(params.get("date"), expectedDate);
    assert.equal(params.get("time"), expectedTime);
    assert.equal(Number(params.get("lat")), Number(expectedValues[1]));
    assert.equal(Number(params.get("lon")), Number(expectedValues[2]));
    assert.equal(await page.evaluate(() => history.length), historyLength);
    // A fresh context cannot borrow the originating tab's store or localStorage.
    const sharedContext = await browser.newContext(device);
    const sharedPage = await sharedContext.newPage();
    await sharedPage.goto(sharedUrl);
    await sharedPage.waitForFunction((values) => {
      const inputs = [...document.querySelectorAll('input[type="range"]')];
      return values.every((value, index) => inputs[index]?.value === value);
    }, expectedValues);
    assert.equal(
      await sharedPage.locator('input[type="date"]').inputValue(),
      expectedDate,
    );
    assert.equal(
      await sharedPage.locator('input[type="time"]').inputValue(),
      expectedTime,
    );
    await sharedContext.close();
    console.log(
      `PASS ${landscape ? "landscape" : "portrait"}: shared URL restores exact location and solar date/time`,
    );
    assert.deepEqual(errors, [], "No browser runtime errors");
    await context.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], failures.join("\n"));
