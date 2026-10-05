import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { copyPngToClipboard, downloadPng } from "@/lib/share-infographic";

type Props = {
  previewUrl: string | null;
  blob: Blob | null;
  filename: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function ShareInfographicDialog({
  previewUrl,
  blob,
  filename,
  loading,
  error,
  onClose,
}: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyImage() {
    if (!blob) return;
    setCopyState("idle");
    try {
      await copyPngToClipboard(blob);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-infographic-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-card bg-surface shadow-2xl ring-1 ring-line">
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              Share this view
            </p>
            <h2
              id="share-infographic-title"
              className="font-display text-2xl text-fg"
            >
              Moon Geometry infographic
            </h2>
            <p className="text-sm text-muted">
              The orbital panel uses the exact orientation currently shown on
              the page.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close share preview"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg hover:bg-line"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-bg/55 p-4">
          {loading ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-line bg-bg text-sm text-muted">
              Preparing PNG…
            </div>
          ) : error ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-red-400/40 bg-red-950/20 p-6 text-center text-sm text-red-200">
              {error}
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview of the Moon Geometry infographic"
              className="mx-auto block h-auto max-h-[68vh] w-auto max-w-full rounded-lg shadow-xl ring-1 ring-line"
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
          {copyState === "error" ? (
            <p className="mr-auto text-xs text-muted">
              Image clipboard access is unavailable. Download still works.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!blob || loading}
            onClick={() => void copyImage()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold text-fg hover:bg-line disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copyState === "copied" ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Copy size={17} aria-hidden="true" />
            )}
            {copyState === "copied" ? "Copied" : "Copy PNG"}
          </button>
          <button
            type="button"
            disabled={!blob || loading}
            onClick={() => blob && downloadPng(blob, filename)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-semibold text-bg hover:bg-silver disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download size={17} aria-hidden="true" />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
