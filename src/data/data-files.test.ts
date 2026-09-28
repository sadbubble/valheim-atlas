import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findDuplicateSourceIds, findUnknownSourceIds } from './integrity';
import { loadDataFile } from './load';
import { MetaSchema, SourcesFileSchema } from './schema';

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
