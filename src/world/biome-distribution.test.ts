import { beforeAll, describe, expect, it } from 'vitest';
import type { BiomeId, BiomeRule } from '../data/schema';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { generateWorldSync } from './generate';
import { cellCenterX, cellCenterZ, makeGrid } from './grid';
import type { GeneratedWorld } from './types';

const data = loadWorldGenDataFromDisk();
const { worldRadiusM, wobble } = data.world;
const amp = wobble.amplitudeM;
const rule = (biome: BiomeId, pred: (r: BiomeRule) => boolean = () => true): BiomeRule => {
  const r = data.biomeRules.find((x) => x.biome === biome && pred(x));
  if (!r) throw new Error(`missing rule for ${biome}`);
  return r;
};

interface Cell {
  x: number;
  z: number;
  d: number;
  biome: BiomeId;
  heightM: number;
}

function cells(world: GeneratedWorld): Cell[] {
  const grid = makeGrid(world.resolution, world.extentM);
  const out: Cell[] = [];
  for (let j = 0; j < world.resolution; j++) {
    for (let i = 0; i < world.resolution; i++) {
      const x = cellCenterX(grid, i);
      const z = cellCenterZ(grid, j);
      const k = j * world.resolution + i;
      out.push({
        x,
        z,
        d: Math.sqrt(x * x + z * z),
        biome: world.biomeIds[world.biomes[k] ?? 0] ?? 'ocean',
        heightM: world.height[k] ?? 0,
      });
    }
  }
  return out;
}

const SEEDS = ['HelloWorld', 'abc', 'Valheim'];
let all: Cell[][] = [];

beforeAll(() => {
  all = SEEDS.map((s) => cells(generateWorldSync(s, 256, data)));
});

describe('biome distribution follows the sourced rules', () => {
  it('Ashlands only in the far south, Deep North only in the far north', () => {
    for (const world of all) {
      for (const biome of ['ashlands', 'deep-north'] as const) {
        const circle = rule(biome).offsetCircle;
        if (!circle) throw new Error('offset circle expected');
        for (const c of world.filter((x) => x.biome === biome)) {
          expect(Math.sign(c.z)).toBe(-Math.sign(circle.cz));
          const dist = Math.hypot(c.x - circle.cx, c.z - circle.cz);
          expect(dist).toBeGreaterThan(circle.radiusM - amp);
        }
      }
    }
  });

  it('everything beyond the world radius is ocean', () => {
    for (const world of all) {
      expect(world.filter((c) => c.d > worldRadiusM && c.biome !== 'ocean')).toHaveLength(0);
    }
  });

  it('ring biomes stay inside their distance bands', () => {
    const bands: [BiomeId, BiomeRule][] = [
      ['swamp', rule('swamp')],
      ['mistlands', rule('mistlands')],
      ['plains', rule('plains')],
    ];
    const blackForestMin = rule('black-forest', (r) => r.noise !== undefined).minDistM ?? 0;
    const meadowsMax = rule('black-forest', (r) => r.noise === undefined).minDistM ?? 0;
    for (const world of all) {
      for (const [biome, r] of bands) {
        const slack = r.wobbleOnMin === true ? amp : 0;
        for (const c of world.filter((x) => x.biome === biome)) {
          expect(c.d).toBeGreaterThan((r.minDistM ?? 0) - slack);
          expect(c.d).toBeLessThan(r.maxDistM ?? Infinity);
        }
      }
      for (const c of world.filter((x) => x.biome === 'black-forest')) {
        expect(c.d).toBeGreaterThan(blackForestMin - amp);
      }
      for (const c of world.filter((x) => x.biome === 'meadows')) {
        expect(c.d).toBeLessThan(meadowsMax + amp);
      }
    }
  });

  it('Meadows at the centre, then rings outward', () => {
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    for (const world of all) {
      const centre = world.reduce((best, c) => (c.d < best.d ? c : best));
      expect(centre.biome).toBe('meadows');
      const med = (b: BiomeId) => median(world.filter((c) => c.biome === b).map((c) => c.d));
      expect(med('meadows')).toBeLessThan(med('plains'));
      expect(med('plains')).toBeLessThan(med('mistlands'));
    }
  });

  it('every biome appears and the land share is plausible', () => {
    const present = new Set(all.flat().map((c) => c.biome));
    for (const b of data.biomes) expect(present).toContain(b.id);
    for (const world of all) {
      const disc = world.filter((c) => c.d <= worldRadiusM);
      const land = disc.filter((c) => c.heightM > data.world.seaLevelM).length / disc.length;
      // approx-v1 tuning sanity check (not a game fact): a mix of land and sea.
      expect(land).toBeGreaterThan(0.35);
      expect(land).toBeLessThan(0.8);
    }
  });
});
