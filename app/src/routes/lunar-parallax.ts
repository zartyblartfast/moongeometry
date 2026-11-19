import { createFileRoute } from "@tanstack/react-router";
import documentHtml from "../workspaces/lunar-parallax.html?raw";

export const Route = createFileRoute("/lunar-parallax")({
  server: {
    handlers: {
      GET: () => new Response(documentHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    },
  },
});
