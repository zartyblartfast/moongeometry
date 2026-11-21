import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { grokOgHeadTags } from "./grok-pwa-shared.mjs";
const rootRoute = readFileSync(
  new URL("../src/routes/__root.tsx", import.meta.url),
  "utf8",
);
const indexRoute = readFileSync(
  new URL("../src/routes/index.tsx", import.meta.url),
  "utf8",
);
const moonApp = readFileSync(
  new URL("../src/components/moon-app.tsx", import.meta.url),
  "utf8",
);
const socialIdentity = JSON.parse(
  readFileSync(new URL("../src/lib/og/site.json", import.meta.url), "utf8"),
);

const title = "Moon Path Visualizer | Moon Geometry";
const description =
  "Explore how the Moon’s orbit, declination, latitude, date and time shape its path across your local sky with an interactive visualizer.";
const introduction =
  "See how the Moon’s orbit and declination shape its path across your local sky for any latitude, longitude, date and mean solar time.";

test("root shell declares the approved default title, description, and app name", () => {
  assert.match(
    rootRoute,
    new RegExp(
      JSON.stringify(title)
        .slice(1, -1)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.match(
    rootRoute,
    new RegExp(
      JSON.stringify(description)
        .slice(1, -1)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.match(rootRoute, /\{\s*title:\s*PAGE_TITLE\s*\}/);
  assert.match(
    rootRoute,
    /\{\s*name:\s*["']description["'],\s*content:\s*PAGE_DESCRIPTION\s*\}/,
  );
  assert.match(
    rootRoute,
    /name:\s*["']apple-mobile-web-app-title["'][\s\S]*content:\s*["']Moon Geometry["']/,
  );
});

test("homepage index owns the root canonical without leaking it to other routes", () => {
  // A shell canonical would also apply to /guide/ and other child pages.
  assert.doesNotMatch(rootRoute, /rel:\s*["']canonical["']/);
  assert.match(indexRoute, /createFileRoute\(["']\/["']\)/);
  assert.match(indexRoute, /head:\s*\(\)\s*=>\s*\(\{[\s\S]*links:\s*\[/);
  assert.match(
    indexRoute,
    /\{\s*rel:\s*["']canonical["'],\s*href:\s*["']https:\/\/moongeometry\.com\/["']\s*\}/,
  );
  assert.equal([...indexRoute.matchAll(/rel:\s*["']canonical["']/g)].length, 1);
});

test("homepage renders the approved visible introduction", () => {
  assert.ok(moonApp.includes(introduction));
});

test("social identity matches the approved homepage metadata", () => {
  assert.equal(socialIdentity.title, "Moon Geometry");
  assert.equal(socialIdentity.ogTitle, title);
  assert.equal(socialIdentity.description, description);

  const tags = grokOgHeadTags({
    host: "moongeometry.com",
    site: socialIdentity,
    documentTitle: title,
  }).join("");
  assert.match(
    tags,
    /property="og:title" content="Moon Path Visualizer \| Moon Geometry"/,
  );
  assert.match(
    tags,
    /property="og:description" content="Explore how the Moon’s orbit/,
  );
});
