import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { injectGrokPwaHead } from "./grok-pwa-shared.mjs";

const guideUrl = new URL("../src/routes/guide.tsx", import.meta.url);
const moonApp = readFileSync(
  new URL("../src/components/moon-app.tsx", import.meta.url),
  "utf8",
);
const rootRoute = readFileSync(
  new URL("../src/routes/__root.tsx", import.meta.url),
  "utf8",
);
const indexRoute = readFileSync(
  new URL("../src/routes/index.tsx", import.meta.url),
  "utf8",
);
const routerSource = readFileSync(
  new URL("../src/router.tsx", import.meta.url),
  "utf8",
);

const guideTitle = "Why the Moon’s Path Changes | Moon Geometry Guide";
const guideDescription =
  "Learn how latitude, declination, Earth’s rotation and the Moon’s tilted orbit determine where the Moon rises and the path it follows across your sky.";

function guideSource() {
  assert.ok(existsSync(guideUrl), "the /guide/ route should exist");
  return readFileSync(guideUrl, "utf8");
}

test("guide route provides unique metadata and substantive initial content", () => {
  const source = guideSource();
  assert.ok(source.includes(guideTitle));
  assert.ok(source.includes(guideDescription));
  assert.match(source, /https:\/\/moongeometry\.com\/guide\//);
  assert.ok(source.includes("Why the Moon’s Path Changes Across Your Sky"));
  assert.ok(source.includes("Use the Moon Path Visualizer"));
  assert.ok(source.includes("Declination connects orbit to sky"));
  assert.ok(source.includes("Worked comparison"));
  assert.ok(source.includes("Accuracy and limitations"));
  assert.ok(source.includes("Frequently asked questions"));
});

test("homepage contains an ordinary How it works link to the guide", () => {
  assert.match(
    moonApp,
    /<a[\s\S]*href=["']\/guide\/["'][\s\S]*>\s*How it works\s*<\/a>/,
  );
});

test("each public page owns exactly one canonical", () => {
  assert.doesNotMatch(rootRoute, /rel:\s*["']canonical["']/);
  assert.match(
    indexRoute,
    /rel:\s*["']canonical["'][\s\S]*href:\s*["']https:\/\/moongeometry\.com\/["']/,
  );
  assert.match(
    guideSource(),
    /rel:\s*["']canonical["'][\s\S]*href:\s*["']https:\/\/moongeometry\.com\/guide\/["']/,
  );
});

test("router preserves the canonical trailing slash on the guide", () => {
  assert.match(routerSource, /trailingSlash:\s*["']always["']/);
});

test("guide metadata survives production social-tag injection", () => {
  const html = `<!doctype html><html><head><title>${guideTitle}</title><meta name="description" content="${guideDescription}"></head><body></body></html>`;
  const output = injectGrokPwaHead(html, {
    host: "moongeometry.com",
    site: {
      title: "Moon Geometry",
      ogTitle: "Moon Path Visualizer | Moon Geometry",
      description: "Homepage description",
    },
  });
  assert.match(
    output,
    /property="og:title" content="Why the Moon’s Path Changes \| Moon Geometry Guide"/,
  );
  assert.match(
    output,
    /property="og:description" content="Learn how latitude, declination, Earth’s rotation/,
  );
});

test("robots and sitemap expose only the intentional canonical pages", () => {
  const robotsUrl = new URL("../public/robots.txt", import.meta.url);
  const sitemapUrl = new URL("../public/sitemap.xml", import.meta.url);
  assert.ok(existsSync(robotsUrl), "robots.txt should exist");
  assert.ok(existsSync(sitemapUrl), "sitemap.xml should exist");

  const robots = readFileSync(robotsUrl, "utf8");
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.match(robots, /Sitemap:\s*https:\/\/moongeometry\.com\/sitemap\.xml/);

  const sitemap = readFileSync(sitemapUrl, "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(locations, [
    "https://moongeometry.com/",
    "https://moongeometry.com/guide/",
  ]);
  assert.doesNotMatch(sitemap, /<lastmod>/);
});

test("guide uses a substantive real PNG capture", () => {
  const imageUrl = new URL(
    "../public/guide/moon-path-example.png",
    import.meta.url,
  );
  assert.ok(existsSync(imageUrl), "the guide screenshot should exist");
  assert.ok(
    statSync(imageUrl).size > 20_000,
    "the screenshot should be substantive",
  );
  const png = readFileSync(imageUrl);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.ok(png.readUInt32BE(16) >= 1200);
  assert.ok(png.readUInt32BE(20) >= 700);
});
