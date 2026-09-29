import { RENDER } from '../render/render-config';
import type { SceneStage } from '../state/render-store';
import type { WorldStatus } from '../state/world-store';

/** The loading screen's steps, in order (plain words for newcomers). */
export const LOADING_STEPS = [
  'Shaping the land',
  'Placing locations',
  'Painting the map',
  'Lighting the scene',
] as const;
export const CACHE_STEP_LABEL = 'Loading your saved world';

export interface LoadingView {
  seed: string;
  /** Index into LOADING_STEPS of the step in progress. */
  step: number;
  /** Label of the step in progress (the first step reads differently for a saved world). */
  label: string;
  /** Whole percent, 0–100, over all steps. */
  percent: number;
}

/**
 * What the loading screen shows for a world status and scene stage, or null when there is
 * nothing to load (idle, failed, or the world is on screen).
 */
export function loadingView(status: WorldStatus, scene: SceneStage): LoadingView | null {
  const { generationShare, prepareShare } = RENDER.loading;
  const pct = (x: number) => Math.max(0, Math.min(100, Math.floor(x * 100)));
  switch (status.kind) {
    case 'idle':
    case 'error':
      return null;
    case 'generating': {
      const step = status.stage === 'locations' ? 1 : 0;
      return {
        seed: status.seed,
        step,
        label: status.stage === 'cache' ? CACHE_STEP_LABEL : LOADING_STEPS[step],
        percent: pct(status.progress * generationShare),
      };
    }
    case 'preparing':
      return {
        seed: status.seed,
        step: 2,
        label: LOADING_STEPS[2],
        percent: pct(generationShare),
      };
    case 'ready':
      if (scene === 'shown') return null;
      return {
        seed: status.seed,
        step: 3,
        label: LOADING_STEPS[3],
        percent: pct(generationShare + prepareShare),
      };
  }
}
