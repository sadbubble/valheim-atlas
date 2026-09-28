# Decision: Exact-seed reproduction (Path A) vs Valheim-inspired generator (Path B)

- **Status:** PROPOSED. Awaiting user confirmation (see the end of this document).
- **Date:** 2026-09-28
- **Target game version:** 1.0.16

Source IDs refer to `docs/SOURCES.md`.

## The question

- **Path A (exact):** from a seed string, reproduce the real Valheim 1.0.16 world: terrain, biomes and location positions.
- **Path B (approximation):** a seed-based generator that follows Valheim's published layout rules and numbers, using our own noise and RNG. It is clearly labelled **"Approximation"** in the UI.

## What the research found

1. **Exact reproduction is technically possible, but every known implementation comes from decompiled game code.**
   - vegvisr (Rust→WASM, 1.0.7) has **no license** (S-WG-01).
   - Valheim-SeedLab (C#, 1.0.16) is **MIT** and claims bit-identical heights and locations (S-WG-02).
   - valheim-map.world has no public source (S-WG-14).
   - All three are either unlicensed or say they were built from a decompile. The EULA reportedly forbids decompiling (S-WG-23, unverified snippet). An MIT license on a port cannot grant rights the porter didn't have.
2. **Exactness is fragile.** Path A must match:
   - Unity's closed-source `Mathf.PerlinNoise` (S-WG-01, S-WG-11);
   - C# float truncation after every statement (`Math.fround` everywhere) (S-WG-01, S-WG-02);
   - Unity's Xorshift128 random generator and the exact order of random draws (S-WG-03, S-WG-09);
   - the exact per-version location table and its load order (S-WG-13).

   Any patch that touches worldgen can break it silently.
3. **Some things are unpredictable even when exact.**
   - Which unique location survives depends on where players explore first (S-WG-02).
   - Vegetation depends on physics raycasts (S-WG-01).
   - 1.0 adds alt-biome sector grids (S-BIO-02), which is a new surface that has barely been verified.
4. **The rules are public facts.** Biome order, thresholds, distance bands, world size, sea level, zone size and location constraints are all documented as facts (S-BIO-01, S-BIO-02, S-LOC-01). A generator driven by these facts, using our own noise, reproduces the *character* of a Valheim world:
   - the rings;
   - Ashlands in the south and Deep North in the north, with their moats;
   - Swamps in the lowlands and mountains on high ground;
   - altars within their distance bands.

   It carries no dependency on game code.

## Options compared

| # | Option | Exact? | Effort | Legal / licence risk | Maintenance | Newcomer value | Veteran value |
|---|---|---|---|---|---|---|---|
| A1 | Port SeedLab (MIT, decompile-derived) to TS | Yes, for 1.0.16 | 1–3 weeks, plus a golden-seed harness | **Medium–high**: decompile origin | High: re-verify every patch | High | **Very high** |
| A2 | Our own port from our own decompile | Yes | 3–6 weeks | **Highest**: we would breach the reported EULA terms ourselves | High | High | Very high |
| A3 | Link or iframe valheim-map.world | Yes (theirs) | < 1 day | Low for a link; an iframe needs permission | None, but it could disappear | Low | Medium |
| **B** | **Rule-driven approximation** | No | 1–2 weeks | **Low**: facts only; our own code and noise | Low: update `data/*.json` when rules change | **High** | Medium (plus an A3 link-out → **High**) |
| A4 | Ship JSON of a few worlds dumped from the game by a mod | Yes, for the dumped seeds only | 1–2 weeks, plus about 64 MB per seed | Low–medium: the redistribution status of derived data is unverified | Medium | High | Low (fixed seeds only) |

## Recommendation: Path B, with an A3 link-out, behind a pluggable `WorldSource`

1. **Build Path B as the default generator** (`generator: "approx-v1"`).
   - Implement the biome decision table from `data/world.json` / `biome-rules.json` (S-BIO-02). Inputs:
     - world radius 10,000 m and water edge 10,500 m;
     - the A wobble and the offset circles for Ashlands and Deep North;
     - the Swamp height band and mountain suppression within 1 km.
   - Use our own seeded PRNG (e.g. `sfc32` / `mulberry32` from a string hash) and our own simplex or Perlin noise, with octave scales chosen to *look* like Valheim.
   - Place locations with the public constraints: biome, `quantity` attempts, `prioritized` first, distance and altitude limits, and one per 64 m zone (S-LOC-01, S-WG-12, S-WG-13).
   - The same seed always gives the same approximate world. That determinism is tested.
   - The **"Approximation"** badge is always visible, and it explains the difference.
2. **Veterans get the exact map via a link, not by reproducing it:** "View the exact map for seed X on valheim-map.world". No iframe or scraping.
3. **Architecture keeps Path A possible without committing to it.**

   ```ts
   interface WorldSource {
     id: "approx-v1" | "exact-1.0.16" | "dump";
     label: string;                 // shown in UI
     isExact: boolean;
     supportsSeed(seed: string): boolean;
     generate(seed: string, opts: { resolution: number }, onProgress?: (p: number) => void): Promise<GeneratedWorld>;
   }
   ```

   The UI depends only on `GeneratedWorld` (see `docs/SPEC.md` §6). An exact provider could be added later as a separate, clearly licensed module if you accept the risk. Nothing else would change.
4. **Why not Path A now?**
   - Every route to exactness leads back to decompiled code.
   - It carries an ongoing patch-tracking burden.
   - The main newcomer value (biomes, bosses, progression, tips, what spawns where) needs *correct rules and facts*, not exact coordinates.

### What Path B gets right vs wrong

| Correct (sourced rules) | Approximate / wrong |
|---|---|
| Biome ring distances, rule order, Ashlands south, Deep North north, moats | Exact coastlines, islands and mountain positions for a given seed |
| Which locations appear in which biome, within which distance bands | Exact coordinates of any location in a player's real world |
| World size, sea level, zone grid | Rivers and lakes (simplified) |
| Progression, bosses, summons, drops (from `data/`) | Alt-biome variants in 1.0 (not modelled in v1) |

## Fallback plan

- **If Path B terrain looks unconvincing or is too slow in the browser:**
  1. Drop the resolution to 256², and move biome sampling to a GPU fragment shader. The rules are simple enough to express in GLSL.
  2. If that is still not enough, bake one **canonical demo world** at build time, ship it as a static binary asset, and keep live seed generation behind a feature flag until it is ready.
- **If you choose Path A instead:**
  1. Implement A1 (a SeedLab-derived TS port) as a separate `worldgen/exact/` module, with its licence and provenance documented in `docs/SOURCES.md`.
  2. Build a golden-seed test harness: compare heights, biomes and altar positions against SeedLab's published outputs for ≥ 5 seeds.
  3. **Auto-fallback:** if validation fails, the seed input can't be handled, or the game version isn't `1.0.16`, use `approx-v1` and show the Approximation badge.
  4. Keep Path B as the always-available baseline.
- **If valheim-map.world goes away:** remove the link-out. Nothing else depends on it.
- **If a patch changes worldgen rules:** update `data/biome-rules.json` and `data/locations.json` with new sources, then bump `meta.targetGameVersion`. The Path B code should not need to change.

## Consequences
- The app never claims to show "your" world under Path B. The copy must say that plainly.
- All worldgen constants are data (`data/*.json` with sources), not code literals. This is consistent with the rules in `CLAUDE.md`.
- No decompiled or unlicensed code or data files enter the repo.

---

## Awaiting user confirmation

**Please confirm one of the following before any app code is written:**

1. **Path B (recommended):** rule-driven approximation, "Approximation" badge, link-out to valheim-map.world.
2. **Path A1:** exact reproduction by porting the MIT SeedLab code. You accept the decompile-origin risk; Path B stays as the fallback.
3. **Path A4 variant:** Path B, plus a small set of exact worlds dumped from the game by a mod.
4. **Something else.**
