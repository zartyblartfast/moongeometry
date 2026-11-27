import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { createServer } from "vite";
import { projectRoot } from "./with-app-env.mjs";

const query = "?lat=51.5&lon=-0.1&date=2026-12-21&time=21:00";
const artifacts = process.env.MOON_HARDENING_ARTIFACT_DIR;
const previousAuth = process.env.VITE_AUTH_ENABLED;
const previousDatabase = process.env.DATABASE_URL;
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
      const remaining = browser?.contexts().length ?? 0;
      await browser?.close();
      assert.equal(remaining, 0, "owned contexts closed");
      assert.equal(browser?.isConnected() ?? false, false);
    } finally {
      try {
        await server?.close();
        assert.equal(server?.httpServer?.listening ?? false, false);
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

async function open(
  t,
  {
    viewport = { width: 1280, height: 800 },
    touch = false,
    fault = false,
    slowExport = false,
  } = {},
) {
  const context = await browser.newContext({
    viewport,
    isMobile: touch,
    hasTouch: touch,
  });
  t.after(() => context.close());
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
  t.after(() =>
    assert.deepEqual(
      errors.filter(
        (message) =>
          !(fault && message.includes("Deliberate hardening recovery fault")),
      ),
      [],
      "no unexpected browser/hydration errors",
    ),
  );
  if (fault) {
    let injected = false;
    await page.route("**/src/components/moon-app.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      assert.ok(
        source.includes("const observed = useMemo("),
        "render fault seam exists",
      );
      const altered =
        'const hardeningFault = !sessionStorage.getItem("hardening-faulted"); sessionStorage.setItem("hardening-faulted", "yes");\n' +
        source.replace(
          "const observed = useMemo(",
          'if (mounted && hardeningFault) { throw new Error("Deliberate hardening recovery fault"); }\nconst observed = useMemo(',
        );
      assert.notEqual(altered, source, "render fault seam exists");
      injected = true;
      await route.fulfill({ response, body: altered });
    });
    await page.goto(base + "/" + query);
    await page
      .getByRole("heading", { name: "Something went wrong", exact: true })
      .waitFor();
    assert.ok(injected, "only this context received deliberate fault");
    return { page, errors };
  }
  if (slowExport)
    await page.route("**/src/components/moon-app.tsx*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const altered = source.replace(
        "window.setTimeout(resolve, 50)",
        "window.setTimeout(resolve, 1500)",
      );
      assert.notEqual(altered, source, "export delay seam exists");
      await route.fulfill({ response, body: altered });
    });
  await page.goto(base + "/" + query);
  await page.waitForFunction(
    () =>
      document.querySelector('input[type="time"]')?.value === "21:00" &&
      document.querySelector('[title="IANA zone: Europe/London"]'),
  );
  if (touch)
    await page
      .getByRole("button", { name: "Change place or time", exact: true })
      .click();
  return { page, errors, fault };
}

function localSky(page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Local sky path", exact: true }),
  });
}

async function slideAndPause(page) {
  const sky = localSky(page);
  const declination = sky
    .locator("dt")
    .filter({ hasText: /^Declination$/ })
    .locator("..")
    .locator("dd");
  const before = await declination.innerText();
  const slide = page.getByRole("button", {
    name: "Slide the Moon",
    exact: true,
  });
  await slide.click();
  assert.equal(await slide.getAttribute("aria-pressed"), "true");
  assert.equal(
    await sky.getByText("Simulated sky.", { exact: true }).isVisible(),
    true,
    "active Slide discloses the simulation",
  );
  await page.waitForFunction((before) => {
    const term = [...document.querySelectorAll("dt")].find(
      (node) => node.textContent === "Declination",
    );
    return term?.nextElementSibling?.textContent !== before;
  }, before);
  await slide.click();
  assert.equal(
    await slide.getAttribute("aria-pressed"),
    "false",
    "Slide playback is paused",
  );
  assert.notEqual(
    await declination.innerText(),
    before,
    "real animation changed the displayed orbital result",
  );
  return sky;
}

