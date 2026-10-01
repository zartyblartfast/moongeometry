import { create } from "zustand";

export type Play = "none" | "spin" | "slide";
export type Snap = "oblique" | "edge" | "north";

type MoonState = {
  instant: number;
  orbit: number;
  lat: number;
  lon: number;
  playing: Play;
  spinHours: number;
  snap: Snap;
  snapTick: number;
  setInstant: (instant: number) => void;
  setLat: (lat: number) => void;
  setLon: (lon: number) => void;
  setPlaying: (playing: Play) => void;
  setSpinHours: (spinHours: number) => void;
  setSnap: (snap: Snap) => void;
};

const WINTER_EVENING = Date.UTC(2026, 11, 21, 21, 0, 0);

export const useMoon = create<MoonState>((set) => ({
  instant: WINTER_EVENING,
  orbit: WINTER_EVENING,
  lat: 51.5,
  lon: 0,
  playing: "none",
  spinHours: 2,
  snap: "oblique",
  snapTick: 0,
  setInstant: (instant) => set({ instant, orbit: instant, playing: "none" }),
  setLat: (lat) => set({ lat }),
  setLon: (lon) => set({ lon }),
  setPlaying: (playing) => set({ playing }),
  setSpinHours: (spinHours) => set({ spinHours: Math.min(24 * 30, Math.max(0.5, spinHours)) }),
  setSnap: (snap) => set((s) => ({ snap, snapTick: s.snapTick + 1 })),
}));
