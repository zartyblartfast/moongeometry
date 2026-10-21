import { createFileRoute } from "@tanstack/react-router";
import { MoonApp } from "@/components/moon-app";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://moongeometry.com/" }],
  }),
  component: Home,
});

function Home() {
  return <MoonApp />;
}
