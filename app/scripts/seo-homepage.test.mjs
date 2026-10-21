import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { grokOgHeadTags } from "./grok-pwa-shared.mjs";
const rootRoute = readFileSync(
  new URL("../src/routes/__root.tsx", import.meta.url),
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

test("homepage route declares the approved title, description, and root canonical", () => {
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
  assert.match(
    rootRoute,
    /rel:\s*["']canonical["'][\s\S]*href:\s*["']https:\/\/moongeometry\.com\/["']/,
  );
  assert.match(
    rootRoute,
    /name:\s*["']apple-mobile-web-app-title["'][\s\S]*content:\s*["']Moon Geometry["']/,
  );
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
