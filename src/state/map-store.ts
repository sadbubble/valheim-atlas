import { create } from 'zustand';
import type { BiomeAnchor } from '../render/biome-anchors';

/** Derived per-world lookups shared by the renderer and the UI (fly-to, labels). */
interface MapState {
  anchors: BiomeAnchor[];
  setAnchors: (anchors: BiomeAnchor[]) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  anchors: [],
  setAnchors: (anchors) => {
    set({ anchors });
  },
}));
