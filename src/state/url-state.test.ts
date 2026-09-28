import { describe, expect, it } from 'vitest';
import { DEFAULT_URL_STATE, MAX_SEED_LENGTH, parseUrlState, toSearch } from './url-state';

describe('parseUrlState', () => {
  it('returns defaults for an empty query', () => {
    expect(parseUrlState('')).toEqual(DEFAULT_URL_STATE);
  });

  it('reads valid params', () => {
    expect(parseUrlState('?seed=HelloWorld&mode=veteran&layer=locations')).toEqual({
      seed: 'HelloWorld',
      mode: 'veteran',
      layer: 'locations',
    });
  });

  it('falls back per field on invalid values', () => {
    const state = parseUrlState(`?seed=${'x'.repeat(MAX_SEED_LENGTH + 1)}&mode=god&layer=rings`);
    expect(state).toEqual({ ...DEFAULT_URL_STATE, layer: 'rings' });
  });

  it('trims and decodes the seed', () => {
    expect(parseUrlState('?seed=%20a%20b%20').seed).toBe('a b');
  });
});

describe('toSearch', () => {
  it('omits defaults', () => {
    expect(toSearch(DEFAULT_URL_STATE)).toBe('');
  });

  it('round-trips through parseUrlState', () => {
    const state = { seed: 'a b&c', mode: 'veteran', layer: 'rings' } as const;
    expect(parseUrlState(toSearch(state))).toEqual(state);
  });

  it('preserves unrelated params', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, mode: 'veteran' }, '?debug=1&seed=old')).toBe(
      '?debug=1&mode=veteran',
    );
  });
});