async function clearHour(page) {
  const time = page.getByLabel("Mean solar time", { exact: true });
  await time.focus();
  await time.press("Home");
  await time.press("Backspace");
  return time;
}

test(
  "clearing a native time segment keeps the last valid workbench and URL",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    const url = page.url();
    const answer = await page.locator("dl").first().innerText();
    if (artifacts)
      await page.screenshot({
        path: join(artifacts, "before-1280.png"),
        fullPage: true,
      });
    const time = await clearHour(page);
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .getByRole("heading", { name: "Moon Geometry", exact: true })
        .count(),
      1,
      "workbench remains mounted after clearing a time segment",
    );
    assert.equal(
      await page.locator("dl").first().innerText(),
      answer,
      "last valid astronomical answer remains",
    );
    assert.equal(page.url(), url, "last valid shared URL remains");
    assert.equal(
      await time.inputValue(),
      "",
      "incomplete native input remains correctable",
    );
  },
);

test(
  "native time correction, blur restoration and boundary replacements preserve the clock contract",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    const time = await clearHour(page);
    await time.pressSequentially("22");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "22:00",
    );
    await clearHour(page);
    await page.getByLabel("Date", { exact: true }).focus();
    assert.equal(
      await time.inputValue(),
      "22:00",
      "blur restores last valid moment",
    );
    for (const clock of ["00:00", "23:59", "09:05"]) {
      await time.fill(clock);
      await page.waitForFunction(
        (clock) => new URLSearchParams(location.search).get("time") === clock,
        clock,
      );
      const params = new URL(page.url()).searchParams;
      assert.equal(params.get("date"), "2026-12-21");
      assert.equal(params.get("lon"), "-0.1");
      assert.equal(await time.inputValue(), clock);
      assert.ok(
        (await time.locator("..").innerText()).includes(
          `UTC · ${clock}, 21 Dec · same time`,
        ),
      );
      assert.ok(
        (await time.locator("..").innerText()).includes(
          `Civil · ${clock} GMT, 21 Dec · UTC+00:00`,
        ),
      );
    }
    await clearHour(page);
    await page
      .getByRole("button", { name: "Summer full Moon", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector('input[type="time"]').value === "22:00",
    );
    assert.equal(
      await time.inputValue(),
      "22:00",
      "preset replaces abandoned draft",
    );
    await time.fill("23:59");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-22");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("date") === "2026-12-22",
    );
    assert.equal(await time.inputValue(), "23:59");
    const shared = page.url();
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector('[title="IANA zone: Europe/London"]') &&
        document.querySelector('input[type="time"]').value === "23:59",
    );
    assert.equal(page.url(), shared, "shared mean-solar URL survives reload");
  },
);

test(
  "correcting a missing minute at another longitude keeps the selected mean-solar date",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    await page
      .getByRole("slider", { name: "Longitude -0.1°", exact: true })
      .fill("15");
    const time = page.getByLabel("Mean solar time", { exact: true });
    await time.fill("00:00");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "00:00",
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector('[title^="IANA zone:"]')
          ?.getAttribute("title") !== "IANA zone: Europe/London" &&
        document.body.innerText.includes("UTC+01:00"),
    );
    const url = page.url();
    const clocks = await time.locator("..").innerText();
    assert.ok(clocks.includes("UTC · 23:00, 20 Dec · 1h behind"));
    assert.ok(
      clocks.includes("Civil · 00:00 GMT+1, 21 Dec · UTC+01:00") ||
        clocks.includes("Civil · 00:00 CET, 21 Dec · UTC+01:00"),
    );
    await time.focus();
    await time.press("Home");
    await time.press("ArrowRight");
    await time.press("Backspace");
    assert.equal(
      await time.inputValue(),
      "",
      "minute segment can be edited without crashing",
    );
    assert.equal(page.url(), url);
    await time.pressSequentially("59");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "00:59",
    );
    assert.equal(new URL(page.url()).searchParams.get("date"), "2026-12-21");
    assert.equal(new URL(page.url()).searchParams.get("lon"), "15");
  },
);

