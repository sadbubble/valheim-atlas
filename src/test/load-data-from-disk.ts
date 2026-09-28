import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { WorldGenData } from '../data/load';
import {
  BiomeRulesFileSchema,
  BiomesFileSchema,
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
