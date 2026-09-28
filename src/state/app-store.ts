import { createStore, useStore } from 'zustand';
import { DEFAULT_URL_STATE, type Layer, type Mode, type UrlState } from './url-state';

export interface AppState extends UrlState {
  setSeed: (seed: string) => void;
  setMode: (mode: Mode) => void;
  setLayer: (layer: Layer) => void;
  replaceUrlState: (state: UrlState) => void;
}

export function createAppStore(initial: UrlState = DEFAULT_URL_STATE) {
  return createStore<AppState>()((set) => ({
    ...initial,
    setSeed: (seed) => {
      set({ seed: seed.trim() });
    },
    setMode: (mode) => {
      set({ mode });
    },
    setLayer: (layer) => {
      set({ layer });
    },
    replaceUrlState: (state) => {
      set(state);
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
