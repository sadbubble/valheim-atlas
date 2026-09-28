# Valheim Atlas: Product Specification

- **Status:** draft v0.1 (Phase 0)
- **Target game version:** 1.0.16 (S-VER-03)
- **World generation path:** see `docs/DECISION.md` (pending confirmation)

Facts in this document cite source IDs from `docs/SOURCES.md`. The app itself reads facts only from
`public/data/*.json` (see `CLAUDE.md`).

## 1. Vision

Valheim Atlas is a browser app that shows a Valheim-style world as a 3D, game-like disc you can
orbit. The same map serves two groups:
- **Newcomers** learn where to go next, what is dangerous, and what to bring.
- **Veterans** explore a seed, find locations quickly, and measure routes.

Everything shown is sourced. Anything approximated is labelled.

## 2. The world we render

| Property | Value | Source |
|---|---|---|
| Shape | Flat disc, playable radius 10,000 m (≈ 20 km diameter) | S-BIO-02 |
| Water edge | 10,500 m; ocean continues beyond, floor −400 m | S-BIO-02 |
| Sea level | 30 m (normalized 0.15; heights = normalized × 200) | S-BIO-02 |
| Zone size | 64 × 64 m | S-WG-05 |
| Biomes | Meadows, Black Forest, Swamp, Mountains, Plains, Mistlands, Ashlands (south), Deep North (north), Ocean | S-BIO-01, S-BIO-02 |
| Coordinates | x = east, z = north, y = up; 1 scene unit = 1 m; origin = world centre | convention (matches game) |

## 3. Features

### F1. 3D world view
- The terrain disc is coloured by biome, with water at sea level and an ocean ring out to the horizon.
- The sky and lighting use our own shaders and colours. No game assets.
- The camera:
  - orbits, pans and zooms (drei `OrbitControls` or `MapControls`);
  - has a "fly to" animation for any selected item;
  - can switch to a top-down (map) view;
  - has a reset view button.
- The generated grid is sized to hold 50 fps on a mid-range laptop (see §8).

### F2. Layers and legend
- Toggleable layers:
  - Biomes
  - Location categories: boss altars, Vegvisirs, dungeons, structures, traders, runestones
  - Distance rings every 1 km
  - A compass or cardinal labels
- The legend shows biome colours and marker icons. Icons are our own SVGs.

### F3. Location markers
- Markers are instanced so thousands can be drawn at once.
- They cluster or thin out when zoomed out and show a label on hover.
- Clicking a marker opens its details panel (F4).

### F4. Info panels
Each panel shows a "Sources" footer listing source IDs and their confidence.
- **Biome:** tier, distance band, dangers, creatures, resources, boss, tips.
- **Boss:** altar, summon items, drops, Forsaken power, recommended preparation.
- **Location type:** biome(s), what's inside, how many per world, distance constraints.
- **Creature:** biome(s), and stats if sourced.
- **Item or resource:** where it is found, and what it unlocks.

### F5. Search and filter
- Search by biome, boss, creature, item or location name.
- Filter the markers shown.
- The nearest result to a chosen point is highlighted.

### F6. Progression guide
- A step list from Meadows through Deep North: biome, boss, key unlocks, recommended gear.
- Each step links to its biome, boss and panels, and can fly the camera to the relevant region.

### F7. Spoiler-safe mode (default for newcomers)
- The user sets "I have defeated up to boss N". Biomes, bosses and panels beyond the next tier are hidden or blurred.
- The setting is saved in `localStorage`.

### F8. Tips
- Short, sourced tips per biome, boss and phase, tagged `newcomer`, `veteran` or `all`.

### F9. Seed input
- A seed text box. The world regenerates in a Web Worker with a progress indicator.
- A random seed button.
- Under Path B:
  - A permanent **"Approximation"** badge explains that the map follows the game's rules but does not match the real world for this seed.
  - An outbound link reads "View the exact map on valheim-map.world" (link only; see DECISION.md).

### F10. Measure and coordinates
- Click two points to measure the distance in metres.
- The cursor readout shows x/z, distance from centre and the biome under the cursor.

### F11. Shareable state
- The URL encodes the seed, camera, layers, selection and spoiler level.

### F12. About / data
- A page listing the target game version, all sources, the generator path, and a disclaimer: fan-made, not affiliated with Iron Gate or Coffee Stain.

## 4. User stories

