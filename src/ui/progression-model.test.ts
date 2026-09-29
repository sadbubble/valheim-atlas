import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../data/content-index';
import { loadContentFromDisk } from '../test/load-data-from-disk';
import { buildGuide, nextGuideStep, revealIdsFor } from './progression-model';

const index = buildContentIndex(loadContentFromDisk());
const guide = buildGuide(index);

describe('progression guide (SPEC F6, N2)', () => {
  it('lists every progression.json step in order, with tiers never going down', () => {
    expect(guide.map((g) => g.step.id).sort()).toEqual(
      index.data.progression.map((p) => p.id).sort(),
    );
    const orders = guide.map((g) => g.step.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    for (let k = 1; k < guide.length; k++) {
      expect(guide[k]?.step.tier).toBeGreaterThanOrEqual(guide[k - 1]?.step.tier ?? 0);
    }
  });

  it('resolves each boss step to its boss, summon items and altar biome from the data', () => {
    const withBoss = guide.filter((g) => g.step.bossId !== undefined);
    expect(withBoss.length).toBeGreaterThan(0);
    for (const g of withBoss) {
      expect(g.boss?.id, g.step.id).toBe(g.step.bossId);
      expect(g.summonItems.length, g.step.id).toBeGreaterThan(0);
      for (const s of g.summonItems) expect(index.byId.has(s.itemId), s.itemId).toBe(true);
      expect(g.altar?.id, g.step.id).toBe(g.boss?.altarLocationId);
      expect(g.altarBiomeIds.length, g.step.id).toBeGreaterThan(0);
      // Every fact shown per step carries sources.
      expect(g.step.sources.length).toBeGreaterThan(0);
      expect(g.boss?.sources.length).toBeGreaterThan(0);
      expect(g.altar?.sources.length).toBeGreaterThan(0);
    }
  });

  it('the next step is the first one not ticked off', () => {
    const [first, second] = guide;
    expect(nextGuideStep(guide, [])?.step.id).toBe(first?.step.id);
    expect(nextGuideStep(guide, [first?.step.id ?? ''])?.step.id).toBe(second?.step.id);
    expect(
      nextGuideStep(
        guide,
        guide.map((g) => g.step.id),
      ),
    ).toBeUndefined();
  });

  it('revealing a hidden step also reveals its biome, boss and altar', () => {
    const g = guide.find((x) => x.boss !== null);
    if (!g) throw new Error('expected a boss step');
    expect(revealIdsFor(g)).toEqual(
      expect.arrayContaining([g.step.id, ...g.step.biomeIds, g.boss?.id, g.altar?.id]),
    );
  });
});
