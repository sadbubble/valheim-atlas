# User-story audit (SPEC §4)

Audit of every user story in `docs/SPEC.md` §4 against its acceptance criteria, done in
phase 6 (2026-09-29, branch `claude/eager-galileo-lw2rru`). Each row points to an automated
test, or to a manual check when automation is impractical. Re-run this audit whenever a
story's feature changes.

**Result: 13 met, 3 partial, 0 not met.**

Evidence abbreviations:
- `modes` = `tests/e2e/modes.spec.ts`
- `interaction` = `tests/e2e/interaction.spec.ts`
- `scene` = `tests/e2e/scene.spec.ts`
- Unit tests are given by path.

## Newcomer

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| N1 | Biome layer on by default | met | `src/state/url-state.test.ts` › "returns defaults for an empty query" (`DEFAULT_LAYERS` includes `biomes`); terrain is always biome-coloured |
| N1 | Distance rings | met | Manual check M1 below (shader overlay; not measurable from the DOM) |
| N1 | Hovering shows the biome name and its tier | met | `modes` › "biome threats flag creatures as hostile or passive (N4); hover shows biome tier (N1)"; biome labels also carry a "Tier N" tooltip |
| N2 | Guide shows the next boss, summon items and altar biome; everything cited | met | `src/ui/progression-model.test.ts` (every boss step resolves boss, summon items, altar and altar biome from data, all with sources; "next" = first step not ticked off); `modes` › "progression guide: boss link → info panel → fly to region; spoilers stay hidden" |
| N3 | Spoiler-safe mode is on by default and hides everything beyond the next tier | partial | `src/state/url-state.test.ts` › "effectiveSpoiler"; `src/state/prefs.test.ts` (precedence URL > storage > mode default); `interaction` › "spoiler setting hides late-game detail until revealed"; `modes` › guide test (hidden step shows no names) and "search finds guide steps and never names spoiler-hidden entries". **Why partial:** the setting has three editorial levels (spoiler-free / mild / major, per entry), not SPEC F7's "I have defeated up to boss N". Level 0 shows roughly tiers 1–2. |
| N4 | Biome panel lists its creatures, flagged hostile or passive, with sources | met | `modes` › "biome threats flag creatures as hostile or passive (N4)…" (Threats tab lists threats and all other creatures of the biome, each flagged Hostile / Neutral / Passive / Boss; each creature panel has its sources footer) |
| N5 | Searching an item shows the biomes and locations that yield it; "unknown" when unsourced | met | `modes` › "searching a resource shows where it is found, \"unknown\" when unsourced (N5)". Locations always show "unknown" because `locations.json` has no sourced loot tables (PROJECT_STATUS open item) |
| N6 | Each biome and boss panel shows ≥ 1 tip tagged `newcomer`, with a source | partial | `src/data/story-coverage.test.ts` › "N6…": Meadows, Black Forest, Mountains and Plains have newcomer tips. **Gaps pinned by the test:** Swamp, Mistlands, Ashlands, Deep North, Ocean and all 8 bosses have tips tagged only `all` or `veteran`, or none. Closing this needs new sourced tips (out of scope for phase 6; no invented content) |
| N7 | Location panel explains the category in plain language, with contents and biome | met | `modes` › "location panels explain their category in plain words (N7)"; `src/data/validate.test.ts` › "fails when the location-category glossary is incomplete or unsourced"; `src/data/story-coverage.test.ts` › "N7…" (glossary text in `public/data/location-categories.json`, our own words, sourced). Contents = description/veteran notes; biome = "Biomes" row |
| N8 | On-screen controls hint | met | `modes` › "\"Yes\" gives the spoiler-free newcomer setup…" (hint shown on first visit, closed, re-opened via "Controls help") |
| N8 | Reset view button | met | `scene` › "camera controls respond: drag orbits, wheel zooms, reset returns"; `modes` › "top-down view button and keyboard camera controls" (R key) |
| N8 | Keyboard and touch both work | met | Keyboard: `modes` › "top-down view button and keyboard camera controls" (arrows pan, + zooms, T/R). Touch: manual check M2 below |

## Veteran

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| V1 | The seed box regenerates the world in < 10 s on a mid-range laptop | met | `modes` › "the seed box regenerates the world, still labelled as an approximation (V1)"; `src/world/generate.perf.test.ts` (1024² world, fails above 6 s in Node); timing on real hardware: manual check M3 |
| V1 | The Approximation badge is shown under Path B | met | `scene` › "renders the world and labels it as an approximation"; `modes` › V1 test (badge after regenerating) |
| V2 | Per-type and per-category filters; counts shown | met | `modes` › "layer counts and per-type filters (V2)"; `src/render/interaction-model.test.ts` › "filters single location types and counts locations per layer and type (V2)"; `src/state/url-state.test.ts` (`hide=` round-trips in the URL) |
| V3 | "Nearest …" from a clicked point highlights the result and flies to it | met | `modes` › "find the nearest trader from a pin: highlight, panel and fly (V3)"; `src/render/interaction-model.test.ts` › "finds the nearest accepted location from a point (V3)". Also: search flies to the nearest match to the view centre (`interaction` › smoke test) |
| V4 | The measure tool gives straight-line metres | met | `interaction` › "pins, measuring and a shareable link" |
| V5 | Location panel shows quantity, prioritized flag, min/max distance and altitude, sourced | met | `modes` › "location panels explain their category in plain words (N7)" (checks the placement rows and the sources footer). Omitted limits show "no limit"; null ones show "unverified" |
| V6 | Copying the URL reproduces the seed, camera, layers and selection | met | `interaction` › "pins, measuring and a shareable link" (seed, camera, layers, pins); `modes` › "a copied link reopens the selected panel (V6)" (`sel=`); `src/state/url-state.test.ts` (`hide=` and `sel=` round-trip) |
| V7 | The version is always visible in the About page and footer | met (footer) | `modes` › "link-out to valheim-map.world…" (footer shows "Target game version x.y.z" from `meta.json`); manual check M4. The About page is phase 7 scope (SPEC F12) |
| V8 | Under Path B, an outbound link to valheim-map.world with the seed | partial | `modes` › "link-out to valheim-map.world (seed format undocumented → home page)". **Why partial:** neither `docs/DECISION.md` nor `docs/SOURCES.md` records the site's per-seed URL format, so the link opens the home page instead of guessing one. The tooltip says so and names the seed, and a "Copy seed" button helps paste it there. Linking straight to the seed needs a sourced URL format first |

> V7 is counted as met for the footer (the only surface that exists before phase 7). If the
> About-page half is counted, V7 becomes partial until phase 7 ships.

## Manual checks

Run these against `npm run dev` (or the production build) when the related feature changes.

| # | Steps | Expected |
|---|---|---|
| M1 | Open Layers & tools, tick "Grid & coordinates, distance rings", zoom out to the whole world | Warm circles around the world centre every grid step (1 km, `render-config.ts`), plus the square grid with brighter axes |
| M2 | On a phone or tablet (or Chrome DevTools device mode with touch), drag with one finger, drag with two fingers, pinch | One finger orbits, two fingers pan, pinch zooms (drei `OrbitControls` defaults); tap on a marker opens its panel |
| M3 | On a mid-range laptop, enter a new seed and press Go; time until "World ready" | Under 10 s (the Node perf test targets ~3 s for the same 1024² grid) |
| M4 | Look at the footer on any view | "Target game version 1.0.16" (read from `public/data/meta.json`) |