async function assertContained(page, dialog, steps = 14) {
  assert.equal(
    await dialog.evaluate((node) => node.contains(document.activeElement)),
    true,
    "opening moves focus inside",
  );
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press(key);
      assert.equal(
        await dialog.evaluate((node) => node.contains(document.activeElement)),
        true,
        `${key} stays inside dialog`,
      );
    }
  }
}

test(
  "Explain supports keyboard containment, Escape and focus return",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    const opener = page.getByRole("button", { name: "Explain", exact: true });
    await opener.focus();
    const url = page.url();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Explain this moment",
      exact: true,
    });
    await dialog.waitFor();
    await assertContained(page, dialog);
    assert.equal(
      await page.getByRole("button", { name: "Share", exact: true }).count(),
      0,
      "background inaccessible in accessibility tree",
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Explain",
    );
    assert.equal(
      await opener.evaluate((node) => node === document.activeElement),
      true,
      "focus returns to Explain",
    );
    assert.equal(page.url(), url);
  },
);

// Deterministic no-prefocus semantics, not Safari runtime certification:
// cancel only native mousedown's focus default, never the real click/open action.
for (const kind of ["Explain", "Share"]) {
  test(
    `${kind} returns focus to its actual trigger after pointer opening without prefocus`,
    { timeout: 60_000 },
    async (t) => {
      const { page } = await open(t, {
        viewport: { width: 1440, height: 900 },
      });
      const opener = page.getByRole("button", { name: kind, exact: true });
      const dialog = page.getByRole("dialog", {
        name:
          kind === "Explain"
            ? "Explain this moment"
            : "Moon Geometry infographic",
        exact: true,
      });
      const trigger = await opener.elementHandle();
      const url = page.url();
      await opener.evaluate((node) => {
        node.addEventListener("mousedown", (event) => event.preventDefault());
        node.addEventListener("click", (event) => {
          node.dataset.noPrefocusClick = JSON.stringify({
            trusted: event.isTrusted,
            triggerFocused: document.activeElement === node,
            previousFocus: document.activeElement?.tagName,
          });
        });
      });
      for (const [initialFocus, dismissal] of [
        ["BODY", "Escape"],
        ["INPUT", "Close"],
        ["BODY", "outside"],
      ]) {
        await opener.scrollIntoViewIfNeeded();
        await page.evaluate((initialFocus) => {
          if (initialFocus === "BODY") document.activeElement?.blur();
          else
            document
              .querySelector('input[type="date"]')
              .focus({ preventScroll: true });
        }, initialFocus);
        assert.equal(
          await page.evaluate(() => document.activeElement?.tagName),
          initialFocus,
          "opening starts with body or an unrelated control focused",
        );
        const scroll = await page.evaluate(() => scrollY);
        await opener.click();
        await dialog.waitFor();
        assert.deepEqual(
          JSON.parse(await trigger.getAttribute("data-no-prefocus-click")),
          {
            trusted: true,
            triggerFocused: false,
            previousFocus: initialFocus,
          },
          "native click opens the dialog without first focusing its trigger",
        );
        await assertContained(page, dialog, 2);
        if (kind === "Share") {
          const image = dialog.getByAltText(
            "Preview of the Moon Geometry infographic",
            { exact: true },
          );
          await image.waitFor();
          await image.evaluate((img) => img.decode());
        }
        if (dismissal === "outside") {
          await page.mouse.click(2, 2);
          if (kind === "Explain") {
            assert.equal(await dialog.count(), 1);
            await page.keyboard.press("Escape");
          }
        } else if (dismissal === "Escape") {
          await page.keyboard.press("Escape");
        } else {
          await dialog
            .getByRole("button", {
              name: kind === "Explain" ? "Close" : "Close share preview",
              exact: true,
            })
            .click();
        }
        await dialog.waitFor({ state: "hidden" });
        // Radix schedules unmount autofocus; wait for it before asserting identity.
        await page
          .waitForFunction((node) => document.activeElement === node, trigger, {
            timeout: 2000,
          })
          .catch((error) => {
            if (error.name !== "TimeoutError") throw error;
          });
        assert.equal(
          await trigger.evaluate((node) => document.activeElement === node),
          true,
          `${kind} must restore the actual opening button, not the previously focused ${initialFocus}`,
        );
        assert.equal(await page.evaluate(() => scrollY), scroll);
        assert.equal(page.url(), url);
      }
    },
  );
}

