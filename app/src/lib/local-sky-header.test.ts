import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalSkyHeader } from "../components/local-sky-header.ts";

test("Local Sky header stacks title and controls on phones and restores a row at sm widths", () => {
  const html = renderToStaticMarkup(
    createElement(LocalSkyHeader, {
      phase: createElement("div", null, "phase"),
      title: createElement("div", null, "title"),
      controls: createElement("div", null, "controls"),
    }),
  );
  assert.match(html, /flex-col/);
  assert.match(html, /sm:flex-row/);
  assert.match(html, /w-full/);
  assert.match(html, /sm:w-auto/);
});
