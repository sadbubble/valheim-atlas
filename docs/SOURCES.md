# Sources

Research log for Valheim Atlas. Every game fact in `docs/` and in `public/data/*.json` must trace
to an ID in this file. In Phase 1 these entries are mirrored into `public/data/sources.json` with
the same IDs.

- **Access date for everything below:** 2026-09-28
- **Target game version:** 1.0.16 (see [§d](#d-game-version-and-content))

## How to read this file

**Kind**

| Kind | Meaning |
|---|---|
| `official` | Iron Gate / Coffee Stain / Steam patch notes |
| `wiki` | Community wiki (Fandom, wiki.gg, weirdgloop). Facts OK; prose is CC BY-SA — never paste it |
| `community-data` | Community-maintained data files / tools |
| `decompile-derived` | Content that states it was derived from decompiled game code. We may cite **facts** (numbers, rule order) from it; we never copy its **code** |
| `press` | Guides, news sites |

**Confidence**

| Confidence | Meaning |
|---|---|
| `read` | The page or file itself was fetched and read during research |
| `snippet` | Only a search-engine summary was seen (the page was blocked by the session's network proxy). Treat as **unverified** until re-checked |
| `conflict` | Sources disagree; see notes |

**Pages blocked during research:** valheim.fandom.com, valheim.wiki.gg,
valheim.weirdgloop.org, kirilloid.ru, valheimgame.com, store.steampowered.com, the Unity
forums, the Jötunn docs site and valheim-map.world could not be fetched directly. Facts from
them are `snippet` until someone cross-checks them (see [Open verification items](#open-verification-items)).

---

## a. World generation: can a seed be reproduced exactly?

### Source list

| ID | Source | Kind | License | Confidence | Supports |
|---|---|---|---|---|---|
| S-WG-01 | [aritropaul/vegvisr](https://github.com/aritropaul/vegvisr) | decompile-derived | **None** (no LICENSE file → all rights reserved) | read | Rust→WASM + TS port targeting 1.0.7. Claims bit-exact RNG and Perlin, and 28 boss/trader/temple positions. Says its 1.0 terrain is "evidenced rather than byte-verified". Notes: `GetStableHashCode` checked against 2 real `.fwl` files; order of random draws; Perlin `abs()` mirroring and `(raw+0.69)/1.483` rescale (max error 2.3e-7 vs 176 Unity samples); double/float mixing in `GetBaseHeight`/`DUtils.Length`/`DUtils.Lerp`; ≈1 px in 400k biome flips if done in pure float32; vegetation not reproducible (physics raycasts). Transcribed from decompiles of 0.218.15 and 0.221.4. Repo created 2026-09-14 |
| S-WG-02 | [DoomMachine/Valheim-SeedLab](https://github.com/DoomMachine/Valheim-SeedLab) ([LICENSE](https://raw.githubusercontent.com/DoomMachine/Valheim-SeedLab/main/LICENSE)) | decompile-derived | **MIT** | read | C# (.NET 10) CLI plus local web UI. Targets 1.0.16. Claims 4,194,304/4,194,304 height codes and 12,182/12,182 locations bit-identical. Made from an ILSpy decompile of `assembly_valheim.dll`. States the game "evaluates in `double` and truncates to `float` per statement". Unique-location survival depends on the first zone generated, not the seed; rotations and some dungeon interiors are not predictable. Created 2026-09-24 |
| S-WG-03 | [SeedLab spec: 01-worldgen-core.md](https://raw.githubusercontent.com/DoomMachine/Valheim-SeedLab/main/docs/specs/01-worldgen-core.md) | decompile-derived | MIT | read | Order of random draws, world size, lake/river parameters, worldGenVersion |
| S-WG-04 | [SeedLab reference: world-generator.md](https://raw.githubusercontent.com/DoomMachine/Valheim-SeedLab/main/.claude/skills/valheim-worldgen/references/world-generator.md) | decompile-derived | MIT | read | `GetBiome` order for 1.0.15/1.0.16, minimap 2048 px × 12 m/px, 1.0 alt-biome sector grid |
| S-WG-05 | [SeedLab reference: zones-locations-vegetation.md](https://raw.githubusercontent.com/DoomMachine/Valheim-SeedLab/main/.claude/skills/valheim-worldgen/references/zones-locations-vegetation.md) | decompile-derived | MIT | read | 64 m zones, sea level 30 m, location placement |
| S-WG-06 | [SeedLab study: constraint-atlas.md](https://raw.githubusercontent.com/DoomMachine/Valheim-SeedLab/main/docs/studies/constraint-atlas.md) | decompile-derived | MIT | read | Per-location min/max distance and observed ranges (start temple, traders, altars) for 1.0.15 |
| S-WG-07 | [davrum/assembly_valheim WorldGenerator.cs](https://raw.githubusercontent.com/davrum/assembly_valheim/main/WorldGenerator.cs) | decompile-derived | Redistributed decompiled code (no rights granted) | read | Pre-1.0 (post-Ashlands) `GetBiome`, height functions, `m_minMountainDistance` = 1000. **Facts only; never copy code** |
| S-WG-08 | [m3talstorm/valhiem_server WorldGenerator.cs (2021)](https://raw.githubusercontent.com/m3talstorm/valhiem_server/master/assembly_valheim/WorldGenerator.cs) | decompile-derived | Redistributed decompiled code | read | Pre-Mistlands rules (Mistlands noise 0.5, Swamp max 8000) |
| S-WG-09 | [macklinb gist: Unity Random (Xorshift128)](https://gist.github.com/macklinb/a00be6b616cbf20fa95e4227575fe50b) | community-data | None | read | `InitState` seeding with constant 1812433253; Xorshift128 |
| S-WG-10 | [corgonia/fwl (Go)](https://pkg.go.dev/github.com/corgonia/fwl) | community-data | MIT | read | `GetStableHashCode` implementation / `.fwl` parsing |
| S-WG-11 | [Unity forum: Mathf.PerlinNoise source](https://forum.unity.com/threads/mathf-perlinnoise-function-source-code-question-on-2d-3d-implementations.518304/) | community | n/a | snippet | Unity's Perlin source is unpublished; standard Perlin does not match |
| S-WG-12 | [Jötunn docs: zones tutorial](https://valheim-modding.github.io/Jotunn/tutorials/zones.html) | community | n/a | snippet | One location per 64 m zone; prioritized locations get 200,000 placement attempts vs 100,000 |
| S-WG-13 | [JereKuusela/valheim-expand_world_data, docs/locations.md](https://github.com/JereKuusela/valheim-expand_world_data/blob/main/docs/locations.md) | community-data | Unlicense | read | Location constraint fields: `minAltitude`/`maxAltitude`, `biomeArea`, min/max distance as fractions of world radius, `minDistanceFromSimilar`, `inForest`, terrain delta. Can dump location/biome YAML from a running game |
| S-WG-14 | [valheim-map.world](https://valheim-map.world/) | community tool | No public source found | snippet | The long-standing exact seed map (JS); credited by vegvisr as the reference |
| S-WG-15 | [BjarkeCK/ValheimSeedFinder](https://github.com/BjarkeCK/ValheimSeedFinder) ([LICENSE](https://raw.githubusercontent.com/BjarkeCK/ValheimSeedFinder/main/LICENSE)) | community-data | MIT | read | C#/Unity biome analysis; exactness not stated. Last pushed 2026-09-05 |
| S-WG-16 | [slaghag/seed-atlas](https://github.com/slaghag/seed-atlas) | decompile-derived | None | read | JS; "reverse-engineered from game files"; `GetTerrainDelta` sample points (`insideUnitCircle`) not recovered |
| S-WG-17 | [kirilloid/valheim](https://github.com/kirilloid/valheim) | community-data | **No OSS license** (README claims fair use; points to game EULA) | read | TS wiki and calculators; no world generator. Location data used in [§c](#c-location-types) |
| S-WG-18 | [scscodes/valheim-world-engine](https://github.com/scscodes/valheim-world-engine) | community | None | read | Uses exported images from valheim-map.world; runs a real Valheim server container |
| S-WG-19 | [JereKuusela/BetterContinents](https://github.com/JereKuusela/BetterContinents) ([LICENSE](https://raw.githubusercontent.com/JereKuusela/BetterContinents/main/LICENSE)) | mod | LGPL-2.1 | read | Worldgen-altering mod, not a port |
| S-WG-20 | [f00d4tehg0dz/valheim-webmap](https://github.com/f00d4tehg0dz/valheim-webmap) | mod | Not checked | read | Exports terrain/heightmaps from a live server |
| S-WG-21 | [porohkun/ValheimMjod](https://github.com/porohkun/ValheimMjod) | mod | GPL-3.0 | read | Archived 2022-12-11; contains a `ValheimDecompiled/` folder. Example of publicly redistributed decompiled code |
| S-WG-22 | [ABTanjir/valheim-seed-map-viewer-windows](https://github.com/ABTanjir/valheim-seed-map-viewer-windows) | **suspicious** | n/a | read | No source; downloads go to a redirect domain. **Probable malware lure. Never link or use** |
| S-WG-23 | [Valheim EULA](https://www.valheimgame.com/eula/) | official | n/a | snippet | Reportedly prohibits users to "reverse engineer, decompile, disassemble … or otherwise attempt to derive the source code" |
| S-WG-24 | [PC Gamer: Valheim world generator](https://www.pcgamer.com/this-valheim-world-generator-helps-you-discover-the-perfect-seed/) | press | n/a | snippet | valheim-map.world online and publicized since 2021 |
| S-WG-25 | [PCGamesN: Valheim map generator](https://www.pcgamesn.com/valheim/map-generator) | press | n/a | snippet | valheim-map.world is a browser (JS) tool |
| S-WG-26 | [Jötunn location-list.md](https://github.com/Valheim-Modding/Jotunn/blob/dev/JotunnLib/Documentation/data/zones/location-list.md) | community-data | see repo | **not accessed** | Planned cross-check for the location list |

### Findings

**Pipeline**
- The seed string is hashed with `GetStableHashCode` into an int32 (S-WG-01, S-WG-10).
- `UnityEngine.Random.InitState(seed)` then seeds Xorshift128 (S-WG-09).
- Seven integers are drawn with `Random.Range(-10000, 10000)`, in this exact order: off0, off1, off2, off3, riverSeed, streamSeed, off4 (S-WG-01, S-WG-03). `Range(int,int)` keeps Unity's modulo bias (S-WG-01).

**What exact reproduction requires**
1. **Unity's `Mathf.PerlinNoise`, bit for bit.** It is not standard Perlin: inputs go through `abs()` and output is rescaled. Unity has never published its source (S-WG-01, S-WG-11).
2. **C# double/float semantics.** In JS/TS that means `Math.fround` after every statement that the game evaluates as float (S-WG-01, S-WG-02).
3. **The exact order of random draws** (S-WG-01, S-WG-03).
4. **The exact location table and its load order**, which is per game version (S-WG-01, S-WG-13). Prioritized locations are placed first (S-WG-12).

**What cannot be reproduced even by an exact port**
- Which candidate of a unique location survives. It depends on the first zone a player generates (S-WG-02).
- Object rotations and some dungeon interiors (S-WG-02).
- Vegetation, which depends on physics raycasts (S-WG-01).
- Mods such as Expand World or Better Continents change the rules (S-WG-13, S-WG-19).

**Legal**
- Every exact implementation found states it was derived from decompiled game code (S-WG-01, S-WG-02, S-WG-16).
- The EULA reportedly forbids decompiling (S-WG-23, snippet).
- An MIT license from a porter cannot grant rights the porter never had.
- The community has tolerated these tools since 2021 (S-WG-24), but that toleration is not a license. This is not legal advice.

**Options evaluated** (full comparison in `docs/DECISION.md`)

| Option | Reusable | Not reusable | Effort | Risk |
|---|---|---|---|---|
| Reuse a permissive port | SeedLab (MIT), ValheimSeedFinder (MIT), fwl hash (MIT) | vegvisr, seed-atlas, valheim-map.world (no license) | 1–3 weeks to port SeedLab from C# to TS, plus golden-seed harness | Medium legal risk (decompile origin); must re-verify after each patch |
| Our own port from our own decompile | Public algorithm facts only | Everything else; the decompile itself is a reported EULA breach | 3–6 weeks | Highest |
| Link or iframe valheim-map.world | A URL | Its code | < 1 day | Low for a link; an iframe needs permission (unverified). The site could disappear |
| Valheim-inspired approximation | Our own noise, plus public rules and numbers | Exact match to real seeds | 1–2 weeks | Low; maps won't match players' worlds |
| Data dumped from the game via a mod, shipped as JSON | EWD (Unlicense) / webmap export | Game assets | 1–2 weeks, plus about 64 MB per seed at 4096² | Lowest code risk. Shipping the derived data is unverified. Only covers pre-dumped seeds |

---

## b. Biome layout rules

### Source list

| ID | Source | Kind | Confidence | Supports |
|---|---|---|---|---|
| S-BIO-01 | = S-WG-07 (pre-1.0 decompile) | decompile-derived | read | `GetBiome` order and thresholds pre-1.0; mountain suppression near spawn |
| S-BIO-02 | = S-WG-03 / S-WG-04 / S-WG-05 (SeedLab, 1.0.15/1.0.16) | decompile-derived | read | 1.0 rule order, world size, heights, sea level, minimap, alt-biomes |
| S-BIO-03 | = S-WG-08 (2021 decompile) | decompile-derived | read | worldGenVersion ≤ 1 thresholds |
| S-BIO-04 | [Steam: Mistlands patch 0.212.7](https://store.steampowered.com/news/app/892970/view/3647382900915760340) | official | snippet | "terrain generation change … to increase the amount of Mistlands" |
| S-BIO-05 | [Steam: Ashlands patch 0.218.15](https://store.steampowered.com/news/app/892970/view/4199120329650080822) | official | snippet | Terrain around Ashlands and the outer rim lowered and turned to ocean |
| S-BIO-06 | [weirdgloop wiki: Biomes](https://valheim.weirdgloop.org/w/Biomes) | wiki | snippet | Land ends 10,000 m from centre; Swamp only 2,000–6,000 m |
| S-BIO-07 | [Fextralife: Valheim 1.0 release](https://fextralife.com/valheim-release/) | press | snippet | 1.0 release 2026-09-09 |
| S-BIO-08 | [Mobalytics: Valheim 1.0 overview](https://mobalytics.gg/gamebase/previews/valheim-1-0-overview) | press | snippet | 1.0 content overview; existing worlds only get new generation in unexplored areas |

### Findings

**Coordinates and scale**
- Coordinates are world metres: x = east, z = north. The worldgen code calls z "wy".

**World size** (S-BIO-01, S-BIO-02)
- Playable radius `worldSize` = 10,000 m. `waterEdge` = 10,500 m.
- Beyond 10,000 m, terrain is pulled toward −0.2 normalized; between 10,490 and 10,500 m it is pulled to −2.
- Beyond 10,500 m the floor is fixed at −400 m.
- Zones are 64 × 64 m. Sea level (`c_WaterLevel`) is 30 m. The in-game minimap is 2048 px at 12 m/px (≈24.6 km across).

**Height scale** (S-BIO-01, S-BIO-02)
- Height in metres = normalized height × 200.
- Sea level = 0.15 normalized = 30 m. Ground between 0.02 and 0.15 is shallow water.
- Mountains start above 0.4 normalized (80 m). I found no sourced number for typical peak height (open item).

**Biome decision** (`GetBiome`, first match wins; 1.0.15/1.0.16 per S-BIO-02; S-BIO-01 agrees except where noted)

Definitions used in the table:
- `d` = distance from (0, 0).
- `base` = `GetBaseHeight`, normalized.
- `A = sin(atan2(x, z) · 20) · 100`: a ±100 m wobble with 20 lobes, one every 18°.
- Noise = `PerlinNoise((off + x) · 0.001, (off + z) · 0.001)`.

| # | Test | Biome |
|---|---|---|
| 1 | (only when `waterAlwaysOcean`) height ≤ `oceanLevel` (0.02) | Ocean |
| 2 | distance from (0, +4000) > 12000 + A | **Ashlands** (far south, from z ≈ −8000) |
| 3 | base ≤ 0.02 | Ocean |
| 4 | distance from (0, −4000) > 12000 + A | **Deep North** (far north, from z ≈ +8000) |
| 5 | base > 0.4 | Mountain |
| 6 | noise(off0) > 0.6 **and** 2000 < d < 6000 **and** 0.05 < base < 0.25 | Swamp |
| 7 | noise(off4) > 0.4 **and** 6000 + A < d < 10000 | Mistlands |
| 8 | noise(off1) > 0.4 **and** 3000 + A < d < 8000 | Plains |
| 9 | noise(off2) > 0.4 **and** 600 + A < d < 6000 | Black Forest |
| 10 | d > 5000 + A | Black Forest (fallback) |
| 11 | otherwise | Meadows |

**Notes on the table**
- **Only lower bounds wobble.** The Mistlands, Plains and Black Forest lower bounds include A; their upper bounds and both Swamp bounds are fixed (S-BIO-02).
- **Ashlands has the same shape in every seed.** It is tested before the ocean check. It covers ≈12.4% of the 10,500 m disc, with its nearest point ≈7,908 m from centre (S-BIO-02).
- **Deep North varies with the seed**, because it is tested after the ocean check (S-BIO-02).
- **Deep North mountains changed in 1.0.** Before 1.0: base > 0.4 inside the Deep North area → Mountain. In 1.0 that check is gone and Deep North height = base + 0.1 (S-BIO-01 vs S-BIO-02).
- **Noise channels.** Base height uses off0 (x) and off1 (z). Biome masks use off0 = Swamp, off4 = Mistlands, off1 = Plains, off2 = Black Forest. Per-biome detail noise uses off3 (S-BIO-01, S-BIO-02).
- **Mountains are rare near spawn.** Within `m_minMountainDistance` = 1000 m, base height above 0.28 is squashed toward 0.28–0.38 (S-BIO-01).
- **Moats.** A smoothstep "gap" scales height from 0 on the Ashlands and Deep North boundary circles up to 1 at 400 m away, carving an ocean channel along both borders. Ashlands also has seed-independent cellular noise (S-BIO-01, S-BIO-02).
- **Rivers and lakes.**
  - Rivers only lower terrain, to 0.12–0.14 normalized (24–28 m).
  - River width is 60–100 m; there are 3,000 stream attempts at 20 m wide.
  - The lake search runs on a 128 m grid, merging points closer than 800 m.
  - In 1.0, streams are placed in two passes: non-Deep-North first, then Deep North.
  - Channels fade in 744–1,000 m from centre.
  - (S-BIO-01, S-BIO-02)
- **1.0 alt-biomes.** There are 32 alt-biome variants. They are assigned per flood-filled region of the 12 m sector grid using `InitState(seed + 920)`, and the gameplay/minimap biome comes from this grid (S-BIO-02).
- **worldGenVersion.** New worlds are version 2.
  - Version 0: mountain-free radius 1,500 m.
  - Version ≤ 1: Mistlands threshold 0.5, Swamp max 8,000 m (S-BIO-02, S-BIO-03).
  - Linking version 2 to Mistlands 0.212.7 is **inferred** from S-BIO-04.

**Plain-language ring summary** (derived from the table)

| Range | Biomes |
|---|---|
| 0 – ~600 m | Meadows only |
| 600 – 6,000 m | Black Forest patches among Meadows |
| 2,000 – 6,000 m | Swamps in low, flat ground |
| 3,000 – 8,000 m | Plains |
| Beyond ~5,000 m | Leftover land becomes Black Forest, so Meadows effectively stop around 5 km |
| 6,000 – 10,000 m | Mistlands |
| Anywhere high | Mountains, rarely within 1 km of centre |
| Far south, from ~8 km | Ashlands |
| Far north, from ~8 km | Deep North |
| 10 – 10.5 km | The world ends in ocean |

---

## c. Location types

### Source list

| ID | Source | Kind | Confidence | Supports |
|---|---|---|---|---|
| S-LOC-01 | [kirilloid/valheim, src/data/location/ @ commit `ae63432`](https://github.com/kirilloid/valheim/tree/master/src/data/location) | community-data (no OSS license: **cite facts; do not copy files**) | read (via GitHub) | Prefab, biome, placement quantity, prioritized flag, distance and altitude limits, Vegvisir links; includes Deep North |
| S-LOC-02 | = S-WG-06 (SeedLab constraint atlas, 1.0.15) | decompile-derived | read | Min/max distances, observed ranges for start temple, Haldor and altars |
| S-LOC-03 | [game8: Hildir quests / minibosses](https://game8.co/games/Valheim/archives/619372) | press | snippet | Brenna, Geirrhafa, Zil & Thungr locations and chests |
| S-LOC-04 | [Fandom: Lord Reto](https://valheim.fandom.com/wiki/Lord_Reto) | wiki | snippet | Tomb of Lord Reto = `PlaceofMystery3`; Dyrnwyn hilt |
| S-LOC-05 | = S-WG-13 (Expand World Data) | community-data | read | Constraint field semantics |

### Findings

Column meanings:
- **Qty** = placement *attempts* per world (`quantity`). The real count is often lower.
- **P** = prioritized.
- **Dist** = min–max metres from centre ("–" means no limit).

All rows come from S-LOC-01 unless another source is named.

**Start, boss altars and Vegvisirs**

| Prefab | Biome | Qty | P | Dist | Vegvisir found in |
|---|---|---|---|---|---|
| `StartTemple` | Meadows | 1 | ✓ | searched from centre outward; seen at 71–228 m (S-LOC-02) | Holds all boss stones; `Vegvisir_Eikthyr` |
| `Eikthyrnir` | Meadows | 3 | ✓ | 0–1000 | Start temple |
| `GDKing` (The Elder) | Black Forest | 4 | ✓ | 1000–7000 | `Ruin2`, `StoneTowerRuins03` (30%) |
| `Bonemass` | Swamp | 5 | ✓ | 2000– (S-LOC-02: max 10000; Swamp limits it to ~6 km) | `SwampRuin1/2` (30%) |
| `Dragonqueen` (Moder) | Mountains | 3 | ✓ | 0–8000; altitude 150–500 | `StoneTowerRuins04` |
| `GoblinKing` (Yagluth) | Plains | 4 | ✓ | – | `StoneHenge1–5` (40%), `StoneTower1/3` (25%) |
| `Mistlands_DvergrBossEntrance1` (The Queen) | Mistlands | 5 | ✓ | – | Infested Mine rooms (20%) |
| `FaderLocation` (Fader) | Ashlands | 5 (**conflict**: S-LOC-02 reports 3) | ✓ | – | `CharredFortress`; `CharredRuins2` (10%) |
| `DN_Bossroom` (Kall Fimbulbringer) | Deep North | 3 | ✓ | altitude ≥ 80 | `NorthMemorialPlace` (**conflict**: guides say the bottom of Mörkhalla; kirilloid `objects.ts` names the location `FrozenKing`) |

**Traders** (all prioritized and flagged `unique`; whether only one is kept per world is **unverified** for Hildir and the Bog Witch)

| Prefab | NPC | Biome | Qty | Dist |
|---|---|---|---|---|
| `Vendor_BlackForest` | Haldor | Black Forest | 10 | 1500– (one kept; seen at 2,108–10,056 m per S-LOC-02) |
| `Hildir_camp` | Hildir | Meadows | 10 | 3000–8000 per S-LOC-02; S-LOC-01 lists 3000– |
| `BogWitch_Camp` | Bog Witch | Swamp | 10 | 3000–8000 |

**Dungeons**

| Prefab | Biome | Qty | P | In-game name / notes |
|---|---|---|---|---|
| `Crypt2`, `Crypt3`, `Crypt4` | Black Forest | 200 each | | Burial Chambers |
| `TrollCave02` | Black Forest | 200 | | Troll Cave |
| `BearCave` | Black Forest | 50 | | Bear cave; likely 1.0 (**unverified**) |
| `Hildir_crypt` | Black Forest | 3 | ✓ | Smouldering Tomb, 3000– m; miniboss Brenna (S-LOC-03) |
| `SunkenCrypt4` | Swamp | 175 | ✓ | Sunken Crypt (variants 1–3 disabled) |
| `MountainCave02` | Mountains | 160 | | Frost Cave |
| `Hildir_cave` | Mountains | 3 | ✓ | Howling Cavern, 1000– m; miniboss Geirrhafa (S-LOC-03) |
| `Hildir_plainsfortress` | Plains | 3 | ✓ | Sealed Tower; minibosses Zil & Thungr (S-LOC-03) |
| `Mistlands_DvergrTownEntrance1`, `…2` | Mistlands | 120 each | ✓ | Infested Mine |
| `MorgenHole1`, `2`, `3` | Ashlands | 40 each | | Putrid Hole; 25% chance of a Vegvisir to a Place of Mystery |
| `PlaceofMystery1`, `2`, `3` | Ashlands | 1 each | ✓ | Sword-piece sites; #3 = Tomb of Lord Reto (S-LOC-04) |
| `TheHole01` | Deep North | 40 | | Large house with a hole; probably the Winding Tunnels entrance (**inferred**) |
| `MorkBorg` | Deep North | 40 | | Mörkhalla |
| `TheDarkestHole` | Deep North | 1 | ✓ | Possibly "The Prison" (**unverified**) |

**Structures and landmarks** (a representative subset; the full list is transcribed as facts in Phase 1)

| Biome | Prefab: qty (constraints) |
|---|---|
| Meadows | `WoodVillage1`: 15 (2000–10000; Draugr village) · `WoodFarm1`: 10 (500–2000) · `WoodHouse1/2`: 20 each · `Dolmen01/02/03`: 100/100/50 (Meadows + Black Forest) · `StoneCircle`: 25 · `ShipSetting01`: 100 · `CombatRuin01`: 5 (1500–) · `Runestone_Meadows`: 100 · `Runestone_Boars`: 50 |
| Black Forest | `Ruin1/2`: 200 each · `StoneHouse3/4`: 200 each · `StoneTowerRuins03, 07–10`: 80 each · `Greydwarf_camp1`: 300 · `Runestone_BlackForest`: 50 · `Runestone_Greydwarfs`: 25 (–2000) |
| Swamp | `SwampRuin1/2`: 30 each · `SwampHut1/2`: 50 each · `SwampWell1`: 25 · `FireHole` (Surtling geyser): 75 · `InfestedTree01` (Guck tree): 700 · `Grave1`: 200 · `Runestone_Swamps`: 100 · `Runestone_Draugr`: 50 |
| Mountains | `StoneTowerRuins04/05` (watchtowers): 50 each · `AbandonedLogCabin02–04`: 33–50 · `DrakeNest01`: 200 · `MountainWell1`: 25 · `MountainGrave01`: 100 · `Waymarker01/02`: 50 each · `AncientUpgradeStation`: 10 (500–; possibly the Forge of Potential, **unverified**) · `Runestone_Mountains`: 100 · `DrakeLorestone`: 50 |
| Plains | `GoblinCamp2` (Fuling village): 200 · `StoneTower1/3`, `Ruin3`: 50 each · `StoneHenge1–4`: 5 each · `StoneHenge5/6`: 20 each · `TarPit1–3`: 100 each · `Runestone_Plains`: 100 |
| Black Forest, Swamp, Plains, Ocean | `ShipWreck01–04`: 25 each |
| Mistlands | `Mistlands_Giant1/2` (Jotun skeletons, P): 350/100 · `Mistlands_Swords1–3`: 33 each · `Mistlands_Excavation1–3`: 40 each · `Mistlands_Lighthouse1_new`: 100 · `Mistlands_GuardTower*`: 20–80 · `Mistlands_Harbour1`: 100 · `Mistlands_Viaduct1/2`: 100/150 · `Mistlands_Statue*`: 200 · `Mistlands_RoadPost1`: 500 · `Mistlands_RockSpire1`: 200 · `Runestone_Mistlands`: 50 |
| Ashlands | `CharredFortress`: 20 (bell-fragment altar) · `FortressRuins`: 200 · `CharredRuins1`: 75 · `CharredRuins2–4`: 100 each · `CharredTowerRuins1–3` and `CharredTowerRuins1_dvergr`: 30–40 · `AshlandRuins`: 100 · `VoltureNest`: 350 · `SulfurArch`: 200 · `LeviathanLava`: 100 · `CharredStone_Spawner`: 350 · `Runestone_Ashlands`: 75 |
| Deep North | `NorthVillage`: 135 · `DN_hut01`: 40 · `NorthMemorialPlace`: 15 · `IcePond1`: 40 · `LumberCamp`: 50 · `DN_gammeltrollFrac01/02`: 30 each · `ShipSetting02/03`: 100/50 · `ShipWreck01_DN/02_DN`: 170/120 · `FrozenShip01–03_DN`: 50 each (8000–9750) · `Runestone_DeepNorth`: 70 |

**Not placed as locations**
- Ocean Leviathans, mud piles and ancient swamp trees are probably placed as vegetation rather than locations (**unverified**).
- No "Troll camp" location and no "Stave hall" prefab were found.

---

## d. Game version and content

### Source list

| ID | Source | Kind | Confidence | Supports |
|---|---|---|---|---|
| S-VER-01 | [valheimgame.com: Valheim 1.0 has arrived](https://www.valheimgame.com/news/valheim-1-0-has-arrived-/) | official | snippet | 1.0 released 2026-09-09; left Early Access; Deep North; PC, Linux, Mac, Xbox, PS5, Switch 2 |
| S-VER-02 | [valheimgame.com: Valheim has a release date](https://www.valheimgame.com/news/valheim-has-a-release-date-/) | official | snippet | 1.0 release date |
| S-VER-03 | [valheimgame.com: Patch 1.0.16](https://www.valheimgame.com/news/patch-1-0-16/) | official | snippet | 1.0.16 on 2026-09-25: Deep North terrain edits no longer revert on unload; achievement fixes |
| S-VER-04 | [valheimgame.com: Hotfix 1.0.10 / 1.0.12](https://www.valheimgame.com/news/hotfix-1-0-10-1-0-12/) | official | snippet | Earlier 1.0 hotfixes |
| S-VER-05 | [Softcap: Valheim 1.0.16](https://softcap.online/posts/valheim-1-0-16-terrain-achievements-raid-spawn/) | press | snippet | 1.0.16 contents |
| S-VER-06 | [SteamDB: 0.218.15 patch notes](https://steamdb.info/patchnotes/14349377/) | official (mirror) | snippet | Ashlands, 2024-05-14 |
| S-VER-07 | [Steam: Bog Witch 0.219.13](https://store.steampowered.com/news/app/892970/view/4522269457743085719) | official | snippet | 2024-10-29 |
| S-VER-08 | [Steam: Call to Arms 0.221.4](https://store.steampowered.com/news/app/892970/view/529856925490219058) | official | snippet | Adrenaline, trinkets, reworked Forsaken powers; public test 2025-09-09 |
| S-VER-09 | [HostHavoc: Call to Arms](https://hosthavoc.com/blog/valheim-call-to-arms-update) | press | snippet | Call to Arms went live September 2025 |
| S-VER-10 | [Fandom: Version history](https://valheim.fandom.com/wiki/Version_history) | wiki | snippet | 0.220.x patches in 2025, e.g. 0.220.5 April Fools |
| S-VER-11 | [allthings.how: boss order](https://allthings.how/valheim-boss-order-all-seven-forsaken-and-how-to-summon-them/) | press | snippet | Boss order, biomes, summon items |
| S-VER-12 | [EIP: Forsaken powers overview](https://eip.gg/valheim/guides/forsaken-powers-overview/) | press | snippet | Power effects (may predate the 0.221 rework) |
| S-VER-13 | [BisectHosting: Fader guide](https://www.bisecthosting.com/blog/valheim-fader-boss-guide-location-summon-tips-loot-rewards) | press | snippet | Fader: 3 Bells, each crafted from 3 Bell fragments; Fader trophy and relic; power; Yagluth drop (Torn spirit) |
| S-VER-14 | [Fandom: Fader](https://valheim.fandom.com/wiki/Fader) | wiki | snippet | Fader summon and drops |
| S-VER-15 | [BisectHosting: Kall Fimbulbringer guide](https://www.bisecthosting.com/blog/valheim-kall-fimbulbringer-boss-deep-north-location-summon-tips-tricks-fight-guide-loot) | press | snippet | Deep North boss: `DN_Bossroom` (Aesir Passage); 3 Malicious blood at the Strange Bowl; drops Sacrificial blood and Crown jewel; no trophy and no power |
| S-VER-16 | [allthings.how: Aesir Passage](https://allthings.how/valheim-how-to-open-the-aesir-passage-and-summon-kall-fimbulbringer/) | press | snippet | Aesir Passage / summon |
| S-VER-17 | [gamerstogether: Deep North guide](https://gamerstogether.cz/en/valheim-deep-north-guide/) | press | snippet | Malicious blood: open Mörkhalla with an Intricate key, destroy the Malicious Ice, which triggers a Jotun invasion; the invasion core drops the blood |
| S-VER-18 | [game8: Forsaken powers (1.0)](https://game8.co/games/Valheim/archives/321605) | press | snippet | Post-rework power list, to verify before shipping power text |

### Findings

- **Current version.** Valheim **1.0** released **2026-09-09** and left Early Access (S-VER-01, S-VER-02, S-BIO-07). The latest public patch is **1.0.16** (2026-09-25) (S-VER-03).
- **We target 1.0.16**, worldGenVersion 2 (S-BIO-02).

**Timeline**

| Version | Name | Date | Source |
|---|---|---|---|
| 0.206 | Hearth & Home | Sept 2021 | **unverified** |
| 0.212 / 0.213 | Mistlands | Dec 2022 (0.212.7 on 2022-12-06) | S-BIO-04 (date **unverified**) |
| 0.218.15 | Ashlands | 2024-05-14 | S-VER-06 |
| 0.219.13 | Bog Witch | 2024-10-29 | S-VER-07 |
| 0.220.x | small patches | 2025 | S-VER-10 |
| 0.221.4 | Call to Arms | Sept 2025 | S-VER-08, S-VER-09 |
| 1.0 | Deep North | 2026-09-09 | S-VER-01 |
| 1.0.16 | latest patch | 2026-09-25 | S-VER-03 |

**Bosses** (in progression order)

| # | Boss | Biome | Location prefab | Summon | Notes |
|---|---|---|---|---|---|
| 1 | Eikthyr | Meadows | `Eikthyrnir` | 2 Deer trophies (S-VER-11) | Drops: **unverified** |
| 2 | The Elder | Black Forest | `GDKing` | 3 Ancient seeds (S-VER-11) | Drops: **unverified** |
| 3 | Bonemass | Swamp | `Bonemass` | 10 Withered bones (S-VER-11) | Drops: **unverified** |
| 4 | Moder | Mountains | `Dragonqueen` | Dragon eggs (count **unverified**) | |
| 5 | Yagluth | Plains | `GoblinKing` | Fuling totems (count **unverified**) | Drops Torn spirit (S-VER-13) |
| 6 | The Queen | Mistlands | `Mistlands_DvergrBossEntrance1` | Door sealed; key item **unverified** | |
| 7 | Fader | Ashlands | `FaderLocation` | 3 Bells, each crafted from 3 Bell fragments (S-VER-13, S-VER-14) | Drops Fader trophy and Fader relic |
| 8 | Kall Fimbulbringer | Deep North | `DN_Bossroom` (Aesir Passage) | 3 Malicious blood at the Strange Bowl (S-VER-15, S-VER-16) | No trophy and no power. Drops Sacrificial blood (offered at the start stones to finish the game) and Crown jewel |

- **Forsaken powers were reworked in 0.221** (S-VER-08). Pre-rework effect text (S-VER-12) must not ship until checked against S-VER-18.

**Minibosses**

| Miniboss | Biome | Location prefab | Reward | Source |
|---|---|---|---|---|
| Brenna | Black Forest | `Hildir_crypt` | Hildir's brass chest | S-LOC-03 |
| Geirrhafa | Mountains | `Hildir_cave` | Hildir's silver chest | S-LOC-03 |
| Zil & Thungr | Plains | `Hildir_plainsfortress` | Hildir's bronze chest | S-LOC-03 |
| Lord Reto | Ashlands | `PlaceofMystery3` | Dyrnwyn hilt | S-LOC-04 |
| Deep North minibosses | — | none found | — | — |

**Still in flux**
- Deep North balance and bug fixes; 1.0 is 3 weeks old.
- Any change to Deep North world generation.
- Power effect values.
- Deep North wiki pages are still incomplete.

---

## e. Content data (creatures, bosses, items, resources, food, stations)

### Source list

| ID | Source | Kind | License | Confidence | Supports |
|---|---|---|---|---|---|
| S-DATA-01 | [kirilloid/valheim `src/data` + `public/lang/en.json` @ `ae63432`](https://github.com/kirilloid/valheim/tree/ae63432a485d92d88e97de28f21258b6208ba69b/src/data) (commit dated 2026-09-21, after 1.0) | community-data (game-data extraction) | **None**: we record facts only, never copy files or prose | read | Creature health, attacks, damage modifiers, drops, spawn biomes; boss summons and Forsaken powers (`effects.ts`); weapon/armor/tool stats and recipes; resources, food stats; crafting stations; weather per biome (`env.ts`); English names |
| S-DATA-02 | [valheim.tools: Frostfire greatsword](https://www.valheim.tools/items/frostfire-greatsword) | community-data | not checked | snippet | The conflicting stat line for `frostfire-greatsword` (`items.json`, `confidence: "conflict"`). Registered in phase 7; cited since phase 4 |
| S-DATA-03 | [valheimplanner.com: frigid kiln](https://www.valheimplanner.com/build/frigid-kiln/) | community-data | not checked | snippet | The conflicting recipe for `frigid-kiln` (`crafting-stations.json`, `confidence: "conflict"`; recipe left out). Registered in phase 7; cited since phase 4 |

### How the content was gathered (2026-09-29)

- **The community wikis were unreachable.** valheim.fandom.com, valheim.wiki.gg,
  valheim.weirdgloop.org and kirilloid.ru were all refused by the session's network policy,
  including through WebFetch. To use them, add those domains to the environment's allowed
  network domains.
- **Primary source.** Instead, research agents read kirilloid's data modules at a pinned commit.
  - We evaluated the modules locally into JSON (outside the repo) so numbers were transcribed
    mechanically, not retyped.
  - Every content entry cites the exact file URL at that commit, e.g.
    `.../blob/ae63432.../src/data/creatures.ts`.
  - Entries backed by this dataset carry `"gameVersion": "1.0"`. It post-dates 1.0; the exact
    patch is unknown.
- **Search summaries.** A few facts come only from search-engine summaries of wiki pages. Those
  entries cite the wiki URL and are marked `"confidence": "snippet"`. Examples: some item
  names missing from `en.json`, and how Malicious blood is obtained.
- **Name typos corrected.** kirilloid's `en.json` has a few typos: "Fulling" for Fuling,
  "Wrait trophy", "Dvergr rouge". We corrected them because the same file spells them
  correctly elsewhere ("Fuling totem", "Wraith"), and each corrected entry says so in `notes`.
- **Conflicts** are marked `"confidence": "conflict"` with notes. Examples: the Queen's summon
  (kirilloid: 3 Seeker Soldier trophies vs. a search summary describing only the Sealbreaker
  door), three Deep North weapon stat lines, and the frigid kiln recipe.
- **Unverified values** are `null` and listed in `docs/DATA_TODO.md`.

## Open verification items

Each item must be resolved (source upgraded to `read`, or the data field left `null`)
before the related data ships.

1. Every `snippet` row in §d: re-read the official post, Steam page or wiki page directly.
2. Boss drops and summon counts marked **unverified** in §d.
3. Deep North boss: location prefab (`DN_Bossroom` vs `FrozenKing`) and where its Vegvisir is.
4. Fader altar quantity (5 vs 3).
5. Hildir's camp maximum distance; whether traders are one per world.
6. Deep North dungeon names (`TheHole01`, `TheDarkestHole`), and whether `AncientUpgradeStation` is the Forge of Potential.
7. Cross-check the location list against Jötunn `location-list.md` (S-WG-26) or a live
   Expand World Data dump from a 1.0.16 install.
8. Typical mountain peak height and ocean depth distribution (for terrain scaling in Path B).
9. The EULA wording (S-WG-23).
10. The Ashlands/Deep North offset signs, as seen on a real minimap (Ashlands must be south).
12. Everything in `docs/DATA_TODO.md` (generated list of null content values), and a second-source
    check of the content data against a wiki once the wiki domains are allowed.
11. The reference point for location altitude limits (`minAltitude`/`maxAltitude`, S-WG-13). The data
    and approx-v1 treat them as metres above sea level; confirm against a real install. Affects
    `moder-altar` (150–500 m) and `deep-north-boss` (≥ 80 m).