test(
  "Share contains focus through loading and ready states and supports Escape",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t, { slowExport: true });
    const opener = page.getByRole("button", { name: "Share", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: "Moon Geometry infographic",
      exact: true,
    });
    await dialog.waitFor();
    assert.equal(
      await dialog
        .getByRole("button", { name: "Copy PNG", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await dialog
        .getByRole("button", { name: "Download PNG", exact: true })
        .isDisabled(),
      true,
    );
    await assertContained(page, dialog, 3);
    const image = dialog.getByAltText(
      "Preview of the Moon Geometry infographic",
      { exact: true },
    );
    await image.waitFor();
    await image.evaluate((img) => img.decode());
    assert.equal(
      await dialog
        .getByRole("button", { name: "Copy PNG", exact: true })
        .isEnabled(),
      true,
    );
    assert.equal(
      await dialog
        .getByRole("button", { name: "Download PNG", exact: true })
        .isEnabled(),
      true,
    );
    await assertContained(page, dialog, 6);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Share",
    );
    assert.equal(
      await opener.evaluate((node) => node === document.activeElement),
      true,
    );
  },
);

test(
  "time drafts follow scrubber, longitude and animation without overwriting newer state",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t, {
      viewport: { width: 390, height: 844 },
      touch: true,
    });
    const time = await clearHour(page);
    const scrubber = page.getByRole("slider", {
      name: "Scrub mean solar time through the selected day",
      exact: true,
    });
    await scrubber.focus();
    const initialScroll = await page.evaluate(() => ({
      y: scrollY,
      history: history.length,
    }));
    await scrubber.press("ArrowRight");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("time") === "21:05",
    );
    assert.equal(await time.inputValue(), "21:05");
    assert.deepEqual(
      await page.evaluate(() => ({ y: scrollY, history: history.length })),
      initialScroll,
      "time-only router edit preserves phone scroll and history",
    );
    await clearHour(page);
    const longitude = page.getByRole("slider", {
      name: "Longitude -0.1°",
      exact: true,
    });
    await longitude.focus();
    await longitude.press("ArrowRight");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("lon") === "0",
    );
    assert.equal(
      await time.inputValue(),
      "21:05",
      "longitude refresh restores current mean-solar clock",
    );
    await page.getByRole("button", { name: "Spin Earth", exact: true }).click();
    await clearHour(page);
    await page.waitForFunction(() =>
      /^\d\d:\d\d$/.test(document.querySelector('input[type="time"]').value),
    );
    await page.getByRole("button", { name: "Spin Earth", exact: true }).click();
    const finalClock = await time.inputValue();
    await page.waitForFunction(
      (clock) => new URLSearchParams(location.search).get("time") === clock,
      finalClock,
    );
    await time.focus();
    await time.press("Tab");
    assert.equal(
      await time.inputValue(),
      finalClock,
      "blur cannot write an old draft over animation",
    );
    const region = page.getByRole("region", {
      name: "Place and time",
      exact: true,
    });
    assert.equal(
      await region.locator('input[type="time"]').count(),
      1,
      "only mean solar time is editable",
    );
    assert.equal(
      await region.locator("input[readonly]").count(),
      0,
      "UTC/civil remain text rather than editable inputs",
    );
  },
);

