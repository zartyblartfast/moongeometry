import { useEffect, useMemo, useReducer, useRef } from "react";
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
      status: retainingResolvedZone ? "ready" : state.status,
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

export function useCivilTime(instant: number, latDeg: number, lonDeg: number): CivilTimeState {
  const [controller, dispatch] = useReducer(
    reduceCivilTimeController,
    undefined,
    createCivilTimeControllerState,
  );
  const nextRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++nextRequestId.current;
    dispatch({ type: "coordinates-requested", requestId });

    void lookupTimeZone(latDeg, lonDeg).then((timeZoneId) => {
      if (timeZoneId === null) {
        dispatch({ type: "lookup-failed", requestId });
      } else {
        dispatch({ type: "lookup-succeeded", requestId, timeZoneId });
      }
    });
  }, [latDeg, lonDeg]);

  return useMemo(() => selectCivilTimeState(controller, instant), [controller, instant]);
}
