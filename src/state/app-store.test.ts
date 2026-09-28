import { describe, expect, it } from 'vitest';
import { createAppStore } from './app-store';
import { DEFAULT_URL_STATE } from './url-state';

describe('app store', () => {
  it('starts from the given URL state and updates fields', () => {
    const store = createAppStore({ ...DEFAULT_URL_STATE, seed: 'abc' });
    expect(store.getState().seed).toBe('abc');
    store.getState().setSeed('  xyz  ');
    store.getState().setMode('veteran');
    store.getState().setLayer('rings');
    expect(store.getState()).toMatchObject({ seed: 'xyz', mode: 'veteran', layer: 'rings' });
  });
});