for (const scenario of [
  { name: "desktop-1280", viewport: { width: 1280, height: 800 } },
  { name: "desktop-1440", viewport: { width: 1440, height: 900 } },
  { name: "phone-390", viewport: { width: 390, height: 844 }, touch: true },
]) {
  test(
    `${scenario.name}: modal dismissal, repeated opening, semantics and scroll stability`,
    { timeout: 60_000 },
    async (t) => {
      const { page } = await open(t, scenario);
      const url = page.url();
      for (const kind of ["Explain", "Share"]) {
        const opener = page.getByRole("button", { name: kind, exact: true });
        await opener.scrollIntoViewIfNeeded();
        await opener.focus();
        const before = await page.evaluate(() => ({
          scroll: scrollY,
          history: history.length,
          bounds: document
            .querySelector('section[aria-label="Place and time"]')
            .getBoundingClientRect()
            .toJSON(),
        }));
        const dialog = page.getByRole("dialog", {
          name:
            kind === "Explain"
              ? "Explain this moment"
              : "Moon Geometry infographic",
          exact: true,
        });
        for (const dismissal of ["Escape", "Close", "outside"]) {
          await opener.click();
          await dialog.waitFor();
          await page.waitForFunction(() =>
            document
              .querySelector('[role="dialog"]')
              ?.contains(document.activeElement),
          );
          assert.equal(await dialog.getAttribute("aria-modal"), "true");
          const semantics = await dialog.evaluate((node) => ({
            title: document
              .getElementById(node.getAttribute("aria-labelledby"))
              ?.textContent?.trim(),
            description: document
              .getElementById(node.getAttribute("aria-describedby"))
              ?.textContent?.trim(),
          }));
          assert.ok(
            semantics.title && semantics.description,
            "title and description reference real content",
          );
          assert.equal(
            await page
              .getByRole("button", { name: "Explain", exact: true })
              .count(),
            0,
            "background Explain is inaccessible",
          );
          assert.equal(
            await page
              .getByRole("navigation", { name: "Workspaces", exact: true })
              .count(),
            0,
            "background navigation is inaccessible",
          );
          assert.equal(
            await page.getByRole("slider").count(),
            0,
            "background sliders are inaccessible",
          );
          await assertContained(page, dialog, 7);
          if (artifacts && dismissal === "Close")
            await page.screenshot({
              path: join(
                artifacts,
                `${scenario.name}-${kind.toLowerCase()}.png`,
              ),
            });
          if (dismissal === "outside") {
            if (scenario.touch) await page.touchscreen.tap(2, 2);
            else await page.mouse.click(2, 2);
            if (kind === "Explain") {
              assert.equal(
                await dialog.count(),
                1,
                "Explain retains its non-dismissable backdrop policy",
              );
              await page.keyboard.press("Escape");
            }
          } else if (dismissal === "Escape")
            await page.keyboard.press("Escape");
          else
            await dialog
              .getByRole("button", {
                name: kind === "Explain" ? "Close" : "Close share preview",
                exact: true,
              })
              .click();
          await dialog.waitFor({ state: "hidden" });
          await page.waitForFunction(
            (kind) => document.activeElement?.textContent?.trim() === kind,
            kind,
          );
          const after = await page.evaluate(() => ({
            scroll: scrollY,
            history: history.length,
            bounds: document
              .querySelector('section[aria-label="Place and time"]')
              .getBoundingClientRect()
              .toJSON(),
          }));
          assert.deepEqual(
            after,
            before,
            "opening/closing does not move the workspace or scroll",
          );
          assert.equal(page.url(), url, "moment and shared URL unchanged");
        }
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "no horizontal overflow",
      );
      if (artifacts)
        await page.screenshot({
          path: join(artifacts, `${scenario.name}-workbench.png`),
          fullPage: true,
        });
    },
  );
}

test(
  "primary simulation disclosure persists after real Slide playback is paused",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    if (artifacts)
      await page.screenshot({
        path: join(artifacts, "simulation-before-1280.png"),
        fullPage: true,
      });
    const sky = await slideAndPause(page);
    const notice = sky.locator("p").filter({ hasText: /^Simulated sky/ });
    assert.equal(
      await notice.count(),
      1,
      "paused independent orbital state needs a primary disclosure",
    );
    assert.equal(await notice.isVisible(), true);
    assert.match(
      await notice.innerText(),
      /orbital position.*separately.*observer’s clock/,
    );
    assert.match(
      await notice.innerText(),
      /Set the date and time again before comparing/,
    );
    assert.equal(
      await notice.evaluate((node) => node.closest("dl")),
      null,
      "notice stays outside the definition list",
    );
  },
);

