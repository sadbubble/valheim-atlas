import { z } from 'zod';

/*
 * Content data model (docs/SPEC.md §6): the player-facing facts in public/data/*.json.
 *
 * Conventions (enforced by `npm run validate:data`):
 * - `null` always means "unknown / not yet verified" and is listed in docs/DATA_TODO.md.
 *   It never means "not applicable": optional fields are omitted instead.
 * - Every entry cites at least one source: an https URL, or an ID registered in
 *   public/data/sources.json (docs/SOURCES.md).
 * - Descriptions and notes are our own words; never pasted wiki prose (CC BY-SA).
 * - ids are kebab-case of the English in-game name; unique across all content files.
 */

export const DAMAGE_TYPES = [
  'blunt',
  'slash',
  'pierce',
  'chop',
  'pickaxe',
  'fire',
  'frost',
  'lightning',
  'poison',
  'spirit',
] as const;
export const DamageTypeSchema = z.enum(DAMAGE_TYPES);
export type DamageType = z.infer<typeof DamageTypeSchema>;

export const DAMAGE_MODIFIERS = [
  'normal',
  'slightlyWeak',
  'weak',
  'veryWeak',
  'slightlyResistant',
  'resistant',
  'veryResistant',
  'immune',
  'ignore',
] as const;
export const DamageModifierSchema = z.enum(DAMAGE_MODIFIERS);

/** Damage amounts by type; only non-zero types are listed. */
export const DamageSchema = z.partialRecord(DamageTypeSchema, z.number().positive());
export const DamageModifiersSchema = z.record(DamageTypeSchema, DamageModifierSchema);

export const ContentIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id');

/** A source: an https URL, or a registered source ID like "S-LOC-01". */
export const SourceRefSchema = z.union([
  z.string().regex(/^S-[A-Z]+-\d{2}$/),
  z.url({ protocol: /^https$/ }),
]);

/**
 * Editorial danger rating for newcomers (our judgement, not a game stat):
 * none = never attacks / harmless; low … extreme by threat to a player of that tier.
 */
export const DANGER_LEVELS = ['none', 'low', 'medium', 'high', 'extreme'] as const;
export const DangerLevelSchema = z.enum(DANGER_LEVELS);

