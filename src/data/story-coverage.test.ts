import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../test/load-data-from-disk';
import { buildContentIndex } from './content-index';

/**
 * Data coverage behind the user stories (docs/USER_STORIES.md). Where the data has a known
 * gap, the gap is pinned here so that closing it (or widening it) forces a docs update.
 */
const index = buildContentIndex(loadContentFromDisk());
const { biomes, bosses, locations, locationCategories } = index.data;

describe('N6: newcomer tips on biome and boss panels', () => {
  const hasNewcomerTip = (id: string) =>
    index.tipsFor(id).some((t) => t.audience === 'newcomer' && t.sources.length > 0);

  it('the spoiler-free tiers each have at least one sourced newcomer tip', () => {
    for (const b of biomes.filter((x) => x.spoilerLevel === 0 && x.id !== 'ocean')) {
      expect(hasNewcomerTip(b.id), b.id).toBe(true);
    }
  });

  it('known gaps: panels without a newcomer tip (need new sourced tips, not invented ones)', () => {
    const gaps = [...biomes, ...bosses]
      .filter((e) => !hasNewcomerTip(e.id))
      .map((e) => e.id)
      .sort();
    expect(gaps).toEqual(
      [
        'ashlands',
        'bonemass',
        'deep-north',
        'eikthyr',
        'fader',
        'kall-fimbulbringer',
        'mistlands',
        'moder',
        'ocean',
        'swamp',
        'the-elder',
        'the-queen',
        'yagluth',
      ].sort(),
    );
  });
});

describe('N7: every location category is explained', () => {
  it('each category used by a location has a sourced glossary entry', () => {
    for (const l of locations) {
      const info = index.categoryInfo(l.category);
      expect(info, l.category).toBeDefined();
      expect(info?.sources.length).toBeGreaterThan(0);
    }
    expect(locationCategories.every((c) => c.description.length >= 15)).toBe(true);
  });

  it('glossary text makes no numeric claims (numbers belong in sourced fields)', () => {
    for (const c of locationCategories) expect(c.description, c.id).not.toMatch(/\d/);
  });
});