### Newcomer
| ID | Story | Acceptance criteria |
|---|---|---|
| N1 | As a new player, I want to see where each biome sits relative to spawn, so I know how far I can safely roam. | Biome layer on by default; distance rings; hovering shows the biome name and its tier (1 = Meadows, …). |
| N2 | As a new player, I want to know which boss comes next and how to summon it, so I can progress. | Progression guide (F6) shows the next boss, summon items and altar biome; everything cited. |
| N3 | As a new player, I don't want late-game spoilers. | Spoiler-safe mode (F7) is on by default and hides everything beyond the next tier. |
| N4 | As a new player, I want to know what dangers a biome has before I go. | The biome panel lists its creatures, flagged hostile or passive, with sources. |
| N5 | As a new player, I want to know where to find a resource (e.g. copper, iron). | Searching an item shows the biomes and locations that yield it; "unknown" when unsourced. |
| N6 | As a new player, I want practical tips. | Each biome and boss panel shows ≥ 1 tip tagged `newcomer`, with a source. |
| N7 | As a new player, I want to understand what a Vegvisir or dungeon is. | The location panel explains the category in plain language, with contents and biome. |
| N8 | As a new player, I want the 3D view to be easy to control. | An on-screen controls hint; a reset view button; keyboard and touch both work. |

### Veteran
| ID | Story | Acceptance criteria |
|---|---|---|
| V1 | As a veteran, I want to type my seed and see a world for it. | The seed box regenerates the world in < 10 s on a mid-range laptop; the Approximation badge is shown under Path B. |
| V2 | As a veteran, I want to toggle specific location types (e.g. only Sunken Crypts and traders). | Per-type and per-category filters; counts shown. |
| V3 | As a veteran, I want to find the nearest trader or altar to a point. | "Nearest …" from a clicked point highlights the result and flies to it. |
| V4 | As a veteran, I want to measure travel distance. | The measure tool (F10) gives straight-line metres. |
| V5 | As a veteran, I want spawn rules and constraints (quantity, distance, altitude). | The location panel shows quantity, prioritized flag, min/max distance and altitude, sourced. |
| V6 | As a veteran, I want to share a view with friends. | Copying the URL reproduces the seed, camera, layers and selection. |
| V7 | As a veteran, I want to know which game version the data reflects. | The version is always visible in the About page and footer. |
| V8 | As a veteran, I want to jump to the exact seed map elsewhere. | Under Path B, an outbound link to valheim-map.world with the seed. |

## 5. Non-goals (v1)
- **No exact per-seed match under Path B.** Labelled as an approximation.
- **No exact vegetation, rotations or dungeon interiors.** Not reproducible even by exact ports (S-WG-01, S-WG-02).
- **No mod support** (Expand World, Better Continents, etc.).
- **No save-file (`.fwl`/`.db`) import** and no explored-area overlay.
- **No backend, accounts or multiplayer.** A static site only.
- **No game assets, textures, models, fonts, music or audio,** and no pasted wiki prose.
- **No redistribution of decompiled code or unlicensed data files.**
- **No full crafting-calculator scope.** Items appear only where they support the map and progression.
- **No native mobile app.** Mobile browser should work but is not the primary target.

## 6. Data model

All game facts live in `public/data/*.json`. The files are validated by zod schemas in `src/data/schema.ts`,
which mirror the types below, and are checked by `npm run validate:data`.

