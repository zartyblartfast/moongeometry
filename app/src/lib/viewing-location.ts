export type ViewingLocationSourceState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "current-device" }
  | {
      status: "unavailable";
      reason: "denied" | "unavailable" | "insecure-context";
    };

export const initialViewingLocationSource: ViewingLocationSourceState = {
  status: "idle",
};

export type DeviceLocation = { latDeg: number; lonDeg: number };

function privacyRoundedCoordinate(value: number): number {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function roundDeviceLocation(
  latDeg: number,
  lonDeg: number,
): DeviceLocation | null {
  if (
    !Number.isFinite(latDeg) ||
    !Number.isFinite(lonDeg) ||
    latDeg < -90 ||
    latDeg > 90 ||
    lonDeg < -180 ||
    lonDeg > 180
  ) {
    return null;
  }
  return {
    latDeg: privacyRoundedCoordinate(latDeg),
    lonDeg: privacyRoundedCoordinate(lonDeg),
  };
}

type ViewingLocationSourceEvent =
  | { type: "request" }
  | { type: "success" }
  | {
      type: "failure";
      reason: "denied" | "unavailable" | "insecure-context";
    }
  | { type: "external-change"; change: "search" | "manual" };

export function transitionViewingLocationSource(
  _state: ViewingLocationSourceState,
  event: ViewingLocationSourceEvent,
): { state: ViewingLocationSourceState; stopOrientation: boolean } {
  switch (event.type) {
    case "request":
      return { state: { status: "requesting" }, stopOrientation: false };
    case "success":
      return { state: { status: "current-device" }, stopOrientation: true };
    case "failure":
      return {
        state: { status: "unavailable", reason: event.reason },
        stopOrientation: false,
      };
    case "external-change":
      return { state: { status: "idle" }, stopOrientation: true };
  }
}

type PositionResult =
  | {
      ok: true;
      location: { latDeg: number; lonDeg: number };
    }
  | {
      ok: false;
      reason: "denied" | "unavailable" | "insecure-context";
    };

type CurrentPositionReader = (
  success: (position: { latitude: number; longitude: number }) => void,
  error: (error: { code: number }) => void,
  options: PositionOptions,
) => void;

export async function requestCurrentDevicePosition(dependencies: {
  isSecureContext(): boolean;
  getCurrentPosition: CurrentPositionReader | null;
}): Promise<PositionResult> {
  if (!dependencies.isSecureContext())
    return { ok: false, reason: "insecure-context" };
  if (dependencies.getCurrentPosition === null)
    return { ok: false, reason: "unavailable" };

  return new Promise((resolve) => {
    try {
      dependencies.getCurrentPosition!(
        (position) => {
          const location = roundDeviceLocation(
            position.latitude,
            position.longitude,
          );
          resolve(
            location === null
              ? { ok: false, reason: "unavailable" }
              : { ok: true, location },
          );
        },
        (error) =>
          resolve({
            ok: false,
            reason: error.code === 1 ? "denied" : "unavailable",
          }),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    } catch {
      resolve({ ok: false, reason: "unavailable" });
    }
  });
}

export function currentDeviceLocationAvailable(
  state: ViewingLocationSourceState,
): boolean {
  return state.status === "current-device";
}

export function currentDeviceLocationMessage(
  state: ViewingLocationSourceState,
): string {
  if (state.status !== "unavailable") return "";
  if (state.reason === "denied") return "Location access was denied.";
  if (state.reason === "insecure-context")
    return "Current location needs a secure connection.";
  return "Current location is unavailable on this device.";
}
