import { describe, expect, it } from 'vitest';
import type { PreparedWorld } from '../render/terrain-prep-client';
import type { WorldStatus } from '../state/world-store';
import type { GeneratedWorld } from '../world/types';
import { CACHE_STEP_LABEL, LOADING_STEPS, loadingView } from './loading-model';

const ready = {
  kind: 'ready',
  seed: 'test-seed',
  world: {} as GeneratedWorld,
  constants: { seaLevelM: 0, worldRadiusM: 1, waterEdgeM: 1 },
  fromCache: false,
  prepared: {} as PreparedWorld,
} as unknown as WorldStatus;

describe('loadingView', () => {
  it('shows nothing when idle, failed, or once the world is on screen', () => {
    expect(loadingView({ kind: 'idle' }, 'empty')).toBeNull();
    expect(loadingView({ kind: 'error', seed: 's', message: 'x' }, 'empty')).toBeNull();
    expect(loadingView(ready, 'shown')).toBeNull();
  });

  it('walks the steps in order with a rising percentage', () => {
    const views = [
      loadingView({ kind: 'generating', seed: 's', progress: 0, stage: 'start' }, 'empty'),
      loadingView({ kind: 'generating', seed: 's', progress: 0.5, stage: 'terrain' }, 'empty'),
      loadingView({ kind: 'generating', seed: 's', progress: 0.95, stage: 'locations' }, 'empty'),
      loadingView({ kind: 'preparing', seed: 's', fromCache: false }, 'empty'),
      loadingView(ready, 'compiling'),
    ];
    expect(views.map((v) => v?.step)).toEqual([0, 0, 1, 2, 3]);
    expect(views.map((v) => v?.label)).toEqual([
      LOADING_STEPS[0],
      LOADING_STEPS[0],
      LOADING_STEPS[1],
      LOADING_STEPS[2],
      LOADING_STEPS[3],
    ]);
    const pct = views.map((v) => v?.percent ?? -1);
    expect(pct[0]).toBe(0);
    for (let k = 1; k < pct.length; k++) expect(pct[k]).toBeGreaterThanOrEqual(pct[k - 1] ?? 0);
    expect(pct.at(-1)).toBeLessThan(100);
  });

  it('says so when a saved world is loaded', () => {
    expect(
      loadingView({ kind: 'generating', seed: 's', progress: 1, stage: 'cache' }, 'empty')?.label,
    ).toBe(CACHE_STEP_LABEL);
  });
});
