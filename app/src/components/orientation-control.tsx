import { useEffect, useState, type ReactNode } from "react";
import type { SkyPath } from "@/lib/astro";
import type { AstronomyProviderSnapshot } from "@/lib/astronomy/provider";
import { displayAzimuth, wrap180 } from "@/lib/true-north-orientation";
import { roundDeviceLocation } from "@/lib/viewing-location";
import {
  useTrueNorthOrientation,
  type UseTrueNorthOrientationResult,
  type TrueNorthOrientationState,
} from "@/lib/use-true-north-orientation";
import {
  canonicalShareHeading,
  orientationLiveAnnouncement,
  orientationStatusMessage,
  selectedTimeNeedsWarning,
  shouldShowOrientationPreview,
  useOrientationInvalidationBoundary,
} from "./orientation-ui";
import { SkyChart } from "./sky-chart";

type RenderState = {
  controls: ReactNode;
  status: ReactNode;
  chart: ReactNode;
  orientationActive: boolean;
};

type Props = {
  snapshot: AstronomyProviderSnapshot;
  moonPath: SkyPath;
  sunPath: SkyPath;
  selectedLatDeg: number;
  selectedLonDeg: number;
  currentLocationAvailable: boolean;
  locationRevision: number;
  instant: number;
  stopAnimation(): void;
  setInstant(instant: number): void;
  adoptDeviceLocation(latDeg: number, lonDeg: number): void;
  orientationHook?: (options: {
    selectedLatDeg: number;
    selectedLonDeg: number;
    moonTrueAzimuthDeg: number;
  }) => UseTrueNorthOrientationResult;
  children(state: RenderState): ReactNode;
};

function sessionIsOpen(state: TrueNorthOrientationState): boolean {
  return state.status !== "idle" && state.status !== "unavailable";
}

