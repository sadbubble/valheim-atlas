import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
} from '../data/content-schema';
import type { ContentData, WorldGenData } from '../data/load';
import {
  BiomeRulesFileSchema,
  BiomesFileSchema,
  LocationCategoriesFileSchema,
  LocationsFileSchema,
  WorldConstantsSchema,
} from '../data/schema';

/** Node-only (tests/benchmarks): reads public/data/<name>.json from disk. */
export function readDataFile(name: string): unknown {
  const url = new URL(`../../public/data/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
}

export function loadWorldGenDataFromDisk(): WorldGenData {
  return {
    world: WorldConstantsSchema.parse(readDataFile('world')),
    biomeRules: BiomeRulesFileSchema.parse(readDataFile('biome-rules')),
    biomes: BiomesFileSchema.parse(readDataFile('biomes')),
    locations: LocationsFileSchema.parse(readDataFile('locations')),
  };
}

/** Node-only: every player-facing content file, validated (mirrors data/load.ts loadContent). */
export function loadContentFromDisk(): ContentData {
  return {
    biomes: BiomesFileSchema.parse(readDataFile('biomes')),
    bosses: z.array(BossSchema).parse(readDataFile('bosses')),
    creatures: z.array(CreatureSchema).parse(readDataFile('creatures')),
    resources: z.array(ResourceSchema).parse(readDataFile('resources')),
    items: z.array(ItemSchema).parse(readDataFile('items')),
    craftingStations: z.array(CraftingStationSchema).parse(readDataFile('crafting-stations')),
    food: z.array(FoodSchema).parse(readDataFile('food')),
    progression: z.array(ProgressionStepSchema).parse(readDataFile('progression')),
    locations: LocationsFileSchema.parse(readDataFile('locations')),
    locationCategories: LocationCategoriesFileSchema.parse(readDataFile('location-categories')),
    tips: z.array(TipSchema).parse(readDataFile('tips')),
  };
}