async function offsetOrbit(page) {
  // Supplementary fixture uses the real module; no test globals in shipped code.
  await page.evaluate(async () => {
    const { useMoon } = await import("/src/lib/store.ts");
    useMoon.setState({
      orbit: useMoon.getState().instant + 3_600_000,
      playing: "none",
    });
  });
  await localSky(page).getByText("Simulated sky.", { exact: true }).waitFor();
}

test(
  "simulation disclosure follows orbital offset through location edits and Spin playback",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    const notice = localSky(page).getByText("Simulated sky.", { exact: true });
    assert.equal(
      await notice.count(),
      0,
      "shared observational visit is quiet",
    );
    await offsetOrbit(page);
    for (const [name, value] of [
      [/^Latitude /, "40.7"],
      [/^Longitude /, "-74"],
    ]) {
      await page.getByRole("slider", { name }).fill(value);
      assert.equal(
        await notice.isVisible(),
        true,
        "location edits do not synchronize the clocks",
      );
    }
    const spin = page.getByRole("button", { name: "Spin Earth", exact: true });
    await spin.click();
    assert.equal(await spin.getAttribute("aria-pressed"), "true");
    assert.equal(await notice.isVisible(), true);
    await spin.click();
    assert.equal(
      await notice.isVisible(),
      true,
      "Spin pause also preserves the offset disclosure",
    );
    await page.reload();
    await page.locator('[title="IANA zone: America/New_York"]').waitFor();
    assert.equal(
      await notice.count(),
      0,
      "reloaded shared URL restores an observational clock, not the independent orbit",
    );
  },
);

for (const action of ["date", "time", "current time", "preset", "scrubber"]) {
  test(
    `${action} resynchronizes the clocks and clears the simulation disclosure`,
    { timeout: 60_000 },
    async (t) => {
      const { page } = await open(t);
      await offsetOrbit(page);
      if (action === "date")
        await page.getByLabel("Date", { exact: true }).fill("2026-12-22");
      if (action === "time")
        await page.getByLabel("Mean solar time", { exact: true }).fill("22:00");
      if (action === "current time")
        await page
          .getByRole("button", { name: "Use current time", exact: true })
          .click();
      if (action === "preset")
        await page
          .getByRole("button", { name: "Summer full Moon", exact: true })
          .click();
      if (action === "scrubber")
        await page
          .getByRole("slider", {
            name: "Scrub mean solar time through the selected day",
            exact: true,
          })
          .fill("800");
      await localSky(page)
        .getByText("Simulated sky.", { exact: true })
        .waitFor({ state: "detached" });
      assert.equal(
        await page
          .getByRole("button", { name: "Slide the Moon", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
      assert.deepEqual(
        await page.evaluate(async () => {
          const { useMoon } = await import("/src/lib/store.ts");
          const { instant, orbit, playing } = useMoon.getState();
          return { synchronized: instant === orbit, playing };
        }),
        { synchronized: true, playing: "none" },
      );
    },
  );
}

test(
  "ordinary visit has no idle simulation disclosure",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    await page.goto(base + "/");
    await page.locator('[title="IANA zone: Europe/London"]').waitFor();
    assert.equal(
      await localSky(page).getByText("Simulated sky.", { exact: true }).count(),
      0,
    );
  },
);

test(
  "New York rise/set names the mean-solar first clock in primary results and Explain",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    await page.goto(base + "/?lat=40.7&lon=-74&date=2026-11-27&time=20:00");
    await page.locator('[title="IANA zone: America/New_York"]').waitFor();
    const sky = localSky(page);
    const rise = sky.locator("dt").filter({ hasText: /^Rise/ }).locator("..");
    const set = sky.locator("dt").filter({ hasText: /^Set/ }).locator("..");
    assert.equal(
      await rise.locator("dd").innerText(),
      "19:49· 00:45 UTC, 28 Nov",
    );
    assert.equal(await set.locator("dd").innerText(), "10:40· 15:36 UTC");
    assert.equal(await rise.locator("dt").innerText(), "Rise · mean solar");
    assert.equal(await set.locator("dt").innerText(), "Set · mean solar");
    assert.match(await sky.innerText(), /Moon centre, standard refraction/);
    await page.getByRole("button", { name: "Explain", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Explain this moment",
      exact: true,
    });
    const events = dialog
      .locator("dt")
      .filter({ hasText: /^Rise \/ set/ })
      .locator("..");
    assert.equal(
      await events.locator("dt").innerText(),
      "Rise / set · mean solar, then UTC",
    );
    assert.equal(
      await events.locator("dd").innerText(),
      "19:49 · 00:45 UTC, 28 Nov / 10:40 · 15:36 UTC",
    );
  },
);

test(
  "Greenwich event clocks retain equal values without a UTC date suffix",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    await page.goto(base + "/?lat=51.5&lon=0&date=2026-12-21&time=21:00");
    await page.locator('[title="IANA zone: Europe/London"]').waitFor();
    const sky = localSky(page);
    for (const [term, expected] of [
      ["Rise · mean solar", "13:23· 13:23 UTC"],
      ["Set · mean solar", "05:58· 05:58 UTC"],
    ]) {
      assert.equal(
        await sky
          .locator("dt")
          .filter({ hasText: term })
          .locator("..")
          .locator("dd")
          .innerText(),
        expected,
      );
    }
    await page.getByRole("button", { name: "Explain", exact: true }).click();
    const events = page
      .getByRole("dialog")
      .locator("dt")
      .filter({ hasText: "Rise / set · mean solar, then UTC" })
      .locator("..");
    assert.equal(
      await events.locator("dd").innerText(),
      "13:23 · 13:23 UTC / 05:58 · 05:58 UTC",
    );
  },
);

