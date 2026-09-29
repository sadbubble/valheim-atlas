import { createStore, useStore } from 'zustand';
import {
  DEFAULT_URL_STATE,
  MAX_PIN_LABEL,
  MAX_PINS,
  type Layer,
  type Mode,
  type Pin,
  type SpoilerLevel,
  type UrlState,
} from './url-state';

export interface AppState extends UrlState {
  setSeed: (seed: string) => void;
  setMode: (mode: Mode) => void;
  toggleLayer: (layer: Layer, on?: boolean) => void;
  setLayers: (layers: readonly Layer[]) => void;
  /** Show or hide one location type (per-type filter); `on` = shown. */
  toggleType: (typeId: string, on?: boolean) => void;
  /** null = follow the mode's default (see effectiveSpoiler). */
  setSpoiler: (spoiler: SpoilerLevel | null) => void;
  addPin: (x: number, z: number) => Pin | null;
  movePin: (id: string, x: number, z: number) => void;
  renamePin: (id: string, label: string) => void;
  removePin: (id: string) => void;
  /** Open or close the About / data view (URL-synced as `?about=1`). */
  setAbout: (open: boolean) => void;
  replaceUrlState: (state: UrlState) => void;
}

export function createAppStore(initial: UrlState = DEFAULT_URL_STATE) {
  let pinCounter = initial.pins.length;
  return createStore<AppState>()((set, get) => ({
    ...initial,
    setSeed: (seed) => {
      set({ seed: seed.trim() });
    },
    setMode: (mode) => {
      set({ mode });
    },
    toggleLayer: (layer, on) => {
      const has = get().layers.includes(layer);
      const want = on ?? !has;
      if (want === has) return;
      set({ layers: want ? [...get().layers, layer] : get().layers.filter((l) => l !== layer) });
    },
    setLayers: (layers) => {
      set({ layers: [...new Set(layers)] });
    },
    toggleType: (typeId, on) => {
      const hidden = get().hide.includes(typeId);
      const show = on ?? hidden;
      if (show !== hidden) return;
      set({ hide: show ? get().hide.filter((t) => t !== typeId) : [...get().hide, typeId] });
    },
    setSpoiler: (spoiler) => {
      set({ spoiler });
    },
    addPin: (x, z) => {
      const pins = get().pins;
      if (pins.length >= MAX_PINS) return null;
      pinCounter = Math.max(pinCounter, pins.length) + 1;
      let id = `pin-${pinCounter}`;
      while (pins.some((p) => p.id === id)) id = `pin-${++pinCounter}`;
      const pin: Pin = { id, x: Math.round(x), z: Math.round(z), label: `Pin ${pinCounter}` };
      set({ pins: [...pins, pin] });
      return pin;
    },
    movePin: (id, x, z) => {
      set({
        pins: get().pins.map((p) =>
          p.id === id ? { ...p, x: Math.round(x), z: Math.round(z) } : p,
        ),
      });
    },
    renamePin: (id, label) => {
      set({
        pins: get().pins.map((p) =>
          p.id === id ? { ...p, label: label.slice(0, MAX_PIN_LABEL) || p.label } : p,
        ),
      });
    },
    removePin: (id) => {
      set({ pins: get().pins.filter((p) => p.id !== id) });
    },
    setAbout: (about) => {
      set({ about });
    },
    replaceUrlState: (state) => {
      pinCounter = Math.max(pinCounter, state.pins.length);
      set(state);
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
