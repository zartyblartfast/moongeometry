import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { geomagneticDeclination } from "./geomagnetic-declination.ts";
import { roundDeviceLocation } from "./viewing-location.ts";
import {
  deviceLocationMatchesSelected,
  displayAzimuth,
  isAlignedWithHysteresis,
  magneticToTrueHeading,
  normalize360,
  smoothCircularHeading,
  wrap180,
} from "./true-north-orientation.ts";

export type HeadingReference = "magnetic" | "true" | "unknown";

export interface HeadingSample {
  headingDeg: number;
  reference: HeadingReference;
  accuracyDeg?: number;
  measuredAt?: Date;
  betaDeg?: number | null;
  gammaDeg?: number | null;
  /** Clockwise display angle, or zero when the injected heading is already display-adjusted. */
  screenAngleDeg?: number;
}

export type TrueNorthUnavailableReason =
  | "insecure-context"
  | "location-denied"
  | "location-unavailable"
  | "orientation-denied"
  | "no-heading-source"
  | "unknown-heading-reference"
  | "model-expired"
  | "polar-location";

export type TrueNorthOrientationState =
  | { status: "idle" }
  | { status: "requesting" }
  | {
      status: "location-mismatch";
      deviceLocation: { latDeg: number; lonDeg: number };
    }
  | { status: "acquiring-heading" }
  | {
      status: "active";
      trueHeadingDeg: number;
      displayAzimuthDeg: number;
      turnToMoonDeg: number;
      aligned: boolean;
      posture: "flat" | "tilted" | "unknown";
      quality: "good" | "limited" | "unknown";
      headingReference: "magnetic" | "true";
    }
  | { status: "unavailable"; reason: TrueNorthUnavailableReason };

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

export interface DevicePositionError {
  code: number;
}

export interface TrueNorthOrientationDependencies {
  isSecureContext(): boolean;
  requestOrientationPermission: (() => Promise<"granted" | "denied">) | null;
  getCurrentPosition(
    success: (position: DevicePosition) => void,
    error: (error: DevicePositionError) => void,
    options: PositionOptions,
  ): void;
  addHeadingListener(listener: (sample: HeadingSample) => void): () => void;
  addVisibilityListener(listener: () => void): () => void;
  addScreenOrientationListener(listener: () => void): () => void;
  isDocumentVisible(): boolean;
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(id: number): void;
  now(): Date;
  geomagneticDeclination: typeof geomagneticDeclination;
}

export interface TrueNorthOrientationOptions {
  selectedLatDeg: number;
  selectedLonDeg: number;
  moonTrueAzimuthDeg: number;
}

export interface TrueNorthOrientationController {
  getState(): TrueNorthOrientationState;
  /**
   * Heading samples publish synchronously. Keep subscriptions near the small UI
   * surface that renders live orientation rather than lifting this state broadly.
   */
  subscribe(listener: () => void): () => void;
  updateOptions(options: TrueNorthOrientationOptions): void;
  start(): void;
  stop(): void;
  acceptDeviceLocation(): void;
}

const HEADING_TIMEOUT_MS = 5_000;
const HEADING_SMOOTHING_FACTOR = 0.25;
const FLAT_POSTURE_LIMIT_DEG = 30;
/** Browser compass samples at or below this uncertainty can support strong alignment. */
const GOOD_HEADING_ACCURACY_LIMIT_DEG = 20;
/** Require several recent readings before treating a compass heading as trustworthy. */
const HEADING_STABILITY_SAMPLE_COUNT = 4;
/** Maximum circular deviation from the window mean allowed for strong alignment. */
const HEADING_STABILITY_MAX_DEVIATION_DEG = 5;

/**
 * Converts a heading referenced to the device's natural top edge to the page's
 * currently displayed top edge using a supplied clockwise screen angle.
 *
 * Not every heading source uses the natural top edge. Callers with an already
 * display-adjusted heading must supply zero. The physical sign of browser sensor
 * compensation remains part of real-device verification.
 */