test(
  "polar rise/set fallback text survives explicit clock labeling",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    for (const [latitude, expected] of [
      ["90", ["Up all day", "Up all day"]],
      ["-90", ["Does not rise", "Does not set"]],
    ]) {
      await page.getByRole("slider", { name: /^Latitude / }).fill(latitude);
      const sky = localSky(page);
      assert.deepEqual(
        await sky
          .locator("dt")
          .filter({ hasText: /^(Rise|Set) · mean solar$/ })
          .locator("..")
          .locator("dd")
          .allTextContents(),
        expected,
      );
    }
  },
);

async function skyLayout(page) {
  return localSky(page).evaluate((section) => {
    const svg = [...section.querySelectorAll("svg")].find(
      (node) =>
        node.querySelector("[data-sky-horizon]") &&
        node.getBoundingClientRect().height > 10,
    );
    const stage = svg.parentElement.getBoundingClientRect();
    const notice = [...section.querySelectorAll("p")].find((node) =>
      node.textContent.startsWith("Simulated sky."),
    );
    const label = [...section.querySelectorAll("dt")].find((node) =>
      node.textContent.startsWith("Rise"),
    );
    const text = notice ? getComputedStyle(notice) : null;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      stage: { width: stage.width, height: stage.height },
      skyHeight: section.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth,
      eventLabel: {
        height: label.getBoundingClientRect().height,
        lineHeight: getComputedStyle(label).lineHeight,
      },
      notice: notice
        ? {
            width: notice.getBoundingClientRect().width,
            height: notice.getBoundingClientRect().height,
            fontSize: text.fontSize,
            lineHeight: text.lineHeight,
            color: text.color,
            background: getComputedStyle(section).backgroundColor,
            labelColor: getComputedStyle(notice.firstElementChild).color,
          }
        : null,
    };
  });
}

