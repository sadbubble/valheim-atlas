import { create } from 'zustand';

export type CameraRequest =
  | { id: number; kind: 'focus'; x: number; z: number; distanceM: number | null }
  | { id: number; kind: 'overview' };

interface CameraState {
  request: CameraRequest | null;
  /** Smoothly move the orbit target to (x, z); optionally change the viewing distance. */
  focus: (x: number, z: number, distanceM?: number) => void;
  /** Smoothly return to the whole-world overview. */
  overview: () => void;
}

let nextId = 1;

export const useCameraStore = create<CameraState>()((set) => ({
  request: null,
  focus: (x, z, distanceM) => {
    set({ request: { id: nextId++, kind: 'focus', x, z, distanceM: distanceM ?? null } });
  },
  overview: () => {
    set({ request: { id: nextId++, kind: 'overview' } });
  },
}));
