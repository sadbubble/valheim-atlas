/**
 * approx-v1 tuning. These values are NOT game facts: they are our own choices that make
 * the Path B generator *look* Valheim-like (docs/DECISION.md). Sourced game numbers live
 * in public/data/*.json. Changing anything here changes generated worlds, so bump
 * GENERATOR_REVISION in generator-info.ts.
 */
export const TUNING = {
  base: {
    /** Continental noise frequency (cycles per metre) and octaves. */
    frequency: 1 / 3200,
    octaves: 5,
    /** base = offset + amplitude · fbm + mountain ridges. */
    offset: 0.17,
    amplitude: 0.42,
    mountainFrequency: 1 / 2600,
    mountainOctaves: 3,
    /** Ridges only lift where the continental noise is already high. */
    mountainAmplitude: 0.7,
    mountainRidgeStart: 0.5,
    mountainLandStart: 0.12,
    mountainLandRamp: 0.2,
    /** More land towards the centre, more open sea outward (our choice, not a game rule). */
    centerBias: 0.06,
    centerBiasRadiusM: 6000,
    /** Our guarantee of dry land around spawn (not a documented game rule). */
    spawnLiftRadiusM: 1400,
    spawnLift: 0.12,
    /** Width of the blend at the edge of the near-spawn mountain squash. */
    squashBlendM: 250,
  },
  /** Biome mask noises: map simplex [-1, 1] to ~[0, 1] like a Perlin mask. */
  channels: {
    contrast: 1.6,
    octaves: 2,
  },
  detail: {
    frequency: 1 / 180,
    octaves: 3,
  },
  /** Per-biome height shaping, normalized units (1 = heightScaleM metres). */
  shape: {
    meadowsDetail: 0.02,
    blackForestDetail: 0.04,
    swampFlatten: 0.3,
    swampDetail: 0.012,
    swampMaskWidth: 0.06,
    plainsFlatten: 0.35,
    /** Plains flatten toward this height above sea level (normalized). */
    plainsLift: 0.08,
    plainsDetail: 0.015,
    plainsMaskWidth: 0.08,
    mistlandsRoughness: 0.14,
    /** Ridge-noise frequency relative to detail.frequency, per biome. */
    mistlandsRidgeScale: 0.5,
    mountainRidgeScale: 0.35,
    ashlandsRidgeScale: 0.7,
    deepNorthRidgeScale: 0.35,
    /** Mountain shaping ramps in over this much base height above the threshold. */
    mountainRamp: 0.05,
    /** Deep North ridges ramp in over this much base height above sea level. */
    deepNorthRamp: 0.15,
    mistlandsMaskWidth: 0.08,
    ashlandsRoughness: 0.08,
    deepNorthDetail: 0.04,
    deepNorthRidges: 0.3,
  },
  rivers: {
    frequency: 1 / 5200,
    widthFrequency: 1 / 2500,
    /** Rivers only cut through these biomes. */
    biomes: ['meadows', 'black-forest', 'swamp', 'plains', 'mistlands'],
  },
  placement: {
    /** Candidate spots tried per placement attempt (quantity) before giving up. */
    triesPerInstance: 40,
    /** Extra budget for prioritized types (the game also gives them more tries, S-WG-12). */
    prioritizedTriesMultiplier: 5,
    /** When no altitude range is sourced, require dry land (≥ this many metres above sea). */
    defaultMinAltitudeM: 1,
    /** Radial step for the start temple's centre-outward search. */
    centerSearchStepM: 16,
  },
} as const;
