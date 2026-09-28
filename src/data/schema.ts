import { z } from 'zod';

/** Source IDs mirror docs/SOURCES.md, e.g. "S-LOC-01". */
export const SourceIdSchema = z
  .string()
  .regex(/^S-[A-Z]+-\d{2}$/, 'Expected a source ID like S-LOC-01');
export type SourceId = z.infer<typeof SourceIdSchema>;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

export const SourceRefSchema = z.object({
  id: SourceIdSchema,
  title: z.string().min(1),
  url: z.url(),
  kind: z.enum(['official', 'wiki', 'community-data', 'decompile-derived', 'press']),
  license: z.string().optional(),
  accessed: IsoDateSchema,
  gameVersion: z.string().optional(),
  confidence: z.enum(['read', 'snippet', 'conflict']),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const SourcesFileSchema = z.array(SourceRefSchema);

/** Every record carrying game facts must cite at least one source (CLAUDE.md rule 2). */
export const SourcedSchema = z.object({
  sources: z.array(SourceIdSchema).min(1),
  notes: z.string().optional(),
});

export const MetaSchema = SourcedSchema.extend({
  targetGameVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  worldGenVersion: z.number().int().nonnegative(),
  dataUpdated: IsoDateSchema,
});
export type Meta = z.infer<typeof MetaSchema>;

// ---------------------------------------------------------------------------
// World generation data (docs/SPEC.md §6). Every number here is a sourced game fact;
// the approx-v1 generator's own tuning lives in src/world/tuning.ts instead.
// ---------------------------------------------------------------------------

export const ConfidenceSchema = z.enum(['read', 'snippet', 'conflict']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const BIOME_IDS = [
  'meadows',
  'black-forest',
  'swamp',
  'mountains',
  'plains',
  'mistlands',
  'ashlands',
  'deep-north',
  'ocean',
] as const;
export const BiomeIdSchema = z.enum(BIOME_IDS);
export type BiomeId = z.infer<typeof BiomeIdSchema>;

const HexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const NormalizedSchema = z.number().min(-10).max(10);

/** public/data/world.json. Heights are normalized unless the key ends in M (metres). */
export const WorldConstantsSchema = SourcedSchema.extend({
  worldRadiusM: z.number().positive(),
  waterEdgeM: z.number().positive(),
  outerFloorM: z.number(),
  seaLevelM: z.number(),
  heightScaleM: z.number().positive(),
  zoneSizeM: z.number().positive(),
  edgeFalloffTarget: NormalizedSchema,
  biomeNoiseScale: z.number().positive(),
  wobble: z.object({ amplitudeM: z.number().nonnegative(), lobes: z.number().int().positive() }),
  mountains: z.object({
    minDistanceM: z.number().nonnegative(),
    squashFrom: NormalizedSchema,
    squashTo: NormalizedSchema,
    excessMultiplier: z.number().positive(),
    detailMax: NormalizedSchema,
  }),
  moatWidthM: z.number().positive(),
  deepNorthHeightBoost: NormalizedSchema,
  rivers: z.object({
    bedMin: NormalizedSchema,
    bedMax: NormalizedSchema,
    channelThresholdMin: z.number().positive(),
    channelThresholdMax: z.number().positive(),
    fadeInStartM: z.number().nonnegative(),
    fadeInEndM: z.number().nonnegative(),
  }),
});
export type WorldConstants = z.infer<typeof WorldConstantsSchema>;

/** Named noise masks used by biome rules; approx-v1 backs each with its own noise field. */
export const NoiseChannelSchema = z.enum(['swamp', 'mistlands', 'plains', 'black-forest']);
export type NoiseChannel = z.infer<typeof NoiseChannelSchema>;

/** One row of the ordered biome decision table (public/data/biome-rules.json). */
export const BiomeRuleSchema = SourcedSchema.extend({
  order: z.number().int().nonnegative(),
  biome: BiomeIdSchema,
  /** Distance from world centre must be > minDistM (+ wobble if wobbleOnMin) and < maxDistM. */
  minDistM: z.number().nonnegative().optional(),
  maxDistM: z.number().positive().optional(),
  wobbleOnMin: z.boolean().optional(),
  noise: z.object({ channel: NoiseChannelSchema, threshold: z.number() }).optional(),
  /** Base height strictly above min and strictly below max (normalized). */
  baseHeightAbove: NormalizedSchema.optional(),
  baseHeightBelow: NormalizedSchema.optional(),
  /** Base height ≤ this value (inclusive, used for ocean). */
  baseHeightAtMost: NormalizedSchema.optional(),
  /** Distance from (cx, cz) must exceed radiusM (+ wobble). */
  offsetCircle: z
    .object({ cx: z.number(), cz: z.number(), radiusM: z.number().positive(), wobble: z.boolean() })
    .optional(),
});
export type BiomeRule = z.infer<typeof BiomeRuleSchema>;
export const BiomeRulesFileSchema = z.array(BiomeRuleSchema).min(1);

export const BiomeSchema = SourcedSchema.extend({
  id: BiomeIdSchema,
  name: z.string().min(1),
  /** Progression order; null for ocean. */
  tier: z.number().int().positive().nullable(),
  /** Our own palette (not a game fact). */
  mapColor: HexColorSchema,
});
export type Biome = z.infer<typeof BiomeSchema>;
export const BiomesFileSchema = z.array(BiomeSchema).min(1);

export const LOCATION_CATEGORIES = [
  'start',
  'boss-altar',
  'trader',
  'miniboss',
  'dungeon',
  'village',
  'vegvisir',
  'runestone',
  'landmark',
] as const;
export const LocationCategorySchema = z.enum(LOCATION_CATEGORIES);
export type LocationCategory = z.infer<typeof LocationCategorySchema>;

export const LocationTypeSchema = SourcedSchema.extend({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** Internal game prefab name; null when sources conflict (see notes). */
  prefab: z.string().min(1).nullable(),
  /** Display label, in our own words unless an in-game name is sourced. */
  name: z.string().min(1),
  category: LocationCategorySchema,
  biomes: z.array(BiomeIdSchema).min(1),
  /** Placement attempts per world (game `quantity`); null = unknown, so not placed. */
  quantity: z.number().int().positive().nullable(),
  prioritized: z.boolean().nullable(),
  /** Only one instance is kept per world. */
  unique: z.boolean().nullable(),
  minDistM: z.number().nonnegative().nullable(),
  maxDistM: z.number().positive().nullable(),
  /** Metres above sea level. */
  minAltM: z.number().nullable(),
  maxAltM: z.number().nullable(),
  /** How the game picks candidate spots: random zones, or searching outward from the centre. */
  placement: z.enum(['random', 'center-outward']),
  revealsLocationIds: z.array(z.string()).optional(),
  /** Chance (0..1) that this location holds the Vegvisir; null if not sourced. */
  vegvisirChance: z.number().min(0).max(1).nullable().optional(),
  bossId: z.string().optional(),
  npc: z.string().optional(),
  confidence: ConfidenceSchema,
});
export type LocationType = z.infer<typeof LocationTypeSchema>;
export const LocationsFileSchema = z.array(LocationTypeSchema).min(1);

/** Everything the world generator needs (also validated at the worker boundary). */
export const WorldGenDataSchema = z.object({
  world: WorldConstantsSchema,
  biomeRules: BiomeRulesFileSchema,
  biomes: BiomesFileSchema,
  locations: LocationsFileSchema,
});
export type WorldGenData = z.infer<typeof WorldGenDataSchema>;
