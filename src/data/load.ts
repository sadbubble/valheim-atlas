import { z } from 'zod';
import {
  BossSchema,
  CraftingStationSchema,
  CreatureSchema,
  FoodSchema,
  ItemSchema,
  ProgressionStepSchema,
  ResourceSchema,
  TipSchema,
  type Boss,
  type CraftingStation,
  type Creature,
  type Food,
  type Item,
  type ProgressionStep,
  type Resource,
  type Tip,
} from './content-schema';
import {
  BiomeRulesFileSchema,
  BiomesFileSchema,
  LocationCategoriesFileSchema,
  LocationsFileSchema,
  MetaSchema,
  SourcesFileSchema,
  WorldConstantsSchema,
  type Biome,
  type LocationCategoryInfo,
  type LocationType,
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

export interface ContentData {
  biomes: Biome[];
  bosses: Boss[];
  creatures: Creature[];
  resources: Resource[];
  items: Item[];
  craftingStations: CraftingStation[];
  food: Food[];
  progression: ProgressionStep[];
  locations: LocationType[];
  /** Plain-language glossary of location categories (not id-indexed content). */
  locationCategories: LocationCategoryInfo[];
  tips: Tip[];
}

/** Loads and validates every player-facing content file in parallel. */
export async function loadContent(fetchImpl?: typeof fetch): Promise<ContentData> {
  const [
    biomes,
    bosses,
    creatures,
    resources,
    items,
    craftingStations,
    food,
    progression,
    locations,
    locationCategories,
    tips,
  ] = await Promise.all([
    loadDataFile('biomes', BiomesFileSchema, fetchImpl),
    loadDataFile('bosses', z.array(BossSchema), fetchImpl),
    loadDataFile('creatures', z.array(CreatureSchema), fetchImpl),
    loadDataFile('resources', z.array(ResourceSchema), fetchImpl),
    loadDataFile('items', z.array(ItemSchema), fetchImpl),
    loadDataFile('crafting-stations', z.array(CraftingStationSchema), fetchImpl),
    loadDataFile('food', z.array(FoodSchema), fetchImpl),
    loadDataFile('progression', z.array(ProgressionStepSchema), fetchImpl),
    loadDataFile('locations', LocationsFileSchema, fetchImpl),
    loadDataFile('location-categories', LocationCategoriesFileSchema, fetchImpl),
    loadDataFile('tips', z.array(TipSchema), fetchImpl),
  ]);
  return {
    biomes,
    bosses,
    creatures,
    resources,
    items,
    craftingStations,
    food,
    progression,
    locations,
    locationCategories,
    tips,
  };
}
