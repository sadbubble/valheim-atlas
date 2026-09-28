import type { z } from 'zod';
import {
  BiomeRulesFileSchema,
  BiomesFileSchema,
  LocationsFileSchema,
  MetaSchema,
  SourcesFileSchema,
  WorldConstantsSchema,
  type Meta,
  type SourceRef,
  type WorldGenData,
} from './schema';

export type { WorldGenData } from './schema';

export class DataLoadError extends Error {
  override readonly name = 'DataLoadError';
}

/** Fetches `public/data/<name>.json` and validates it against `schema`. */
export async function loadDataFile<S extends z.ZodType>(
  name: string,
  schema: S,
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<S>> {
  const url = `${import.meta.env.BASE_URL}data/${name}.json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new DataLoadError(`Failed to load ${url}: HTTP ${res.status}`);
  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new DataLoadError(`Invalid data in ${url}: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const loadMeta = (fetchImpl?: typeof fetch): Promise<Meta> =>
  loadDataFile('meta', MetaSchema, fetchImpl);

export const loadSources = (fetchImpl?: typeof fetch): Promise<SourceRef[]> =>
  loadDataFile('sources', SourcesFileSchema, fetchImpl);

/** Loads everything the world generator needs, in parallel. */
export async function loadWorldGenData(fetchImpl?: typeof fetch): Promise<WorldGenData> {
  const [world, biomeRules, biomes, locations] = await Promise.all([
    loadDataFile('world', WorldConstantsSchema, fetchImpl),
    loadDataFile('biome-rules', BiomeRulesFileSchema, fetchImpl),
    loadDataFile('biomes', BiomesFileSchema, fetchImpl),
    loadDataFile('locations', LocationsFileSchema, fetchImpl),
  ]);
  return { world, biomeRules, biomes, locations };
}