export function OrientationControl({
  snapshot,
  moonPath,
  sunPath,
  selectedLatDeg,
  selectedLonDeg,
  currentLocationAvailable,
  locationRevision,
  instant,
  stopAnimation,
  setInstant,
  adoptDeviceLocation,
  orientationHook = useTrueNorthOrientation,
  children,
}: Props) {
  const moonAltitudeDeg = snapshot.moon.horizontal.altitudeDeg;
  const moonAzimuthDeg = snapshot.moon.horizontal.azimuthDeg;
  const orientation = orientationHook({
    selectedLatDeg,
    selectedLonDeg,
    moonTrueAzimuthDeg: moonAzimuthDeg,
  });
  const stopOrientation = orientation.stop;
  const [pendingLocation, setPendingLocation] = useState<{
    latDeg: number;
    lonDeg: number;
  } | null>(null);
  const [previewHeadingDeg, setPreviewHeadingDeg] = useState<number | null>(
    null,
  );
  const allowOrientationRender = useOrientationInvalidationBoundary({
    currentLocationAvailable,
    locationRevision,
    invalidate() {
      stopOrientation();
      setPreviewHeadingDeg(null);
      setPendingLocation(null);
    },
  });

  useEffect(() => {
    if (
      !currentLocationAvailable ||
      orientation.state.status !== "location-mismatch" ||
      pendingLocation !== null
    )
      return;
    const deviceLocation = roundDeviceLocation(
      orientation.state.deviceLocation.latDeg,
      orientation.state.deviceLocation.lonDeg,
    );
    if (deviceLocation === null) return;
    setPendingLocation(deviceLocation);
    adoptDeviceLocation(deviceLocation.latDeg, deviceLocation.lonDeg);
  }, [
    adoptDeviceLocation,
    currentLocationAvailable,
    orientation.state,
    pendingLocation,
  ]);

  useEffect(() => {
    if (pendingLocation === null) return;
    const selectedDeviceLocation = roundDeviceLocation(
      selectedLatDeg,
      selectedLonDeg,
    );
    if (
      selectedDeviceLocation === null ||
      selectedDeviceLocation.latDeg !== pendingLocation.latDeg ||
      selectedDeviceLocation.lonDeg !== pendingLocation.lonDeg
    ) {
      return;
    }
    orientation.acceptDeviceLocation();
    setPendingLocation(null);
  }, [orientation, pendingLocation, selectedLatDeg, selectedLonDeg]);

  const previewState: TrueNorthOrientationState | null =
    previewHeadingDeg === null
      ? null
      : {
          status: "active",
          trueHeadingDeg: previewHeadingDeg,
          displayAzimuthDeg: displayAzimuth(moonAzimuthDeg, previewHeadingDeg),
          turnToMoonDeg: wrap180(moonAzimuthDeg - previewHeadingDeg),
          aligned: Math.abs(wrap180(moonAzimuthDeg - previewHeadingDeg)) <= 3,
          posture: "flat",
          quality: "good",
          headingReference: "true",
        };
  const displayedState: TrueNorthOrientationState = allowOrientationRender
    ? (previewState ?? orientation.state)
    : { status: "idle" };
  const orientationHeadingDeg =
    displayedState.status === "active"
      ? displayedState.trueHeadingDeg
      : undefined;
  const active =
    allowOrientationRender &&
    (sessionIsOpen(orientation.state) || previewState !== null);
  const statusMessage = orientationStatusMessage(
    displayedState,
    moonAltitudeDeg,
  );
  const liveAnnouncement = orientationLiveAnnouncement(
    displayedState,
    moonAltitudeDeg,
  );

  const close = () => {
    orientation.stop();
    setPreviewHeadingDeg(null);
    setPendingLocation(null);
  };

  const controls = (
    <>
      {active ? (
        <button
          type="button"
          aria-pressed="true"
          aria-label="Finish true-north orientation"
          onClick={close}
          className="min-h-10 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-bg hover:brightness-110"
        >
          Done
        </button>
      ) : currentLocationAvailable ? (
        <button
          type="button"
          aria-pressed="false"
          aria-label="Orient the sky path to true north"
          onClick={() => {
            stopAnimation();
            orientation.start();
          }}
          className="min-h-10 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:bg-line"
        >
          Orient
        </button>
      ) : null}
      {import.meta.env?.DEV && shouldShowOrientationPreview(true) ? (
        previewState === null && !sessionIsOpen(orientation.state) ? (
          <button
            type="button"
            aria-label="Preview the orientation instrument"
            onClick={() => {
              stopAnimation();
              setPreviewHeadingDeg(0);
            }}
            className="min-h-10 rounded-full border border-dashed border-gold/50 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-surface-2"
          >
            Preview
          </button>
        ) : null
      ) : null}
    </>
  );

  const status =
    displayedState.status === "idle" ? null : (
      <div className="grid gap-2" data-orientation-status={statusMessage.kind}>
        <div
          className={
            "flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm " +
            (statusMessage.kind === "warning" ||
            statusMessage.kind === "unavailable"
              ? "bg-gold/10 text-fg ring-1 ring-gold/30"
              : "bg-surface-2 text-fg")
          }
        >
          <span>{statusMessage.text}</span>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
          </span>
          {displayedState.status === "unavailable" ? (
            <button
              type="button"
              onClick={close}
              className="min-h-10 rounded-full bg-surface px-3 text-xs font-semibold text-fg"
            >
              Close
            </button>
          ) : null}
        </div>
        {active && selectedTimeNeedsWarning(instant, Date.now()) ? (
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-muted">
            <span>Showing the selected time</span>
            <button
              type="button"
              onClick={() => setInstant(Date.now())}
              className="min-h-10 rounded-full bg-surface px-3 font-semibold text-fg"
            >
              Use current time
            </button>
          </div>
        ) : null}
        {import.meta.env?.DEV && previewHeadingDeg !== null ? (
          <label className="flex min-h-10 items-center gap-3 rounded-lg border border-dashed border-gold/40 px-3 py-2 text-xs text-muted">
            <span className="shrink-0 font-semibold text-gold">
              DEV heading
            </span>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={previewHeadingDeg}
              aria-label="Preview true heading"
              onChange={(event) =>
                setPreviewHeadingDeg(Number(event.target.value))
              }
              className="h-9 min-w-0 flex-1 accent-gold"
            />
            <output className="w-10 text-right text-fg">
              {previewHeadingDeg}°
            </output>
          </label>
        ) : null}
      </div>
    );

  const chart = (
    <>
      <SkyChart
        snapshot={snapshot}
        moonPath={moonPath}
        sunPath={sunPath}
        orientationHeadingDeg={orientationHeadingDeg}
        shareChart={false}
      />
      <div
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <SkyChart
          snapshot={snapshot}
          moonPath={moonPath}
          sunPath={sunPath}
          orientationHeadingDeg={canonicalShareHeading(orientationHeadingDeg)}
        />
      </div>
    </>
  );

  return children({ controls, status, chart, orientationActive: active });
}
