import { createElement, type ReactNode } from "react";

export function LocalSkyHeader({
  phase,
  title,
  controls,
}: {
  phase: ReactNode;
  title: ReactNode;
  controls: ReactNode;
}) {
  return createElement(
    "div",
    {
      className:
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
      "data-local-sky-header": true,
    },
    createElement(
      "div",
      { className: "flex w-full min-w-0 items-start gap-3" },
      phase,
      createElement("div", { className: "min-w-0 flex-1" }, title),
    ),
    createElement(
      "div",
      {
        className:
          "flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end",
      },
      controls,
    ),
  );
}
