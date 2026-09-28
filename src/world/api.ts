import { loadWorldGenData } from '../data/load';
import type { WorldGenData } from '../data/schema';
import { createIndexedDbCache, type WorldCache } from './cache';
import { createWorldClient, type WorldClient } from './client';
import {
  DEFAULT_RESOLUTION,
  GENERATOR_ID,
  GENERATOR_REVISION,
  assertResolution,
} from './generator-info';
import { hashSeed } from './rng';
import type { GeneratedWorld } from './types';

export { GENERATOR_ID, IS_APPROXIMATION } from './generator-info';
export type { GeneratedWorld, PlacedLocation } from './types';

export interface GenerateWorldOptions {
  onProgress?: (progress: number) => void;
  /** Override or disable (null) the IndexedDB cache. Defaults to the shared cache. */
  cache?: WorldCache | null;
}

export interface GenerateWorldResult {
  world: GeneratedWorld;
  fromCache: boolean;
}

let dataPromise: Promise<WorldGenData> | null = null;
let client: WorldClient | null = null;
let defaultCache: WorldCache | null | undefined;

/** Loads (once) and returns the sourced data the generator runs on. */
export function getWorldGenData(): Promise<WorldGenData> {
  dataPromise ??= loadWorldGenData().catch((err: unknown) => {
    dataPromise = null;
    throw err;
  });
  return dataPromise;
}

/** Cache key: generator + revision + data fingerprint + resolution + seed. */
export function worldCacheKey(seed: string, resolution: number, data: WorldGenData): string {
  const dataHash = hashSeed(JSON.stringify(data)).toString(16);
  return `${GENERATOR_ID}@${GENERATOR_REVISION}:${dataHash}:${resolution}:${seed}`;
}

/**
 * Generates (or loads from cache) the world for `seed` in a Web Worker.
 * The same seed, resolution and data always produce the same world.
 */
export async function generateWorld(
  seed: string,
  resolution: number = DEFAULT_RESOLUTION,
  options: GenerateWorldOptions = {},
): Promise<GenerateWorldResult> {
  assertResolution(resolution);
  const data = await getWorldGenData();
  if (defaultCache === undefined) defaultCache = createIndexedDbCache();
  const cache = options.cache === undefined ? defaultCache : options.cache;
  const key = worldCacheKey(seed, resolution, data);

  const cached = await cache?.get(key).catch(() => undefined);
  if (cached) {
    options.onProgress?.(1);
    return { world: cached, fromCache: true };
  }

  client ??= createWorldClient();
  const world = await client.generate(seed, resolution, data, options.onProgress);
  await cache?.put(key, world).catch(() => undefined);
  return { world, fromCache: false };
}

/** Stops the worker (e.g. on page teardown). A later call starts a new one. */
export function disposeWorldWorker(): void {
  client?.dispose();
  client = null;
}
