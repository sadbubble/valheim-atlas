import { create } from 'zustand';
import type { WorldConstants } from '../data/schema';
import type { PreparedWorld } from '../render/terrain-prep-client';
import type { LoadStage } from '../world/api';
import type { GeneratedWorld } from '../world/types';

export type WorldStatus =
  | { kind: 'idle' }
  | {
      kind: 'generating';
      seed: string;
      progress: number;
      /** 'start' until the worker (or the cache) reports its first stage. */
      stage: LoadStage | 'start';
    }
  | {
      /** Generated; the terrain-prep worker is building the render buffers. */
      kind: 'preparing';
      seed: string;
      fromCache: boolean;
    }
  | {
      kind: 'ready';
      seed: string;
      world: GeneratedWorld;
      /** Sourced world constants (sea level, radius…) the renderer needs. */
      constants: WorldConstants;
      fromCache: boolean;
      /** Render buffers built off the main thread (render/terrain-prep.ts). */
      prepared: PreparedWorld;
    }
  | { kind: 'error'; seed: string; message: string };

interface WorldState {
  status: WorldStatus;
  setStatus: (status: WorldStatus) => void;
}

export const useWorldStore = create<WorldState>()((set) => ({
  status: { kind: 'idle' },
  setStatus: (status) => {
    set({ status });
  },
}));