/** 0 = safe to show anyone, 1 = mild spoiler, 2 = major spoiler (late game, boss mechanics). */
export const SpoilerLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const BIOME_ID_VALUES = [
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
const BiomeRefSchema = z.enum(BIOME_ID_VALUES);

export const ContentBaseSchema = z.object({
  id: ContentIdSchema,
  /** English in-game name where one exists. */
  name: z.string().min(1),
  /** Beginner-friendly, our own words. */
  description: z.string().min(15).max(700),
  /** Deeper notes for experienced players, our own words. */
  veteranNotes: z.string().min(10).max(900),
  biomeIds: z.array(BiomeRefSchema),
  /** Progression tier: 1 Meadows … 8 Deep North; 0 = not tied to a biome tier. */
  tier: z.number().int().min(0).max(8),
  dangerLevel: DangerLevelSchema,
  spoilerLevel: SpoilerLevelSchema,
  sources: z.array(SourceRefSchema).min(1),
  /** Game version the cited facts describe, e.g. "1.0" or a full patch number like "1.2.3". */
  gameVersion: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  /** Internal game prefab name, when there is one. */
  prefab: z.string().min(1).nullable().optional(),
  confidence: z.enum(['read', 'snippet', 'conflict']).optional(),
  notes: z.string().optional(),
});

const ItemCountSchema = z.object({
  itemId: ContentIdSchema,
  count: z.number().int().positive().nullable(),
});

export const RecipeSchema = z.object({
  stationId: ContentIdSchema,
  stationLevel: z.number().int().min(1).nullable(),
  materials: z.array(ItemCountSchema).min(1),
});

// --- creatures.json -------------------------------------------------------
export const AttackSchema = z.object({
  name: z.string().min(1),
  damage: DamageSchema,
});

const combatFields = {
  health: z.number().positive().nullable(),
  attacks: z.array(AttackSchema),
  damageModifiers: DamageModifiersSchema.nullable(),
  weaknesses: z.array(DamageTypeSchema),
  resistances: z.array(DamageTypeSchema),
  immunities: z.array(DamageTypeSchema),
  drops: z.array(
    z.object({ itemId: ContentIdSchema, chance: z.number().min(0).max(1).nullable() }),
  ),
};

export const CreatureSchema = ContentBaseSchema.extend({
  behaviour: z.enum(['passive', 'neutral', 'aggressive']),
  kind: z.enum(['animal', 'monster', 'miniboss', 'npc', 'fish', 'summon']),
  ...combatFields,
  tameable: z.boolean(),
}).strict();

// --- bosses.json ------------------------------------------------------------
export const BossSchema = ContentBaseSchema.extend({
  order: z.number().int().min(1),
  altarLocationId: ContentIdSchema,
  summonItems: z.array(ItemCountSchema),
  ...combatFields,
  forsakenPower: z
    .object({
      name: z.string().min(1),
      effect: z.string().min(5),
      durationS: z.number().positive().nullable(),
      cooldownS: z.number().positive().nullable(),
    })
    .optional(),
}).strict();

// --- resources.json ---------------------------------------------------------
export const ResourceSchema = ContentBaseSchema.extend({
  category: z.enum([
    'wood',
    'stone',
    'ore',
    'metal',
    'hide',
    'animal',
    'plant',
    'seed',
    'trophy',
    'boss-item',
    'gem',
    'misc',
  ]),
  howToGet: z.string().min(5),
  droppedBy: z.array(ContentIdSchema),
  weight: z.number().nonnegative().nullable(),
  stackSize: z.number().int().positive().nullable(),
  teleportable: z.boolean().nullable(),
  recipe: RecipeSchema.optional(),
}).strict();

// --- items.json (weapons, shields, armor, tools, ammo) ---------------------------
export const ItemSchema = ContentBaseSchema.extend({
  category: z.enum(['weapon', 'shield', 'armor', 'tool', 'ammo', 'utility']),
  subcategory: z.string().min(1),
  recipe: RecipeSchema.optional(),
  /** Base damage at quality 1, and the increase per quality level. */
  damage: DamageSchema.optional(),
  damagePerLevel: DamageSchema.optional(),
  armor: z.number().nonnegative().nullable().optional(),
  armorPerLevel: z.number().nonnegative().nullable().optional(),
  blockPower: z.number().nonnegative().nullable().optional(),
  weight: z.number().nonnegative().nullable(),
  maxQuality: z.number().int().positive().nullable(),
}).strict();

// --- crafting-stations.json -------------------------------------------------
export const CraftingStationSchema = ContentBaseSchema.extend({
  recipe: RecipeSchema.optional(),
  upgrades: z.array(
    z.object({ id: ContentIdSchema, name: z.string().min(1), recipe: RecipeSchema.optional() }),
  ),
}).strict();

// --- food.json ----------------------------------------------------------------
export const FoodSchema = ContentBaseSchema.extend({
  health: z.number().nonnegative().nullable(),
  stamina: z.number().nonnegative().nullable(),
  eitr: z.number().nonnegative().nullable(),
  durationS: z.number().positive().nullable(),
  healPerTick: z.number().nonnegative().nullable(),
  recipe: RecipeSchema.optional(),
}).strict();

// --- progression.json -------------------------------------------------------
export const ProgressionStepSchema = ContentBaseSchema.extend({
  order: z.number().int().min(1),
  bossId: ContentIdSchema.optional(),
  goals: z.array(z.string().min(5)).min(1),
  keyItemIds: z.array(ContentIdSchema),
}).strict();

// --- tips.json ----------------------------------------------------------------
export const TipSchema = ContentBaseSchema.extend({
  audience: z.enum(['newcomer', 'veteran', 'all']),
  subjectIds: z.array(ContentIdSchema),
}).strict();

export type Creature = z.infer<typeof CreatureSchema>;
export type Boss = z.infer<typeof BossSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type CraftingStation = z.infer<typeof CraftingStationSchema>;
export type Food = z.infer<typeof FoodSchema>;
export type ProgressionStep = z.infer<typeof ProgressionStepSchema>;
export type Tip = z.infer<typeof TipSchema>;
