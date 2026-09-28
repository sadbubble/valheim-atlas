import type { WorldGenData } from '../data/load';
import type { BiomeId, BiomeRule, NoiseChannel } from '../data/schema';
import { classifyBiome, prepareRules, type BiomeSample } from './biome';
import { angularWobble, clamp, lerp, smoothstep } from './math';
import { createSimplex2D, fbm, ridged, type Noise2D } from './noise';
import { createRng, hashSeed } from './rng';
import { TUNING } from './tuning';

export interface TerrainSample {
  /** Base height, normalized (drives biome rules). */
  base: number;
  /** Final ground height, metres. */
  heightM: number;
  biome: BiomeId;
}

export interface Terrain {
  /** Fills `out` for world position (x, z). Allocation-free. */
  sample(x: number, z: number, out: TerrainSample): void;
}

const CHANNELS: readonly NoiseChannel[] = ['swamp', 'mistlands', 'plains', 'black-forest'];

function subNoise(seedHash: number, label: string): Noise2D {
  return createSimplex2D(createRng(hashSeed(`${seedHash}:${label}`)));
}

function noiseThreshold(rules: readonly BiomeRule[], biome: BiomeId): number {
  const rule = rules.find((r) => r.biome === biome && r.noise !== undefined);
  if (!rule?.noise) throw new Error(`biome-rules.json has no noise rule for ${biome}`);
  return rule.noise.threshold;
}

function baseThreshold(rules: readonly BiomeRule[], biome: BiomeId): number {
  const v = rules.find((r) => r.biome === biome && r.baseHeightAbove !== undefined);
  if (v?.baseHeightAbove === undefined) {
    throw new Error(`biome-rules.json has no baseHeightAbove rule for ${biome}`);
  }
  return v.baseHeightAbove;
}

/**
 * approx-v1 terrain: the biome decision table and world constants come from data
 * (S-BIO-01/S-BIO-02); noise fields and height shaping are our own (src/world/tuning.ts).
 */