export function naturalTopHeadingToDisplayedPageTop(
  headingDeg: number,
  screenAngleDeg: number,
): number {
  return normalize360(headingDeg + screenAngleDeg);
}

function postureFromHeadingSample(
  sample: HeadingSample,
): "flat" | "tilted" | "unknown" {
  if (
    sample.betaDeg == null ||
    sample.gammaDeg == null ||
    !Number.isFinite(sample.betaDeg) ||
    !Number.isFinite(sample.gammaDeg)
  )
    return "unknown";
  return Math.abs(sample.betaDeg) <= FLAT_POSTURE_LIMIT_DEG &&
    Math.abs(sample.gammaDeg) <= FLAT_POSTURE_LIMIT_DEG
    ? "flat"
    : "tilted";
}

function qualityFromHeadingSample(
  sample: HeadingSample,
  stabilityHeadingsDeg: readonly number[],
): "good" | "limited" | "unknown" {
  if (
    sample.accuracyDeg === undefined ||
    !Number.isFinite(sample.accuracyDeg) ||
    sample.accuracyDeg < 0
  )
    return "unknown";
  if (sample.accuracyDeg > GOOD_HEADING_ACCURACY_LIMIT_DEG) return "limited";
  if (stabilityHeadingsDeg.length < HEADING_STABILITY_SAMPLE_COUNT)
    return "unknown";
  const sum = stabilityHeadingsDeg.reduce(
    (components, headingDeg) => {
      const radians = (headingDeg * Math.PI) / 180;
      components.sin += Math.sin(radians);
      components.cos += Math.cos(radians);
      return components;
    },
    { sin: 0, cos: 0 },
  );
  const meanHeadingDeg = (Math.atan2(sum.sin, sum.cos) * 180) / Math.PI;
  const stable = stabilityHeadingsDeg.every(
    (headingDeg) =>
      Math.abs(wrap180(headingDeg - meanHeadingDeg)) <=
      HEADING_STABILITY_MAX_DEVIATION_DEG,
  );
  return stable ? "good" : "limited";
}

function utcDayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

function reduceDevicePosition(position: DevicePosition): DevicePosition | null {
  const roundedLocation = roundDeviceLocation(
    position.latitude,
    position.longitude,
  );
  if (
    roundedLocation === null ||
    !Number.isFinite(position.accuracy) ||
    position.accuracy < 0
  )
    return null;
  return {
    latitude: roundedLocation.latDeg,
    longitude: roundedLocation.lonDeg,
    accuracy: Math.ceil(position.accuracy),
    altitude:
      position.altitude !== null && Number.isFinite(position.altitude)
        ? Math.round(position.altitude / 10) * 10
        : null,
  };
}

