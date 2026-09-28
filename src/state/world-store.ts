import { create } from 'zustand';

export type WorldStatus =
  | { kind: 'idle' }
  | { kind: 'generating'; seed: string; progress: number }
  | { kind: 'ready'; seed: string; seedHash: number }
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
