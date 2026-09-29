import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../data/content-index';
import { loadContentFromDisk } from '../test/load-data-from-disk';
import { buildSearchItems, searchVisible } from './search-model';

const index = buildContentIndex(loadContentFromDisk());
const items = buildSearchItems(index);
const hiddenAbove = (spoiler: number) => (level: number) => level > spoiler;

describe('search with spoiler gating', () => {
  it('includes progression guide steps', () => {
    const step = index.data.progression[0];
    if (!step) throw new Error('expected progression data');
    expect(items.some((r) => r.id === step.id && r.kind === 'progression')).toBe(true);
    const { shown } = searchVisible(step.name, items, hiddenAbove(2));
    expect(shown[0]?.id).toBe(step.id);
  });

  it('never names a hidden entry for a partial query, but counts it', () => {
    const late = items.find((r) => r.spoilerLevel === 2 && r.name.length > 4);
    if (!late) throw new Error('expected a major-spoiler entry');
    const partial = late.name.slice(0, Math.ceil(late.name.length / 2));
    const hiddenRes = searchVisible(partial, items, hiddenAbove(0), 50);
    expect(hiddenRes.shown.every((r) => r.spoilerLevel === 0)).toBe(true);
    expect(hiddenRes.shown.map((r) => r.id)).not.toContain(late.id);
    expect(hiddenRes.hiddenCount).toBeGreaterThan(0);

    const open = searchVisible(partial, items, hiddenAbove(2), 50);
    expect(open.shown.map((r) => r.id)).toContain(late.id);
    expect(open.hiddenCount).toBe(0);
  });

  it('lists a hidden entry when the query is its exact name', () => {
    const late = items.find((r) => r.spoilerLevel === 2);
    if (!late) throw new Error('expected a major-spoiler entry');
    const res = searchVisible(late.name.toUpperCase(), items, hiddenAbove(0), 50);
    expect(res.shown.map((r) => r.id)).toContain(late.id);
  });

  it('respects per-entry reveals', () => {
    const late = items.find((r) => r.spoilerLevel === 2 && r.name.length > 4);
    if (!late) throw new Error('expected a major-spoiler entry');
    const revealed = (level: number, id: string) => level > 0 && id !== late.id;
    const res = searchVisible(late.name.slice(0, 4), items, revealed, 50);
    expect(res.shown.map((r) => r.id)).toContain(late.id);
  });
});
