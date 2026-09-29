import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYERS,
  DEFAULT_URL_STATE,
  MAX_SEED_LENGTH,
  effectiveSpoiler,
  parseUrlState,
  toSearch,
  type UrlState,
} from './url-state';

describe('parseUrlState', () => {
  it('returns defaults for an empty query', () => {
    expect(parseUrlState('')).toEqual(DEFAULT_URL_STATE);
  });

  it('reads every param', () => {
    const s = parseUrlState(
      '?seed=HelloWorld&mode=veteran&layers=grid,pins&spoiler=1&pins=10,-20,Base;300,40,Mine%2C%20copper&hide=test-type-a,test-type-b&sel=test-entry&cam=1,2,3000,0.9,1.2&about=1',
    );
    expect(s).toEqual({
      seed: 'HelloWorld',
      mode: 'veteran',
      layers: ['grid', 'pins'],
      spoiler: 1,
      pins: [
        { id: 'pin-1', x: 10, z: -20, label: 'Base' },
        { id: 'pin-2', x: 300, z: 40, label: 'Mine, copper' },
      ],
      hide: ['test-type-a', 'test-type-b'],
      sel: 'test-entry',
      cam: { x: 1, z: 2, distanceM: 3000, polar: 0.9, azimuth: 1.2 },
      about: true,
    });
  });

  it('falls back per field on invalid values', () => {
    const s = parseUrlState(
      `?seed=${'x'.repeat(MAX_SEED_LENGTH + 1)}&mode=god&layers=grid,nope&spoiler=7&pins=a,b&hide=Not_An_Id&sel=<script>&cam=1,2&about=yes`,
    );
    expect(s).toEqual(DEFAULT_URL_STATE);
  });

  it('allows an empty layer list', () => {
    expect(parseUrlState('?layers=').layers).toEqual([]);
  });
});

describe('toSearch', () => {
  it('omits defaults', () => {
    expect(toSearch(DEFAULT_URL_STATE)).toBe('');
  });

  it('round-trips through parseUrlState', () => {
    const state: UrlState = {
      seed: 'a b&c',
      mode: 'veteran',
      layers: ['creatures', 'grid'],
      spoiler: 2,
      pins: [{ id: 'pin-1', x: 5, z: -7, label: 'A;b,c' }],
      hide: ['test-type'],
      sel: 'pin-1',
      cam: { x: 100, z: -200, distanceM: 4000, polar: 1.1, azimuth: -0.5 },
      about: true,
    };
    expect(parseUrlState(toSearch(state))).toEqual(state);
  });

  it('preserves unrelated params and drops the legacy layer param', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, mode: 'veteran' }, '?debug=1&layer=rings')).toBe(
      '?debug=1&mode=veteran',
    );
  });

  it('treats layers as a set when comparing to the default', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, layers: [...DEFAULT_LAYERS].reverse() })).toBe('');
  });
});

describe('effectiveSpoiler', () => {
  it('defaults by mode and respects an explicit choice', () => {
    expect(effectiveSpoiler({ mode: 'newcomer', spoiler: null })).toBe(0);
    expect(effectiveSpoiler({ mode: 'veteran', spoiler: null })).toBe(2);
    expect(effectiveSpoiler({ mode: 'veteran', spoiler: 1 })).toBe(1);
  });
});
