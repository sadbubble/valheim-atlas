import { create } from 'zustand';
import type { CamView } from './url-state';

/**
 * A small relative camera move from the keyboard. Pan is in screen directions as a fraction
 * of the current viewing distance; zoom multiplies the distance; angles are radians.
 */
export interface CameraNudge {
  panRight: number;
  panUp: number;
  zoom: number;
  rotate: number;
  tilt: number;
}

export type CameraRequest =
  | { id: number; kind: 'focus'; x: number; z: number; distanceM: number | null }
  | { id: number; kind: 'overview' }
  | { id: number; kind: 'top-down' }
  | ({ id: number; kind: 'nudge' } & CameraNudge);

interface CameraState {
  request: CameraRequest | null;
  /** Smoothly move the orbit target to (x, z); optionally change the viewing distance. */
  focus: (x: number, z: number, distanceM?: number) => void;
  /** Smoothly return to the whole-world overview. */
  overview: () => void;
  /** Look straight down with north up, like a paper map (keeps the current centre). */
  topDown: () => void;
  /** Keyboard camera control: an immediate relative move. */
  nudge: (n: Partial<CameraNudge>) => void;
  /** Current view in game coordinates; installed by the CameraRig. */
  getView: () => CamView | null;
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
  topDown: () => {
    set({ request: { id: nextId++, kind: 'top-down' } });
  },
  nudge: (n) => {
    set({
      request: {
        id: nextId++,
        kind: 'nudge',
        panRight: n.panRight ?? 0,
        panUp: n.panUp ?? 0,
        zoom: n.zoom ?? 1,
        rotate: n.rotate ?? 0,
        tilt: n.tilt ?? 0,
      },
    });
  },
  getView: () => null,
}));