```ts
// ---- shared ----
type Id = string;                // kebab-case, stable, e.g. "black-forest", "sunken-crypt"
type SourceId = string;          // e.g. "S-LOC-01"; must exist in public/data/sources.json
type Confidence = "read" | "snippet" | "conflict";

interface Sourced {
  sources: SourceId[];           // REQUIRED, non-empty
  notes?: string;                // our own words; never pasted wiki prose
}

interface SourceRef {
  id: SourceId;
  title: string;
  url: string;
  kind: "official" | "wiki" | "community-data" | "decompile-derived" | "press";
  license?: string;              // e.g. "MIT", "CC BY-SA 3.0", "none"
  accessed: string;              // ISO date
  gameVersion?: string;          // version the source describes, if known
  confidence: Confidence;
}

interface Meta {                 // public/data/meta.json
  targetGameVersion: "1.0.16";
  worldGenVersion: 2;
  dataUpdated: string;           // ISO date
  sources: SourceId[];
}

// ---- world constants (public/data/world.json) ----
interface WorldConstants extends Sourced {
  worldRadiusM: number;          // 10000
  waterEdgeM: number;            // 10500
  seaLevelM: number;             // 30
  heightScaleM: number;          // 200 (normalized → metres)
  zoneSizeM: number;             // 64
  outerFloorM: number;           // -400
}

// ---- biomes (public/data/biomes.json) ----
type BiomeId = "meadows" | "black-forest" | "swamp" | "mountains" | "plains"
             | "mistlands" | "ashlands" | "deep-north" | "ocean";

interface BiomeRule extends Sourced {       // public/data/biome-rules.json; one row of the GetBiome table
  order: number;                            // evaluation order; first match wins
  biome: BiomeId;
  minDistM?: number; maxDistM?: number;     // from world centre
  wobbleOnMin?: boolean;                    // adds A = sin(atan2(x,z)*20)*100
  noiseThreshold?: number;                  // e.g. 0.4, 0.6
  baseHeightMin?: number; baseHeightMax?: number;   // normalized
  offsetCircle?: { cx: number; cz: number; radiusM: number }; // Ashlands / Deep North
}

interface Biome extends Sourced {
  id: BiomeId;
  name: string;
  tier: number | null;                      // progression order; null for ocean
  typicalDistanceM: [number, number] | null;
  mapColor: string;                         // our own palette, hex
  creatureIds: Id[];
  resourceItemIds: Id[];
  locationTypeIds: Id[];
  bossId: Id | null;
  dangerSummary?: string;
}

// ---- locations (public/data/locations.json) ----
type LocationCategory = "start" | "boss-altar" | "vegvisir" | "dungeon" | "structure"
                      | "trader" | "runestone" | "landmark" | "miniboss";

interface LocationType extends Sourced {
  id: Id;
  prefab: string;                           // e.g. "SunkenCrypt4"
  name: string;                             // in-game display name
  category: LocationCategory;
  biomes: BiomeId[];
  quantity: number | null;                  // placement attempts per world
  prioritized: boolean | null;
  unique: boolean | null;
  minDistM: number | null; maxDistM: number | null;
  minAltM: number | null;  maxAltM: number | null;
  revealsLocationIds?: Id[];                // Vegvisir → altar
  vegvisirChance?: number | null;           // 0..1 if sourced
  bossId?: Id; npc?: string;
  contents?: string;
  confidence: Confidence;
}

// ---- creatures (public/data/creatures.json) ----
interface Creature extends Sourced {
  id: Id; name: string;
  biomes: BiomeId[];
  hostility: "passive" | "neutral" | "hostile" | null;
  health: number | null;                    // null unless sourced, never guessed
  tameable: boolean | null;
  dropItemIds: Id[];
}

// ---- items (public/data/items.json) ----
interface Item extends Sourced {
  id: Id; name: string;
  kind: "resource" | "summon" | "boss-drop" | "key" | "food" | "tool" | "weapon" | "armor" | "other";
  foundInBiomes: BiomeId[];
  sourceLocationIds: Id[];
  droppedByIds: Id[];                        // creature or boss IDs
  unlocks?: string;
}

// ---- bosses (public/data/bosses.json) ----
interface Boss extends Sourced {
  id: Id; name: string;
  order: number;                            // 1 = Eikthyr … 8 = Kall Fimbulbringer
  biome: BiomeId;
  altarLocationId: Id;
  summon: { itemId: Id; qty: number | null }[];
  dropItemIds: Id[];
  power: { name: string; effect: string | null; sources: SourceId[] } | null;
}

// ---- progression & tips ----
interface ProgressionStep extends Sourced {  // public/data/progression.json
  order: number; biome: BiomeId; bossId: Id | null;
  keyUnlockItemIds: Id[]; recommendedGear: string[];
}

interface Tip extends Sourced {             // public/data/tips.json
  id: Id; audience: "newcomer" | "veteran" | "all";
  subject: { kind: "biome" | "boss" | "location" | "creature" | "item" | "general"; id?: Id };
  spoilerTier: number;                      // hidden when the user's progress < this tier
  text: string;                             // our own words
}

// ---- runtime only (never in public/data/) ----
interface GeneratedWorld {
  seed: string;
  generator: "approx-v1" | "exact-1.0.16";  // shown in the UI
  resolution: number;                       // grid cells per side
  heights: Float32Array;                    // metres
  biomes: Uint8Array;                       // BiomeId enum index
  placements: { locationTypeId: Id; x: number; z: number; y: number }[];
}
```

**Integrity rules** (enforced by `validate:data`)
- Every `sources[]` entry must exist in `public/data/sources.json`.
- Every cross-reference ID must resolve to a record.
- Every number either has a source or is `null`.
- Any `confidence: "conflict"` record must have `notes`.

## 7. UX outline
- **Layout:** full-screen canvas. A left drawer holds Search, Layers and Progression. A right drawer shows the detail panel. The bottom bar shows coordinates, version and the approximation badge.
- **First run:** asks "New to Valheim?". Yes turns on spoiler-safe mode at tier 1 and the progression guide. No gives the veteran layout with all layers.
- **Accessibility:**
  - Colour-blind-safe biome palette plus pattern or labels.
  - Every control is keyboard reachable.
  - Honour `prefers-reduced-motion` (no fly animations).

## 8. Performance budget
- World generation runs in a Web Worker; the main thread never blocks for more than 50 ms.
- The terrain mesh is 512² vertices by default (about 39 m spacing), up to 1024² on capable GPUs. The biome texture is 2048² (about 10 m/px).
- Markers use instanced meshes, with ≤ 5 draw calls per category group.
- Target: ≥ 50 fps with orbiting on a mid-range laptop's integrated GPU. The initial JS bundle is < 1.5 MB gzipped, excluding data.
