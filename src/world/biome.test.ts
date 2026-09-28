import { describe, expect, it } from 'vitest';
import type { BiomeRule, NoiseChannel } from '../data/schema';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { classifyBiome, isUnconditional, prepareRules, type BiomeSample } from './biome';

const data = loadWorldGenDataFromDisk();
const rules = prepareRules(data.biomeRules);
const oceanMax = rules.find((r) => r.biome === 'ocean')?.baseHeightAtMost ?? 0;
const mountainMin = rules.find((r) => r.biome === 'mountains')?.baseHeightAbove ?? 1;
const landBase = (oceanMax + mountainMin) / 2;

function sample(
  x: number,
  z: number,
  base: number,
  channels: Partial<Record<NoiseChannel, number>> = {},
  wobbleM = 0,
): BiomeSample {
  return {
    x,
    z,
    distM: Math.sqrt(x * x + z * z),
    wobbleM,
    base,
    channel: (c) => channels[c] ?? 0,
  };
}

/** Builds an input that satisfies `rule` using only values taken from the rule itself. */
function inputFor(rule: BiomeRule): BiomeSample {
  let base = landBase;
  if (rule.baseHeightAtMost !== undefined) base = rule.baseHeightAtMost - 0.01;
  if (rule.baseHeightAbove !== undefined) {
    const hi = rule.baseHeightBelow ?? rule.baseHeightAbove + 0.02;
    base = (rule.baseHeightAbove + hi) / 2;
  }
  if (rule.offsetCircle) {
    // Step from the offset centre, through the world origin, just past the circle.
    const { cx, cz, radiusM } = rule.offsetCircle;
    const len = Math.sqrt(cx * cx + cz * cz) || 1;
    return sample(cx - (cx / len) * (radiusM + 50), cz - (cz / len) * (radiusM + 50), base);
  }
  const lo = rule.minDistM ?? 0;
  const d = rule.maxDistM !== undefined ? (lo + rule.maxDistM) / 2 : lo + 100;
  const channels = rule.noise ? { [rule.noise.channel]: rule.noise.threshold + 0.01 } : {};
  return sample(d, 0, base, channels);
}

describe('biome rules (public/data/biome-rules.json)', () => {
  it('ends with an unconditional default', () => {
    const last = rules.at(-1);
    expect(last && isUnconditional(last)).toBe(true);
    expect(() => prepareRules(rules.slice(0, -1))).toThrow();
  });

  it.each(rules.map((r) => [`${r.order}: ${r.biome}`, r] as const))(
    'row %s is reachable and classifies correctly',
    (_label, rule) => {
      expect(classifyBiome(rules, inputFor(rule))).toBe(rule.biome);
    },
  );

  it('puts the offset-circle biomes at the correct pole', () => {
    for (const rule of rules.filter((r) => r.offsetCircle)) {
      const s = inputFor(rule);
      // Ashlands is measured from +z and must lie south (z < 0); Deep North the reverse.
      const expectedSign = -Math.sign(rule.offsetCircle?.cz ?? 0);
      expect(Math.sign(s.z)).toBe(expectedSign);
    }
    const ash = rules.find((r) => r.biome === 'ashlands');
    const north = rules.find((r) => r.biome === 'deep-north');
    expect(ash?.offsetCircle?.cz).toBeGreaterThan(0);
    expect(north?.offsetCircle?.cz).toBeLessThan(0);
  });

  it('first match wins (mountains beat swamp)', () => {
    const swamp = rules.find((r) => r.biome === 'swamp');
    const d = ((swamp?.minDistM ?? 0) + (swamp?.maxDistM ?? 0)) / 2;
    expect(classifyBiome(rules, sample(d, 0, mountainMin + 0.01, { swamp: 1 }))).toBe('mountains');
  });

  it('applies the wobble to lower distance bounds only when the rule says so', () => {
    const plains = rules.find((r) => r.biome === 'plains');
    const min = plains?.minDistM ?? 0;
    const amp = data.world.wobble.amplitudeM;
    const s = (wobble: number) => sample(min + amp / 2, 0, landBase, { plains: 1 }, wobble);
    expect(classifyBiome(rules, s(-amp))).toBe('plains');
    expect(classifyBiome(rules, s(amp))).not.toBe('plains');
  });

  it('falls back to meadows at the centre', () => {
    expect(classifyBiome(rules, sample(0, 0, landBase))).toBe('meadows');
  });
});
