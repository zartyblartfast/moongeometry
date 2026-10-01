import { createFileRoute } from "@tanstack/react-router";
import { MoonApp } from "@/components/moon-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MoonApp />;
}
