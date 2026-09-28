import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findDuplicateSourceIds, findUnknownSourceIds } from './integrity';
import { loadDataFile } from './load';
import {
  BIOME_IDS,
  BiomeRulesFileSchema,
  BiomesFileSchema,
  LocationsFileSchema,
  MetaSchema,
  SourcesFileSchema,
  WorldConstantsSchema,
} from './schema';

const readData = (name: string): unknown =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../public/data/${name}.json`, import.meta.url)), 'utf8'),
  );

describe('public/data', () => {
  const sources = SourcesFileSchema.parse(readData('sources'));

  it('sources.json is valid and has unique IDs', () => {
    expect(findDuplicateSourceIds(sources)).toEqual([]);
  });

  it('meta.json is valid and every cited source exists', () => {
    const meta = MetaSchema.parse(readData('meta'));
    expect(findUnknownSourceIds(meta.sources, sources)).toEqual([]);
  });

  const world = WorldConstantsSchema.parse(readData('world'));
  const rules = BiomeRulesFileSchema.parse(readData('biome-rules'));
  const biomes = BiomesFileSchema.parse(readData('biomes'));
  const locations = LocationsFileSchema.parse(readData('locations'));

  it('every record in every file cites known sources', () => {
    const cited = [world, ...rules, ...biomes, ...locations].flatMap((r) => r.sources);
    expect(findUnknownSourceIds(cited, sources)).toEqual([]);
  });

  it('biomes.json covers every biome id exactly once', () => {
    expect(biomes.map((b) => b.id).sort()).toEqual([...BIOME_IDS].sort());
  });

  it('biome rule orders are unique', () => {
    const orders = rules.map((r) => r.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('location ids are unique and cross-references resolve', () => {
    const ids = locations.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(ids);
    for (const l of locations) {
      for (const target of l.revealsLocationIds ?? []) expect(known.has(target), target).toBe(true);
    }
  });

  it('conflicting records explain themselves', () => {
    for (const l of locations.filter((x) => x.confidence === 'conflict')) {
      expect(l.notes, l.id).toBeTruthy();
    }
  });

  it('distance and altitude ranges are ordered', () => {
    expect(world.waterEdgeM).toBeGreaterThan(world.worldRadiusM);
    for (const l of locations) {
      if (l.minDistM !== null && l.maxDistM !== null) {
        expect(l.minDistM, l.id).toBeLessThan(l.maxDistM);
      }
      if (l.minAltM !== null && l.maxAltM !== null) expect(l.minAltM, l.id).toBeLessThan(l.maxAltM);
    }
  });
});

describe('integrity helpers', () => {
  it('reports unknown and duplicate source IDs', () => {
    const fake = SourcesFileSchema.parse([
      {
        id: 'S-TST-01',
        title: 't',
        url: 'https://example.com',
        kind: 'wiki',
        accessed: '2000-01-01',
        confidence: 'read',
      },
      {
        id: 'S-TST-01',
        title: 't',
        url: 'https://example.com',
        kind: 'wiki',
        accessed: '2000-01-01',
        confidence: 'read',
      },
    ]);
    expect(findDuplicateSourceIds(fake)).toEqual(['S-TST-01']);
    expect(findUnknownSourceIds(['S-TST-01', 'S-TST-99'], fake)).toEqual(['S-TST-99']);
  });

  it('rejects records without sources', () => {
    const result = MetaSchema.safeParse({
      targetGameVersion: '0.0.0',
      worldGenVersion: 0,
      dataUpdated: '2000-01-01',
      sources: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('loadDataFile', () => {
  const respond =
    (body: unknown, status = 200): typeof fetch =>
    () =>
      Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('parses valid JSON through the schema', async () => {
    const meta = await loadDataFile('meta', MetaSchema, respond(readData('meta')));
    expect(meta.sources.length).toBeGreaterThan(0);
  });

  it('throws on HTTP errors and invalid data', async () => {
    await expect(loadDataFile('meta', MetaSchema, respond({}, 404))).rejects.toThrow(/HTTP 404/);
    await expect(loadDataFile('meta', MetaSchema, respond({ nope: true }))).rejects.toThrow(
      /Invalid data/,
    );
  });
});
