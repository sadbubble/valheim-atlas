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

> **Implementation status (Phase 4):** F1–F5, F9 (seed input), F10 (measure + X/Z readout) and
> F11 (shareable URL incl. camera, layers, spoiler setting and pins) are implemented; F7 is
> implemented as a spoiler setting (0/1/2) with per-entry reveal; F6/F8 are available as
> data (`progression.json`, `tips.json`) and tips are shown in the info panel.

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

All game facts live in `public/data/*.json`, validated by `npm run validate:data` (also part of
`npm run check`). **`src/data/content-schema.ts` and `src/data/schema.ts` are authoritative**; the
sketch below is the original design. Implemented files: `meta`, `sources`, `world`, `biome-rules`,
`biomes`, `bosses`, `creatures`, `resources`, `items` (weapons, shields, armor, tools, ammo, meads),
`crafting-stations`, `food`, `progression`, `locations`, `tips`.

Every content entry shares: `id`, `name`, `description` (beginner-friendly), `veteranNotes`,
`biomeIds`, `tier` (0–8), `dangerLevel` (editorial: none/low/medium/high/extreme), `spoilerLevel`
(0/1/2), `sources` (https URLs or registered IDs), `gameVersion`, optional `prefab`, `confidence`,
`notes`. Biomes add `whatToBring`, `threats`, `keyResources`, `recommendedGearTier`, `weather`,
`bossId`; creatures and bosses carry `damageModifiers` plus derived `weaknesses`/`resistances`/
`immunities`; bosses add `summonItems` and `forsakenPower`. `null` = unverified (listed in
`docs/DATA_TODO.md`).

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
  edgeFalloffTarget: number;     // normalized height beyond the radius
  biomeNoiseScale: number;       // biome mask frequency
  wobble: { amplitudeM: number; lobes: number };
  mountains: { minDistanceM; squashFrom; squashTo; excessMultiplier; detailMax };
  moatWidthM: number;
  deepNorthHeightBoost: number;
  rivers: { bedMin; bedMax; channelThresholdMin; channelThresholdMax; fadeInStartM; fadeInEndM };
}

// ---- biomes (public/data/biomes.json) ----
type BiomeId = "meadows" | "black-forest" | "swamp" | "mountains" | "plains"
             | "mistlands" | "ashlands" | "deep-north" | "ocean";

interface BiomeRule extends Sourced {       // public/data/biome-rules.json; one row of the GetBiome table
  order: number;                            // evaluation order; first match wins
  biome: BiomeId;
  minDistM?: number; maxDistM?: number;     // d > min (+A if wobbleOnMin), d < max
  wobbleOnMin?: boolean;                    // adds A = sin(atan2(x,z)*20)*100
  noise?: { channel: "swamp" | "mistlands" | "plains" | "black-forest"; threshold: number };
  baseHeightAbove?: number; baseHeightBelow?: number;  // strict, normalized
  baseHeightAtMost?: number;                // inclusive (ocean)
  offsetCircle?: { cx: number; cz: number; radiusM: number; wobble: boolean }; // Ashlands / Deep North
}
// The last row must be unconditional (the default biome).

interface Biome extends Sourced {
  id: BiomeId;
  name: string;
  tier: number | null;                      // progression order; null for ocean
  mapColor: string;                         // our own palette, hex
  // Planned (Phase 4+): typicalDistanceM, creatureIds, resourceItemIds, locationTypeIds,
  // bossId, dangerSummary.
}

// ---- locations (public/data/locations.json) ----
type LocationCategory = "start" | "boss-altar" | "trader" | "miniboss" | "dungeon" | "village"
                      | "vegvisir" | "runestone" | "landmark";

interface LocationType extends Sourced {
  id: Id;
  prefab: string | null;                    // e.g. "SunkenCrypt4"; null when sources conflict
  name: string;                             // display label; our words unless an in-game name is sourced
  category: LocationCategory;
  biomes: BiomeId[];
  quantity: number | null;                  // placement attempts per world
  prioritized: boolean | null;
  unique: boolean | null;
  minDistM: number | null; maxDistM: number | null;
  minAltM: number | null;  maxAltM: number | null;  // metres above sea level
  placement: "random" | "center-outward";   // start temple searches outward from the centre
  revealsLocationIds?: Id[];                // Vegvisir → altar
  vegvisirChance?: number | null;           // 0..1 if sourced
  bossId?: Id; npc?: string;
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
// src/world/types.ts (zod-validated at the worker and cache boundaries)
interface GeneratedWorld {
  seed: string;
  generator: "approx-v1";                   // exact providers would add their own id
  isApproximation: boolean;                 // true → UI shows the "Approximation" badge
  resolution: number;                       // grid cells per side (64..2048, default 1024)
  extentM: number;                          // grid covers [-extentM, extentM]² (= waterEdgeM)
  cellSizeM: number;
  height: Float32Array;                     // metres, row-major, row 0 = north, col 0 = west
  biomes: Uint8Array;                       // index into biomeIds
  biomeIds: BiomeId[];
  locations: { id: string; type: Id; x: number; z: number; biomeId: BiomeId }[];
  placementReport: { type: Id; wanted: number | null; placed: number; note?: string }[];
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
- The terrain uses the generated 1024² grid (about 20.5 m spacing) split into 16 × 16 chunks with 4 LOD levels (full detail only near the camera) and frustum culling. Biome colour/weight textures and a half-float height texture match the grid.
- Props (trees, rocks) are instanced per chunk and only drawn within 2.6 km of the camera.
- Markers use instanced meshes, with ≤ 5 draw calls per category group.
- Target: 60 fps with orbiting on a mid-range laptop's integrated GPU at default settings (pixel ratio capped at 1.5, dropping to 1 below 50 fps). Measured workload at the screenshot views: ≤ 221 draw calls and ≤ 0.37 M triangles (`docs/screens/stats.json`). The initial JS bundle is < 1.5 MB gzipped, excluding data.