for (const scenario of [
  {
    name: "clarity-1280",
    viewport: { width: 1280, height: 800 },
    stageHeight: 256,
  },
  {
    name: "clarity-1440",
    viewport: { width: 1440, height: 900 },
    stageHeight: 256,
  },
  {
    name: "clarity-phone",
    viewport: { width: 390, height: 844 },
    touch: true,
    stageHeight: 208,
  },
  {
    name: "clarity-landscape",
    viewport: { width: 844, height: 390 },
    touch: true,
    stageHeight: 208,
  },
]) {
  test(
    `${scenario.name}: compact labels and paused disclosure preserve the native sky stage`,
    { timeout: 60_000 },
    async (t) => {
      const { page } = await open(t, scenario);
      await page.evaluate(() => document.fonts.ready);
      const normal = await skyLayout(page);
      assert.equal(normal.stage.height, scenario.stageHeight);
      assert.equal(normal.overflow, false);
      assert.equal(normal.notice, null);
      assert.equal(
        normal.eventLabel.height,
        Number.parseFloat(normal.eventLabel.lineHeight),
        "event label stays on one line",
      );
      await localSky(page).scrollIntoViewIfNeeded();
      if (artifacts)
        await page.screenshot({
          path: join(artifacts, `${scenario.name}-normal.png`),
          fullPage: true,
        });
      await slideAndPause(page);
      const paused = await skyLayout(page);
      assert.deepEqual(
        paused.stage,
        normal.stage,
        "notice never resizes the plot",
      );
      assert.equal(paused.overflow, false);
      assert.equal(paused.notice.fontSize, "12px");
      assert.equal(paused.notice.lineHeight, "16px");
      assert.equal(
        paused.skyHeight - normal.skyHeight,
        paused.notice.height + 8,
        "only conditional copy plus existing gap grows the panel",
      );
      await localSky(page).scrollIntoViewIfNeeded();
      if (artifacts) {
        await page.screenshot({
          path: join(artifacts, `${scenario.name}-paused.png`),
          fullPage: true,
        });
        await writeFile(
          join(artifacts, `${scenario.name}-layout.json`),
          JSON.stringify({ normal, paused }, null, 2),
        );
      }
      await page.getByRole("button", { name: "Explain", exact: true }).click();
      const dialog = page.getByRole("dialog", {
        name: "Explain this moment",
        exact: true,
      });
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /Slide the Moon simulation/);
      assert.match(
        await dialog.innerText(),
        /Rise \/ set · mean solar, then UTC/,
      );
      if (artifacts)
        await page.screenshot({
          path: join(artifacts, `${scenario.name}-explain.png`),
        });
    },
  );
}

test(
  "actual Share PNG remains a decoded native infographic after the clarity patch",
  { timeout: 60_000 },
  async (t) => {
    const { page } = await open(t);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Moon Geometry infographic",
      exact: true,
    });
    const image = dialog.getByAltText(
      "Preview of the Moon Geometry infographic",
      { exact: true },
    );
    await image.waitFor();
    await image.evaluate((img) => img.decode());
    const downloadPromise = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Download PNG", exact: true })
      .click();
    const download = await downloadPromise;
    const png = PNG.sync.read(await readFile(await download.path()));
    assert.equal(png.width, 1600);
    assert.equal(png.height, 900);
    assert.equal(await download.failure(), null);
    if (artifacts) await download.saveAs(join(artifacts, "clarity-share.png"));
  },
);

test(
  "render errors offer a working reload that preserves the shared observation",
  { timeout: 60_000 },
  async (t) => {
    const { page, errors } = await open(t, { fault: true });
    assert.match(
      await page.locator("main").innerText(),
      /Your shared place, date and time/,
    );
    await page
      .getByRole("button", { name: "Reload this view", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('input[type="time"]')?.value === "21:00" &&
        document.querySelector('[title="IANA zone: Europe/London"]'),
    );
    const params = new URL(page.url()).searchParams;
    assert.equal(params.get("lat"), "51.5");
    assert.equal(params.get("lon"), "-0.1");
    assert.equal(params.get("date"), "2026-12-21");
    assert.equal(params.get("time"), "21:00");
    assert.ok(
      errors.some((message) =>
        message.includes("Deliberate hardening recovery fault"),
      ),
      "deliberate render error actually occurred",
    );
  },
);