export function createTrueNorthOrientationController(
  initialOptions: TrueNorthOrientationOptions,
  dependencies: TrueNorthOrientationDependencies,
): TrueNorthOrientationController {
  let options = initialOptions;
  let state: TrueNorthOrientationState = { status: "idle" };
  let generation = 0;
  let headingGeneration = 0;
  let devicePosition: DevicePosition | null = null;
  let permissionGranted = dependencies.requestOrientationPermission === null;
  let locationAccepted = false;
  let declinationCache: {
    utcDayKey: string;
    result: ReturnType<typeof geomagneticDeclination>;
  } | null = null;
  let smoothedHeadingDeg: number | null = null;
  let stabilityHeadingsDeg: number[] = [];
  let wasAligned = false;
  let removeHeadingListener: (() => void) | null = null;
  let removeVisibilityListener: (() => void) | null = null;
  let removeScreenOrientationListener: (() => void) | null = null;
  let headingTimer: number | null = null;
  const subscribers = new Set<() => void>();

  function publish(nextState: TrueNorthOrientationState): void {
    state = nextState;
    for (const subscriber of subscribers) subscriber();
  }

  function clearHeadingAcquisition(): void {
    headingGeneration += 1;
    removeHeadingListener?.();
    removeHeadingListener = null;
    if (headingTimer !== null) dependencies.clearTimeout(headingTimer);
    headingTimer = null;
    stabilityHeadingsDeg = [];
  }

  function clearRunResources(): void {
    clearHeadingAcquisition();
    removeVisibilityListener?.();
    removeVisibilityListener = null;
    removeScreenOrientationListener?.();
    removeScreenOrientationListener = null;
    devicePosition = null;
    permissionGranted = dependencies.requestOrientationPermission === null;
    locationAccepted = false;
    declinationCache = null;
    smoothedHeadingDeg = null;
    wasAligned = false;
  }

  function fail(reason: TrueNorthUnavailableReason): void {
    generation += 1;
    clearRunResources();
    publish({ status: "unavailable", reason });
  }

  function handleHeading(
    sample: HeadingSample,
    runGeneration: number,
    sessionGeneration: number,
  ): void {
    if (
      runGeneration !== generation ||
      sessionGeneration !== headingGeneration ||
      devicePosition === null
    )
      return;
    if (!Number.isFinite(sample.headingDeg)) return;
    if (sample.reference === "unknown") {
      fail("unknown-heading-reference");
      return;
    }

    const screenAdjustedHeading = naturalTopHeadingToDisplayedPageTop(
      sample.headingDeg,
      sample.screenAngleDeg ?? 0,
    );
    let trueHeadingDeg: number;
    if (sample.reference === "magnetic") {
      const measuredAt = sample.measuredAt ?? dependencies.now();
      const measurementDay = utcDayKey(measuredAt);
      const result =
        declinationCache?.utcDayKey === measurementDay
          ? declinationCache.result
          : dependencies.geomagneticDeclination(
              devicePosition.latitude,
              devicePosition.longitude,
              devicePosition.altitude,
              measuredAt,
            );
      declinationCache = { utcDayKey: measurementDay, result };
      if (!result.valid) {
        fail("model-expired");
        return;
      }
      trueHeadingDeg = magneticToTrueHeading(
        screenAdjustedHeading,
        result.declinationDeg,
      );
    } else {
      trueHeadingDeg = screenAdjustedHeading;
    }

    armHeadingTimeout(runGeneration, sessionGeneration);
    smoothedHeadingDeg = smoothCircularHeading(
      smoothedHeadingDeg,
      trueHeadingDeg,
      HEADING_SMOOTHING_FACTOR,
    );
    stabilityHeadingsDeg.push(trueHeadingDeg);
    if (stabilityHeadingsDeg.length > HEADING_STABILITY_SAMPLE_COUNT)
      stabilityHeadingsDeg.shift();
    const posture = postureFromHeadingSample(sample);
    const quality = qualityFromHeadingSample(sample, stabilityHeadingsDeg);
    const turnToMoonDeg = wrap180(
      options.moonTrueAzimuthDeg - smoothedHeadingDeg,
    );
    const aligned =
      posture === "flat" &&
      quality === "good" &&
      isAlignedWithHysteresis(turnToMoonDeg, wasAligned);
    wasAligned = aligned;
    publish({
      status: "active",
      trueHeadingDeg: smoothedHeadingDeg,
      displayAzimuthDeg: displayAzimuth(
        options.moonTrueAzimuthDeg,
        smoothedHeadingDeg,
      ),
      turnToMoonDeg,
      aligned,
      posture,
      quality,
      headingReference: sample.reference,
    });
  }

  function armHeadingTimeout(
    runGeneration: number,
    sessionGeneration: number,
  ): void {
    if (headingTimer !== null) dependencies.clearTimeout(headingTimer);
    const timerId = dependencies.setTimeout(() => {
      if (
        runGeneration !== generation ||
        sessionGeneration !== headingGeneration ||
        headingTimer !== timerId
      )
        return;
      headingTimer = null;
      fail("no-heading-source");
    }, HEADING_TIMEOUT_MS);
    headingTimer = timerId;
  }

  function acquireHeading(runGeneration: number): void {
    if (runGeneration !== generation || devicePosition === null) return;
    clearHeadingAcquisition();
    const sessionGeneration = headingGeneration;
    smoothedHeadingDeg = null;
    wasAligned = false;
    publish({ status: "acquiring-heading" });
    if (!dependencies.isDocumentVisible()) return;

    removeHeadingListener = dependencies.addHeadingListener((sample) => {
      handleHeading(sample, runGeneration, sessionGeneration);
    });
    armHeadingTimeout(runGeneration, sessionGeneration);
  }

  function proceedAfterPrerequisites(runGeneration: number): void {
    if (
      runGeneration !== generation ||
      !permissionGranted ||
      devicePosition === null
    )
      return;
    if (Math.abs(devicePosition.latitude) === 90) {
      fail("polar-location");
      return;
    }
    const deviceLocation = roundDeviceLocation(
      devicePosition.latitude,
      devicePosition.longitude,
    );
    if (deviceLocation === null) {
      fail("location-unavailable");
      return;
    }

    if (!locationAccepted) {
      if (
        !deviceLocationMatchesSelected(
          devicePosition.latitude,
          devicePosition.longitude,
          devicePosition.accuracy,
          options.selectedLatDeg,
          options.selectedLonDeg,
        )
      ) {
        publish({
          status: "location-mismatch",
          deviceLocation,
        });
        return;
      }
      locationAccepted = true;
    }

    acquireHeading(runGeneration);
  }

  const controller: TrueNorthOrientationController = {
    getState: () => state,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    updateOptions(nextOptions) {
      const coordinatesChanged =
        options.selectedLatDeg !== nextOptions.selectedLatDeg ||
        options.selectedLonDeg !== nextOptions.selectedLonDeg;
      options = nextOptions;
      if (
        devicePosition !== null &&
        (state.status === "requesting" ||
          state.status === "location-mismatch" ||
          state.status === "acquiring-heading" ||
          state.status === "active")
      ) {
        const locationMatches = deviceLocationMatchesSelected(
          devicePosition.latitude,
          devicePosition.longitude,
          devicePosition.accuracy,
          options.selectedLatDeg,
          options.selectedLonDeg,
        );
        if (!locationMatches) {
          const deviceLocation = roundDeviceLocation(
            devicePosition.latitude,
            devicePosition.longitude,
          );
          if (deviceLocation === null) {
            fail("location-unavailable");
            return;
          }
          locationAccepted = false;
          clearHeadingAcquisition();
          smoothedHeadingDeg = null;
          wasAligned = false;
          publish({
            status: "location-mismatch",
            deviceLocation,
          });
          return;
        }
        locationAccepted = true;
        if (
          coordinatesChanged &&
          permissionGranted &&
          state.status === "location-mismatch"
        ) {
          acquireHeading(generation);
          return;
        }
      }
      if (state.status !== "active") return;
      const turnToMoonDeg = wrap180(
        options.moonTrueAzimuthDeg - state.trueHeadingDeg,
      );
      const aligned =
        state.posture === "flat" &&
        state.quality === "good" &&
        isAlignedWithHysteresis(turnToMoonDeg, state.aligned);
      wasAligned = aligned;
      publish({
        ...state,
        displayAzimuthDeg: displayAzimuth(
          options.moonTrueAzimuthDeg,
          state.trueHeadingDeg,
        ),
        turnToMoonDeg,
        aligned,
      });
    },
    start() {
      const runGeneration = ++generation;
      clearRunResources();

      if (!dependencies.isSecureContext()) {
        fail("insecure-context");
        return;
      }

      publish({ status: "requesting" });
      removeVisibilityListener = dependencies.addVisibilityListener(() => {
        if (runGeneration !== generation) return;
        if (!dependencies.isDocumentVisible()) {
          clearHeadingAcquisition();
          if (devicePosition !== null && permissionGranted && locationAccepted) {
            publish({ status: "acquiring-heading" });
          }
          return;
        }
        if (devicePosition !== null && permissionGranted && locationAccepted) {
          acquireHeading(runGeneration);
        }
      });
      removeScreenOrientationListener =
        dependencies.addScreenOrientationListener(() => {
          if (
            runGeneration !== generation ||
            devicePosition === null ||
            !permissionGranted ||
            !locationAccepted ||
            (state.status !== "active" && state.status !== "acquiring-heading")
          )
            return;
          acquireHeading(runGeneration);
        });

      let permissionPromise: Promise<"granted" | "denied"> | null = null;
      try {
        permissionPromise =
          dependencies.requestOrientationPermission?.() ?? null;
      } catch {
        fail("orientation-denied");
        return;
      }

      try {
        dependencies.getCurrentPosition(
          (position) => {
            if (runGeneration !== generation) return;
            devicePosition = reduceDevicePosition(position);
            if (devicePosition === null) {
              fail("location-unavailable");
              return;
            }
            proceedAfterPrerequisites(runGeneration);
          },
          (error) => {
            if (runGeneration !== generation) return;
            fail(error.code === 1 ? "location-denied" : "location-unavailable");
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      } catch {
        fail("location-unavailable");
      }

      if (permissionPromise !== null) {
        void permissionPromise.then(
          (result) => {
            if (runGeneration !== generation) return;
            if (result !== "granted") {
              fail("orientation-denied");
              return;
            }
            permissionGranted = true;
            proceedAfterPrerequisites(runGeneration);
          },
          () => {
            if (runGeneration !== generation) return;
            fail("orientation-denied");
          },
        );
      }
    },
    stop() {
      generation += 1;
      clearRunResources();
      publish({ status: "idle" });
    },
    acceptDeviceLocation() {
      if (state.status !== "location-mismatch" || devicePosition === null) return;
      proceedAfterPrerequisites(generation);
    },
  };

  return controller;
}

interface DeviceOrientationPermissionConstructor {
  requestPermission?: (
    absolute?: boolean,
  ) => Promise<"granted" | "denied">;
};

interface BrowserOrientationEvent {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

export function orientationPermissionRequestFromConstructor(
  constructor: DeviceOrientationPermissionConstructor,
): (() => Promise<"granted" | "denied">) | null {
  return constructor.requestPermission
    ? () => constructor.requestPermission!(true)
    : null;
}

export function headingSampleFromDeviceOrientation(
  event: BrowserOrientationEvent,
  screenAngleDeg: number,
  measuredAt: Date,
): HeadingSample | null {
  const webkitCompassHeading = event.webkitCompassHeading;
  // WebKit compass headings use the half-open [0, 360) range; 360 is rejected.
  if (
    typeof webkitCompassHeading === "number" &&
    Number.isFinite(webkitCompassHeading) &&
    webkitCompassHeading >= 0 &&
    webkitCompassHeading < 360
  ) {
    const webkitCompassAccuracy = event.webkitCompassAccuracy;
    return {
      headingDeg: webkitCompassHeading,
      reference: "magnetic",
      measuredAt,
      betaDeg: event.beta,
      gammaDeg: event.gamma,
      ...(typeof webkitCompassAccuracy === "number" &&
      Number.isFinite(webkitCompassAccuracy) &&
      webkitCompassAccuracy >= 0
        ? { accuracyDeg: webkitCompassAccuracy }
        : {}),
      screenAngleDeg,
    };
  }
  if (typeof event.alpha !== "number" || !Number.isFinite(event.alpha))
    return null;
  return {
    headingDeg:
      event.absolute === true ? normalize360(360 - event.alpha) : event.alpha,
    reference: event.absolute === true ? "magnetic" : "unknown",
    measuredAt,
    betaDeg: event.beta,
    gammaDeg: event.gamma,
    screenAngleDeg,
  };
}

function currentScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const orientationAngle = window.screen?.orientation?.angle;
  if (typeof orientationAngle === "number") return orientationAngle;
  const legacyAngle = window.orientation;
  return typeof legacyAngle === "number" ? legacyAngle : 0;
}

export const browserTrueNorthOrientationDependencies: TrueNorthOrientationDependencies =
  {
    isSecureContext: () =>
      typeof window !== "undefined" && window.isSecureContext,
    requestOrientationPermission:
      typeof window !== "undefined" && "DeviceOrientationEvent" in window
        ? (() => {
            const constructor =
              window.DeviceOrientationEvent as DeviceOrientationPermissionConstructor;
            return orientationPermissionRequestFromConstructor(constructor);
          })()
        : null,
    getCurrentPosition(success, error, options) {
      if (
        typeof navigator === "undefined" ||
        navigator.geolocation === undefined
      ) {
        error({ code: 2 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          success({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
          }),
        (geolocationError) => error({ code: geolocationError.code }),
        options,
      );
    },
    addHeadingListener(listener) {
      if (typeof window === "undefined") return () => undefined;
      const emitDefensibleSample = (
        event: DeviceOrientationEvent,
        forceAbsolute: boolean,
      ): void => {
        const sample = headingSampleFromDeviceOrientation(
          {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: forceAbsolute || event.absolute,
            ...("webkitCompassHeading" in event
              ? {
                  webkitCompassHeading: (
                    event as BrowserOrientationEvent
                  ).webkitCompassHeading,
                  webkitCompassAccuracy: (
                    event as BrowserOrientationEvent
                  ).webkitCompassAccuracy,
                }
              : {}),
          },
          currentScreenAngle(),
          new Date(),
        );
        if (sample !== null && sample.reference !== "unknown") listener(sample);
      };
      const handleOrientation = (event: DeviceOrientationEvent): void =>
        emitDefensibleSample(event, false);
      const handleAbsoluteOrientation = (event: DeviceOrientationEvent): void =>
        emitDefensibleSample(event, true);
      window.addEventListener("deviceorientation", handleOrientation);
      window.addEventListener(
        "deviceorientationabsolute",
        handleAbsoluteOrientation,
      );
      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
        window.removeEventListener(
          "deviceorientationabsolute",
          handleAbsoluteOrientation,
        );
      };
    },
    addVisibilityListener(listener) {
      if (typeof document === "undefined") return () => undefined;
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
    addScreenOrientationListener(listener) {
      if (typeof window === "undefined") return () => undefined;
      const screenOrientation = window.screen?.orientation;
      if (screenOrientation?.addEventListener) {
        screenOrientation.addEventListener("change", listener);
        return () => screenOrientation.removeEventListener("change", listener);
      }
      window.addEventListener("orientationchange", listener);
      return () => window.removeEventListener("orientationchange", listener);
    },
    isDocumentVisible: () =>
      typeof document === "undefined" || document.visibilityState !== "hidden",
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (id) => window.clearTimeout(id),
    now: () => new Date(),
    geomagneticDeclination,
  };

export interface UseTrueNorthOrientationResult {
  state: TrueNorthOrientationState;
  start(): void;
  stop(): void;
  acceptDeviceLocation(): void;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function createUseTrueNorthOrientation(
  dependencies: TrueNorthOrientationDependencies,
) {
  return function useTrueNorthOrientationWithDependencies(
    options: TrueNorthOrientationOptions,
  ): UseTrueNorthOrientationResult {
    const controllerRef = useRef<TrueNorthOrientationController | null>(null);
    if (controllerRef.current === null) {
      controllerRef.current = createTrueNorthOrientationController(
        options,
        dependencies,
      );
    }
    const controller = controllerRef.current;
    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState,
    );

    useCommitEffect(() => {
      controller.updateOptions(options);
    }, [
      controller,
      options.selectedLatDeg,
      options.selectedLonDeg,
      options.moonTrueAzimuthDeg,
    ]);

    useEffect(() => () => controller.stop(), [controller]);

    return {
      state,
      start: controller.start,
      stop: controller.stop,
      acceptDeviceLocation: controller.acceptDeviceLocation,
    };
  };
}

export const useTrueNorthOrientation = createUseTrueNorthOrientation(
  browserTrueNorthOrientationDependencies,
);
