import { create } from 'zustand';
import { RENDER } from '../render/render-config';

/**
 * Where the 3D scene is with the current world: nothing yet, compiling shaders behind the
 * loading screen, or shown (fading in unless motion is reduced).
 */
export type SceneStage = 'empty' | 'compiling' | 'shown';

interface RenderState {
  sceneStage: SceneStage;
  setSceneStage: (stage: SceneStage) => void;
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
  sceneStage: 'empty',
  setSceneStage: (sceneStage) => {
    set({ sceneStage });
  },
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
