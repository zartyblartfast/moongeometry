import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import {
  formatCivilTime,
  lookupTimeZone,
  type CivilTimeInfo,
} from "./civil-time.ts";

export type CivilTimeState =
  | { status: "loading" }
  | { status: "ready"; value: CivilTimeInfo; refreshingCoordinates: boolean }
  | { status: "unavailable" };

export type CivilTimeControllerState = {
  latestRequestId: number;
  status: "loading" | "ready" | "unavailable";
  timeZoneId: string | null;
  refreshingCoordinates: boolean;
};

export type CivilTimeControllerAction =
  | { type: "coordinates-requested"; requestId: number }
  | { type: "lookup-succeeded"; requestId: number; timeZoneId: string }
  | { type: "lookup-failed"; requestId: number };

export function createCivilTimeControllerState(): CivilTimeControllerState {
  return {
    latestRequestId: 0,
    status: "loading",
    timeZoneId: null,
    refreshingCoordinates: false,
  };
}

export function reduceCivilTimeController(
  state: CivilTimeControllerState,
  action: CivilTimeControllerAction,
): CivilTimeControllerState {
  if (action.type === "coordinates-requested") {
    const retainingResolvedZone = state.timeZoneId !== null;
    return {
      latestRequestId: action.requestId,
      status: retainingResolvedZone ? "ready" : "loading",
      timeZoneId: state.timeZoneId,
      refreshingCoordinates: retainingResolvedZone,
    };
  }

  if (action.requestId !== state.latestRequestId) return state;

  if (action.type === "lookup-succeeded") {
    return {
      latestRequestId: state.latestRequestId,
      status: "ready",
      timeZoneId: action.timeZoneId,
      refreshingCoordinates: false,
    };
  }

  return {
    latestRequestId: state.latestRequestId,
    status: "unavailable",
    timeZoneId: null,
    refreshingCoordinates: false,
  };
}

export function selectCivilTimeState(
  state: CivilTimeControllerState,
  instant: number,
): CivilTimeState {
  if (state.status === "loading") return { status: "loading" };
  if (state.status === "unavailable" || state.timeZoneId === null) {
    return { status: "unavailable" };
  }

  const value = formatCivilTime(instant, state.timeZoneId);
  if (value === null) return { status: "unavailable" };

  return {
    status: "ready",
    value,
    refreshingCoordinates: state.refreshingCoordinates,
  };
}

export type TimeZoneLookup = (latDeg: number, lonDeg: number) => Promise<string | null>;

const useCoordinateCommitEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function createUseCivilTime(timeZoneLookup: TimeZoneLookup) {
  return function useCivilTimeWithLookup(
    instant: number,
    latDeg: number,
    lonDeg: number,
  ): CivilTimeState {
    const [controller, dispatch] = useReducer(
      reduceCivilTimeController,
      undefined,
      createCivilTimeControllerState,
    );
    const nextRequestId = useRef(0);
    const committedRequestId = useRef(0);
    const activeLookup = useRef<{ requestId: number; cancelled: boolean } | null>(null);

    useCoordinateCommitEffect(() => {
      if (activeLookup.current !== null) activeLookup.current.cancelled = true;

      const requestId = ++nextRequestId.current;
      committedRequestId.current = requestId;
      dispatch({ type: "coordinates-requested", requestId });

      return () => {
        if (activeLookup.current?.requestId === requestId) {
          activeLookup.current.cancelled = true;
        }
      };
    }, [latDeg, lonDeg]);

    useEffect(() => {
      const requestId = committedRequestId.current;
      const lookup = { requestId, cancelled: false };
      activeLookup.current = lookup;

      void timeZoneLookup(latDeg, lonDeg).then((timeZoneId) => {
        if (lookup.cancelled) return;

        if (timeZoneId === null) {
          dispatch({ type: "lookup-failed", requestId });
        } else {
          dispatch({ type: "lookup-succeeded", requestId, timeZoneId });
        }
      });

      return () => {
        lookup.cancelled = true;
        if (activeLookup.current === lookup) activeLookup.current = null;
      };
    }, [latDeg, lonDeg]);

    return useMemo(() => selectCivilTimeState(controller, instant), [controller, instant]);
  };
}

export const useCivilTime = createUseCivilTime(lookupTimeZone);
