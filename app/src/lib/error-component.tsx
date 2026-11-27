import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE =
  "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        The view could not be displayed. Your shared place, date and time are
        kept in the address bar. Reload to try this observation again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-9 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg"
      >
        Reload this view
      </button>
      <details className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer">Technical details</summary>
        <p>{errorMessage(error)}</p>
      </details>
    </main>
  );
}
