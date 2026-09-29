import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDataFile } from '../test/load-data-from-disk';
import {
  DATA_FILE_NAMES,
  collectTodo,
  renderDataTodo,
  validateData,
  type DataFileName,
} from './validate';

const load = (): Record<DataFileName, unknown> =>
  Object.fromEntries(DATA_FILE_NAMES.map((n) => [n, readDataFile(n)])) as Record<
    DataFileName,
    unknown
  >;
const todoMd = readFileSync(
  fileURLToPath(new URL('../../docs/DATA_TODO.md', import.meta.url)),
  'utf8',
);
const clone = <T>(v: T): T => structuredClone(v);
type Row = Record<string, unknown>;
const rows = (raw: Record<DataFileName, unknown>, file: DataFileName) => raw[file] as Row[];

describe('validateData on public/data', () => {
  it('passes for the committed data, including an up-to-date DATA_TODO.md', () => {
    expect(validateData(load(), { dataTodoMarkdown: todoMd })).toEqual([]);
  });

  it('covers every biome and boss', () => {
    const raw = load();
    expect(rows(raw, 'biomes')).toHaveLength(9);
    expect(rows(raw, 'bosses').length).toBeGreaterThanOrEqual(8);
  });
});

describe('validateData rejects broken data (deliberately broken fixtures)', () => {
  const messages = (raw: Record<DataFileName, unknown>) =>
    validateData(raw).map((i) => `${i.file}:${i.message}`);

  it('fails on a missing required field', () => {
    const raw = clone(load());
    delete rows(raw, 'creatures')[0]?.veteranNotes;
    expect(
      messages(raw).some((m) => m.startsWith('creatures:') && m.includes('veteranNotes')),
    ).toBe(true);
  });

  it('fails on missing or empty sources', () => {
    const raw = clone(load());
    const food = rows(raw, 'food')[0];
    if (food) food.sources = [];
    const item = rows(raw, 'items')[0];
    if (item) item.sources = ['S-NOPE-99'];
    const m = messages(raw);
    expect(m.some((x) => x.startsWith('food:') && x.includes('sources'))).toBe(true);
  });

  it('fails on an unregistered source id and a dangling reference', () => {
    const raw = clone(load());
    const tip = rows(raw, 'tips')[0];
    if (tip) {
      tip.sources = ['S-NOPE-99'];
      tip.subjectIds = ['no-such-thing'];
    }
    const m = messages(raw);
    expect(m).toContain('tips:unknown source id S-NOPE-99');
    expect(m).toContain('tips:subjectIds: unknown id "no-such-thing"');
  });

  it('fails on unknown extra fields and invalid spoiler levels', () => {
    const raw = clone(load());
    const res = rows(raw, 'resources')[0];
    if (res) {
      res.madeUpStat = 42;
      res.spoilerLevel = 3;
    }
    const m = messages(raw);
    expect(m.some((x) => x.includes('madeUpStat'))).toBe(true);
    expect(m.some((x) => x.includes('spoilerLevel'))).toBe(true);
  });

  it('fails when weaknesses disagree with damage modifiers', () => {
    const raw = clone(load());
    const c = rows(raw, 'creatures').find((x) => (x.weaknesses as string[]).length > 0);
    if (c) c.weaknesses = [];
    expect(messages(raw).some((x) => x.includes('weaknesses disagree'))).toBe(true);
  });

  it('fails when a land biome lacks its boss or threats', () => {
    const raw = clone(load());
    const b = rows(raw, 'biomes').find((x) => x.id === 'swamp');
    if (b) {
      delete b.bossId;
      b.threats = [];
    }
    const m = messages(raw);
    expect(m).toContain('biomes:bossId missing');
    expect(m).toContain('biomes:threats must not be empty');
  });

  it('fails when DATA_TODO.md is stale', () => {
    const raw = load();
    const issues = validateData(raw, { dataTodoMarkdown: '# stale' });
    expect(issues.some((i) => i.file === 'docs/DATA_TODO.md')).toBe(true);
    expect(renderDataTodo(collectTodo(raw))).toContain('# Data TODO');
  });
});
