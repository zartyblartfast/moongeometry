import { createElement, useLayoutEffect, useRef } from "react";
import type {
  TrueNorthOrientationState,
  TrueNorthUnavailableReason,
} from "../lib/use-true-north-orientation.ts";

export type OrientationStatusKind =
  "idle" | "progress" | "mismatch" | "guidance" | "warning" | "unavailable";

export interface OrientationStatusMessage {
  kind: OrientationStatusKind;
  text: string;
}

const UNAVAILABLE_COPY: Record<TrueNorthUnavailableReason, string> = {
  "insecure-context": "Orientation needs a secure connection.",
  "location-denied": "Location access was denied.",
  "location-unavailable": "Your current location is unavailable.",
  "orientation-denied": "Direction access was denied.",
  "no-heading-source": "This device does not provide a usable compass heading.",
  "unknown-heading-reference":
    "This browser cannot identify true north reliably.",
  "model-expired": "True-north correction is unavailable for today.",
  "polar-location":
    "True-north orientation is unavailable at the geographic poles.",
};

export function orientationStatusMessage(
  state: TrueNorthOrientationState,
  moonAltitudeDeg: number,
): OrientationStatusMessage {
  switch (state.status) {
    case "idle":
      return { kind: "idle", text: "" };
    case "requesting":
      return { kind: "progress", text: "Finding your direction…" };
    case "location-mismatch":
      return {
        kind: "progress",
        text: "Updating current location…",
      };
    case "acquiring-heading":
      return { kind: "progress", text: "Finding true north…" };
    case "unavailable":
      return { kind: "unavailable", text: UNAVAILABLE_COPY[state.reason] };
    case "active":
      if (state.posture !== "flat")
        return { kind: "guidance", text: "Hold phone flat" };
      if (state.quality === "unknown")
        return {
          kind: "guidance",
          text: "Hold steady while direction settles",
        };
      if (state.quality === "limited")
        return {
          kind: "warning",
          text: "Direction may be inaccurate — move away from metal",
        };
      if (moonAltitudeDeg < 0)
        return {
          kind: "guidance",
          text: "Moon is below the horizon in this direction",
        };
      if (state.aligned)
        return { kind: "guidance", text: "Aligned with Moon azimuth" };
      return {
        kind: "guidance",
        text: `Turn ${Math.round(Math.abs(state.turnToMoonDeg))}° ${
          state.turnToMoonDeg < 0 ? "left" : "right"
        }`,
      };
  }
}

export function orientationLiveAnnouncement(
  state: TrueNorthOrientationState,
  moonAltitudeDeg: number,
): string {
  const visualMessage = orientationStatusMessage(state, moonAltitudeDeg);
  if (
    state.status !== "active" ||
    state.posture !== "flat" ||
    state.quality !== "good" ||
    moonAltitudeDeg < 0 ||
    state.aligned
  ) {
    return visualMessage.text;
  }
  const direction = state.turnToMoonDeg < 0 ? "left" : "right";
  const magnitude = Math.abs(state.turnToMoonDeg);
  if (magnitude <= 10) return `Turn slightly ${direction}`;
  const bucketDeg = Math.ceil(magnitude / 15) * 15;
  return `Turn ${bucketDeg}° ${direction}`;
}

export function selectedTimeNeedsWarning(
  selectedInstant: number,
  now: number,
): boolean {
  return Math.abs(selectedInstant - now) > 10 * 60_000;
}

export function canonicalShareHeading(
  _orientationHeadingDeg: number | undefined,
): undefined {
  return undefined;
}

export function shouldShowOrientationPreview(isDevelopment: boolean): boolean {
  return isDevelopment;
}

export function orientationAvailabilityTransition(
  wasAvailable: boolean,
  isAvailable: boolean,
  previousLocationRevision: number,
  locationRevision: number,
): { stop: boolean } {
  return {
    stop:
      (wasAvailable && !isAvailable) ||
      previousLocationRevision !== locationRevision,
  };
}

export function useOrientationInvalidationBoundary({
  currentLocationAvailable,
  locationRevision,
  invalidate,
}: {
  currentLocationAvailable: boolean;
  locationRevision: number;
  invalidate(): void;
}): boolean {
  const previousAvailabilityRef = useRef(currentLocationAvailable);
  const previousLocationRevisionRef = useRef(locationRevision);
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;
  const transition = orientationAvailabilityTransition(
    previousAvailabilityRef.current,
    currentLocationAvailable,
    previousLocationRevisionRef.current,
    locationRevision,
  );

  useLayoutEffect(() => {
    previousAvailabilityRef.current = currentLocationAvailable;
    previousLocationRevisionRef.current = locationRevision;
    if (transition.stop) invalidateRef.current();
  }, [currentLocationAvailable, locationRevision, transition.stop]);

  return !transition.stop;
}

export function OrientationStatusText({
  state,
  moonAltitudeDeg,
  onClose = () => undefined,
}: {
  state: TrueNorthOrientationState;
  moonAltitudeDeg: number;
  onClose?: () => void;
}) {
  const message = orientationStatusMessage(state, moonAltitudeDeg);
  const announcement = orientationLiveAnnouncement(state, moonAltitudeDeg);
  return createElement(
    "div",
    null,
    createElement("span", null, message.text),
    createElement(
      "span",
      { className: "sr-only", "aria-live": "polite", "aria-atomic": "true" },
      announcement,
    ),
    state.status === "unavailable"
      ? createElement("button", { type: "button", onClick: onClose }, "Close")
      : null,
  );
}