export function createTerrain(data: WorldGenData, seedHash: number): Terrain {
  const w = data.world;
  const rules = prepareRules(data.biomeRules);
  const T = TUNING;
  const seaNorm = w.seaLevelM / w.heightScaleM;
  const floorNorm = w.outerFloorM / w.heightScaleM;
  const moatCircles = rules.flatMap((r) => (r.offsetCircle ? [r.offsetCircle] : []));
  const mountainTh = baseThreshold(rules, 'mountains');
  const swampTh = noiseThreshold(rules, 'swamp');
  const plainsTh = noiseThreshold(rules, 'plains');
  const mistTh = noiseThreshold(rules, 'mistlands');
  const riverBiomes = new Set<BiomeId>(T.rivers.biomes);

  const nBase = subNoise(seedHash, 'base');
  const nMountain = subNoise(seedHash, 'mountain');
  const nDetail = subNoise(seedHash, 'detail');
  const nRiverA = subNoise(seedHash, 'river-a');
  const nRiverB = subNoise(seedHash, 'river-b');
  const nRiverW = subNoise(seedHash, 'river-width');
  const channelNoise = CHANNELS.map((c) => subNoise(seedHash, `channel-${c}`));
  const channelIndex: Record<NoiseChannel, number> = {
    swamp: 0,
    mistlands: 1,
    plains: 2,
    'black-forest': 3,
  };

  // Per-sample lazy channel cache (NaN = not computed yet).
  const channelCache = new Float64Array(CHANNELS.length);
  const bs: BiomeSample = {
    x: 0,
    z: 0,
    distM: 0,
    wobbleM: 0,
    base: 0,
    channel: (ch) => {
      const k = channelIndex[ch];
      let v = channelCache[k] ?? Number.NaN;
      if (Number.isNaN(v)) {
        const n = channelNoise[k];
        const f = w.biomeNoiseScale;
        v = n
          ? 0.5 + 0.5 * T.channels.contrast * fbm(n, bs.x * f, bs.z * f, T.channels.octaves)
          : 0;
        channelCache[k] = v;
      }
      return v;
    },
  };

  const baseHeight = (x: number, z: number, d: number): number => {
    const B = T.base;
    let b = B.offset + B.amplitude * fbm(nBase, x * B.frequency, z * B.frequency, B.octaves);
    b += B.centerBias * (1 - smoothstep(0, B.centerBiasRadiusM, d));
    const ridge = ridged(
      nMountain,
      x * B.mountainFrequency,
      z * B.mountainFrequency,
      B.mountainOctaves,
    );
    const landness = smoothstep(B.mountainLandStart, B.mountainLandStart + B.mountainLandRamp, b);
    b +=
      (B.mountainAmplitude * Math.max(0, ridge - B.mountainRidgeStart) * landness) /
      (1 - B.mountainRidgeStart);
    if (d < B.spawnLiftRadiusM) b += B.spawnLift * (1 - smoothstep(0, B.spawnLiftRadiusM, d));
    // S-BIO-01: mountains are squashed near spawn.
    const m = w.mountains;
    if (d < m.minDistanceM && b > m.squashFrom) {
      const span = m.squashTo - m.squashFrom;
      const u = (b - m.squashFrom) / span;
      const squashed = m.squashFrom + (span * u) / (1 + u);
      const k = 1 - smoothstep(m.minDistanceM - B.squashBlendM, m.minDistanceM, d);
      b = lerp(b, squashed, k);
    }
    return b;
  };

  return {
    sample(x, z, out) {
      const d = Math.sqrt(x * x + z * z);
      const wobble = angularWobble(x, z, w.wobble.amplitudeM, w.wobble.lobes);
      const base = baseHeight(x, z, d);
      channelCache.fill(Number.NaN);
      bs.x = x;
      bs.z = z;
      bs.distM = d;
      bs.wobbleM = wobble;
      bs.base = base;
      // Beyond the playable radius everything is open sea in our map.
      const biome: BiomeId = d > w.worldRadiusM ? 'ocean' : classifyBiome(rules, bs);

      const S = T.shape;
      const D = T.detail;
      const fq = D.frequency;
      const detail = fbm(nDetail, x * fq, z * fq, D.octaves);
      let h: number;
      switch (biome) {
        case 'ocean':
          h = base;
          break;
        case 'meadows':
          h = base + S.meadowsDetail * detail;
          break;
        case 'black-forest':
          h = base + S.blackForestDetail * detail;
          break;
        case 'swamp': {
          const k = smoothstep(swampTh, swampTh + S.swampMaskWidth, bs.channel('swamp'));
          const flat = seaNorm + (base - seaNorm) * S.swampFlatten + S.swampDetail * detail;
          h = lerp(base + S.meadowsDetail * detail, flat, k);
          break;
        }
        case 'plains': {
          const k = smoothstep(plainsTh, plainsTh + S.plainsMaskWidth, bs.channel('plains'));
          const flat =
            lerp(base, seaNorm + S.plainsLift, S.plainsFlatten) + S.plainsDetail * detail;
          h = lerp(base + S.meadowsDetail * detail, flat, k);
          break;
        }
        case 'mistlands': {
          const k = smoothstep(mistTh, mistTh + S.mistlandsMaskWidth, bs.channel('mistlands'));
          const spikes = ridged(
            nDetail,
            x * fq * S.mistlandsRidgeScale,
            z * fq * S.mistlandsRidgeScale,
            3,
          );
          h = base + S.meadowsDetail * detail + k * S.mistlandsRoughness * spikes;
          break;
        }
        case 'mountains': {
          // S-BIO-02: mountain excess over the threshold is multiplied, plus up to detailMax.
          const k = smoothstep(mountainTh, mountainTh + S.mountainRamp, base);
          const spikes = ridged(
            nDetail,
            x * fq * S.mountainRidgeScale,
            z * fq * S.mountainRidgeScale,
            4,
          );
          const excess = (base - mountainTh) * (w.mountains.excessMultiplier - 1);
          h = base + k * (excess + w.mountains.detailMax * spikes);
          break;
        }
        case 'ashlands': {
          const cracks = ridged(
            nDetail,
            x * fq * S.ashlandsRidgeScale,
            z * fq * S.ashlandsRidgeScale,
            2,
          );
          h = base + S.ashlandsRoughness * cracks;
          break;
        }
        case 'deep-north': {
          const spikes = ridged(
            nDetail,
            x * fq * S.deepNorthRidgeScale,
            z * fq * S.deepNorthRidgeScale,
            3,
          );
          const k = smoothstep(seaNorm, seaNorm + S.deepNorthRamp, base);
          h =
            base +
            w.deepNorthHeightBoost +
            S.deepNorthDetail * detail +
            k * S.deepNorthRidges * spikes;
          break;
        }
      }

      // Rivers: carve a channel where two low-frequency noises nearly match (S-BIO-02).
      if (riverBiomes.has(biome)) {
        const R = w.rivers;
        const fr = T.rivers.frequency;
        const a = 0.5 + 0.5 * nRiverA(x * fr, z * fr);
        const b = 0.5 + 0.5 * nRiverB(x * fr, z * fr);
        const wn = 0.5 + 0.5 * nRiverW(x * T.rivers.widthFrequency, z * T.rivers.widthFrequency);
        const width = lerp(R.channelThresholdMin, R.channelThresholdMax, wn);
        const diff = Math.abs(a - b);
        if (diff < width) {
          const t = 1 - diff / width;
          const carve = smoothstep(0, 1, t) * smoothstep(R.fadeInStartM, R.fadeInEndM, d);
          const bed = lerp(R.bedMax, R.bedMin, t);
          h = Math.min(h, lerp(h, bed, carve));
        }
      }

      // Ocean moats along the Ashlands / Deep North boundaries (S-BIO-02).
      for (const c of moatCircles) {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const r = c.radiusM + (c.wobble ? wobble : 0);
        h *= smoothstep(0, w.moatWidthM, Math.abs(Math.sqrt(dx * dx + dz * dz) - r));
      }

      // World edge: pull down to the falloff target, then the outer floor (S-BIO-02).
      if (d > w.worldRadiusM) {
        const t = clamp((d - w.worldRadiusM) / (w.waterEdgeM - w.worldRadiusM), 0, 1);
        h = d >= w.waterEdgeM ? floorNorm : lerp(h, w.edgeFalloffTarget, t);
      }

      out.base = base;
      out.heightM = h * w.heightScaleM;
      out.biome = biome;
    },
  };
}
