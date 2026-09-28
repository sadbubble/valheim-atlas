import { create } from 'zustand';
import type { GeneratedWorld } from '../world/types';

export type WorldStatus =
  | { kind: 'idle' }
  | { kind: 'generating'; seed: string; progress: number }
  | { kind: 'ready'; seed: string; world: GeneratedWorld; fromCache: boolean }
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
