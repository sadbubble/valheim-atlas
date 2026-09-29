import type { ContentIndex } from '../data/content-index';
import type { Boss, ProgressionStep } from '../data/content-schema';
import type { BiomeId, LocationType } from '../data/schema';

/** One row of the progression guide, with its boss, summon items and altar resolved. */
export interface GuideStep {
  step: ProgressionStep;
  boss: Boss | null;
  summonItems: Boss['summonItems'];
  altar: LocationType | null;
  /** Biomes the boss altar is found in (from locations.json). */
  altarBiomeIds: BiomeId[];
}

/**
 * The progression guide (SPEC F6): progression.json steps in order, each joined with its
 * boss (bosses.json) and the boss's altar (locations.json). Everything comes from the
 * content index, so no game fact is written here.
 */
export function buildGuide(index: ContentIndex): GuideStep[] {
  return [...index.data.progression]
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const bossHit = step.bossId ? index.byId.get(step.bossId) : undefined;
      const boss = bossHit?.kind === 'boss' ? bossHit.entry : null;
      const altarHit = boss ? index.byId.get(boss.altarLocationId) : undefined;
      const altar = altarHit?.kind === 'location' ? altarHit.entry : null;
      return {
        step,
        boss,
        summonItems: boss?.summonItems ?? [],
        altar,
        altarBiomeIds: altar ? [...altar.biomeIds] : [],
      };
    });
}

/** The first step not ticked off as done: "what to do next". */
export function nextGuideStep(
  guide: readonly GuideStep[],
  doneIds: readonly string[],
): GuideStep | undefined {
  return guide.find((g) => !doneIds.includes(g.step.id));
}

/** Ids to reveal when the user chooses to see a spoiler-hidden step anyway. */
export function revealIdsFor(g: GuideStep): string[] {
  return [
    g.step.id,
    ...g.step.biomeIds,
    ...(g.boss ? [g.boss.id] : []),
    ...(g.altar ? [g.altar.id] : []),
  ];
}
