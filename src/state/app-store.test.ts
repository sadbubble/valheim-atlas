import { describe, expect, it } from 'vitest';
import { createAppStore } from './app-store';
import { DEFAULT_URL_STATE } from './url-state';

describe('app store', () => {
  it('updates seed, mode, layers and spoiler', () => {
    const store = createAppStore({ ...DEFAULT_URL_STATE, seed: 'abc' });
    const s = store.getState();
    s.setSeed('  xyz  ');
    s.setMode('veteran');
    s.toggleLayer('grid');
    s.toggleLayer('biomes', false);
    s.setSpoiler(1);
    const after = store.getState();
    expect(after.seed).toBe('xyz');
    expect(after.mode).toBe('veteran');
    expect(after.layers).toContain('grid');
    expect(after.layers).not.toContain('biomes');
    expect(after.spoiler).toBe(1);
  });

  it('adds, moves, renames and removes pins with unique ids', () => {
    const store = createAppStore();
    const a = store.getState().addPin(10.4, 20.6);
    const b = store.getState().addPin(-5, 7);
    expect(a?.id).not.toBe(b?.id);
    if (!a || !b) throw new Error('pins expected');
    store.getState().movePin(a.id, 100, 200);
    store.getState().renamePin(b.id, 'Copper');
    expect(store.getState().pins).toEqual([
      { id: a.id, x: 100, z: 200, label: a.label },
      { id: b.id, x: -5, z: 7, label: 'Copper' },
    ]);
    store.getState().removePin(a.id);
    expect(store.getState().pins.map((p) => p.id)).toEqual([b.id]);
  });
});
