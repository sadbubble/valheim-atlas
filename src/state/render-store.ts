import { create } from 'zustand';
import { RENDER } from '../render/render-config';

interface RenderState {
  exaggeration: number;
  showProps: boolean;
  showStats: boolean;
  setExaggeration: (v: number) => void;
  setShowProps: (v: boolean) => void;
  setShowStats: (v: boolean) => void;
}

const clampExag = (v: number) =>
  Math.min(RENDER.exaggeration.max, Math.max(RENDER.exaggeration.min, v));

/** View settings for the 3D renderer (read inside useFrame via getState, never setState there). */
export const useRenderStore = create<RenderState>()((set) => ({
  exaggeration: RENDER.exaggeration.default,
  showProps: true,
  showStats: false,
  setExaggeration: (v) => {
    set({ exaggeration: clampExag(v) });
  },
  setShowProps: (v) => {
    set({ showProps: v });
  },
  setShowStats: (v) => {
    set({ showStats: v });
  },
}));
