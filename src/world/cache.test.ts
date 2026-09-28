import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { worldCacheKey } from './api';
import { createIndexedDbCache } from './cache';
import { generateWorldSync } from './generate';

const data = loadWorldGenDataFromDisk();
const world = (seed: string) => generateWorldSync(seed, 64, data);

describe('IndexedDB world cache', () => {
  it('misses, then round-trips a world including typed arrays', async () => {
    const cache = createIndexedDbCache({ factory: new IDBFactory() });
    if (!cache) throw new Error('cache expected');
    expect(await cache.get('nope')).toBeUndefined();
    const w = world('cached');
    await cache.put('k', w);
    const back = await cache.get('k');
    expect(back?.height).toBeInstanceOf(Float32Array);
    expect(back?.biomes).toBeInstanceOf(Uint8Array);
    expect(back?.height).toEqual(w.height);
    expect(back?.locations).toEqual(w.locations);
  });

  it('evicts the oldest entries beyond maxEntries', async () => {
    const cache = createIndexedDbCache({ factory: new IDBFactory(), maxEntries: 2 });
    if (!cache) throw new Error('cache expected');
    await cache.put('a', world('a'));
    await cache.put('b', world('b'));
    await cache.put('c', world('c'));
    expect(await cache.get('a')).toBeUndefined();
    expect((await cache.get('b'))?.seed).toBe('b');
    expect((await cache.get('c'))?.seed).toBe('c');
  });

  it('returns null when IndexedDB is unavailable', () => {
    expect('indexedDB' in globalThis).toBe(false);
    expect(createIndexedDbCache()).toBeNull();
  });

  it('keys change with seed, resolution and data', () => {
    const k = worldCacheKey('s', 1024, data);
    expect(worldCacheKey('s', 1024, data)).toBe(k);
    expect(worldCacheKey('t', 1024, data)).not.toBe(k);
    expect(worldCacheKey('s', 2048, data)).not.toBe(k);
    const changed = { ...data, world: { ...data.world, seaLevelM: data.world.seaLevelM + 1 } };
    expect(worldCacheKey('s', 1024, changed)).not.toBe(k);
  });
});
