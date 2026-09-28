import type { BiomeId, BiomeRule, NoiseChannel } from '../data/schema';

/** Inputs for one biome decision. `channel` is evaluated lazily (noise is costly). */
export interface BiomeSample {
  x: number;
  z: number;
  /** Distance from world centre, metres. */
  distM: number;
  /** Angular wobble A at (x, z), metres (S-BIO-02). */
  wobbleM: number;
  /** Base height, normalized. */
  base: number;
  channel: (channel: NoiseChannel) => number;
}

/** True when a rule has no conditions (used as the final default row). */
export function isUnconditional(rule: BiomeRule): boolean {
  return (
    rule.offsetCircle === undefined &&
    rule.baseHeightAtMost === undefined &&
    rule.baseHeightAbove === undefined &&
    rule.baseHeightBelow === undefined &&
    rule.minDistM === undefined &&
    rule.maxDistM === undefined &&
    rule.noise === undefined
  );
}

/** Sorts rules by `order` and checks the table ends with an unconditional default. */
export function prepareRules(rules: readonly BiomeRule[]): BiomeRule[] {
  const sorted = [...rules].sort((a, b) => a.order - b.order);
  const last = sorted.at(-1);
  if (!last || !isUnconditional(last)) {
    throw new Error('biome-rules.json must end with an unconditional default rule');
  }
  return sorted;
}

export function ruleMatches(rule: BiomeRule, s: BiomeSample): boolean {
  // Cheap checks first; noise last.
  if (rule.baseHeightAtMost !== undefined && !(s.base <= rule.baseHeightAtMost)) return false;
  if (rule.baseHeightAbove !== undefined && !(s.base > rule.baseHeightAbove)) return false;
  if (rule.baseHeightBelow !== undefined && !(s.base < rule.baseHeightBelow)) return false;
  if (rule.minDistM !== undefined) {
    const lo = rule.minDistM + (rule.wobbleOnMin === true ? s.wobbleM : 0);
    if (!(s.distM > lo)) return false;
  }
  if (rule.maxDistM !== undefined && !(s.distM < rule.maxDistM)) return false;
  if (rule.offsetCircle !== undefined) {
    const { cx, cz, radiusM, wobble } = rule.offsetCircle;
    const dx = s.x - cx;
    const dz = s.z - cz;
    const r = radiusM + (wobble ? s.wobbleM : 0);
    if (!(Math.sqrt(dx * dx + dz * dz) > r)) return false;
  }
  if (rule.noise !== undefined && !(s.channel(rule.noise.channel) > rule.noise.threshold)) {
    return false;
  }
  return true;
}

/** First matching rule wins (S-BIO-02). `rules` must come from prepareRules. */
export function classifyBiome(rules: readonly BiomeRule[], s: BiomeSample): BiomeId {
  for (const rule of rules) {
    if (ruleMatches(rule, s)) return rule.biome;
  }
  throw new Error('No biome rule matched; the default rule is missing');
}
