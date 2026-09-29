# Project status

> **Read this file first in any new session before touching code.**
> It is the single source of truth for project progress. Update it in the same commit whenever a
> phase finishes, a key decision changes or an open item is resolved.

Last updated: 2026-09-29 (phase 8) · Branch: `claude/eager-galileo-lw2rru` · Target game version: see
`public/data/meta.json`.

## Phases

| # | Phase | Status | Commit | Summary |
|---|---|---|---|---|
| 0 | Research and docs | done | `82f29cf`, `3d8fc5b` | Research with sources (SOURCES), SPEC, DECISION (Path B accepted by the user), CLAUDE.md |
| 1 | Scaffold | done | `66c476b` | Vite + React + TS strict + r3f/drei + Zustand app shell, typed `?seed=&mode=` URL state, tests/lint |
| 2 | World generator | done | `c064f65` | Deterministic approx-v1 generator in a Web Worker, sourced biome rules and location placement, IndexedDB cache, debug biome map |
| 3 | 3D renderer | done | `afbc165` | Chunked crack-free LOD terrain, stylized shaders, water, floating-disc presentation, instanced props, orbit/focus camera, e2e tests |
| 4 | Data layer | done | `5122666` (WIP `0ae5c83`) | Sourced content JSON (biomes, bosses, creatures, resources, items, stations, food, progression, locations, tips), `validate:data`, generated DATA_TODO |
| 5 | Interactivity | done | `82104ee` | Clustered SVG-icon markers, layer panel, fuzzy search → fly → highlight, tabbed info panel with spoiler gating and "unverified", pins, measure, share link, X/Z readout |
| 6 | Newcomer and veteran modes | done | `0895eeb` | Progression guide (tier strip, boss/summon/altar per step, fly-to, "next" tracking), first-run "New to Valheim?" dialog, controls hint, keyboard camera, top-down view, reduced motion, location-category glossary (`location-categories.json`), valheim-map.world link-out, spoiler/mode persistence, per-type filters with counts, "find nearest" from a pin, shared selection; user-story audit in `docs/USER_STORIES.md` (13 met, 3 partial) |
| 7 | Polish and release | done (deploy pending: the owner must enable Pages) | `97d0ad1` | About / data view (`?about=1`, lazy-loaded) and an always-visible disclaimer; axe audit in e2e (0 violations) and Lighthouse accessibility 96–100; landmarks, skip link, inert modals, 24/44 px targets, contrast; live reduced motion (camera, damping, shader clock, CSS); phone layout with bottom sheets; `npm run budget` (389 kB gzipped of 1.5 MB); relative-base static build, CSP meta, sub-path smoke test; CI and GitHub Pages workflows; outbound-link test. Details: `docs/RELEASE.md` |
| 8 | Visual refinements | done | see git log (`feat: visual refinements (phase 8)`) | Terrain prep (surface textures, chunk layout, coarse meshes, anchors) in a second Web Worker with transferable buffers; shaders compiled one at a time behind a new loading screen (stage names + percent), world fades in; long tasks after generation 600 + 215 ms → none over 172 ms in five runs (software WebGL; the test fails above 200 ms); smooth search-highlight edge from a blurred mask built in the worker; biome labels hide while under HUD controls (Lighthouse a11y 100); aerial-perspective haze + horizon band, arced fly-to, selected-marker halo and label hover; all instant/frozen under reduced motion. Details: `docs/RELEASE.md` §Phase 8 |

### How this numbering maps to CLAUDE.md's Definition of done

CLAUDE.md's Definition-of-done table uses the same sequential numbering as this table.
Phase 6 is done: every user story N1–N8 and V1–V8 has a test or a documented manual check
(`docs/USER_STORIES.md`). Three stories are only partly met because of data or scope limits,
listed under *Gaps against CLAUDE.md criteria* below. Phase 7 is done except the part only the
repository owner can do: enabling GitHub Pages and verifying the deployed build (steps in
`docs/RELEASE.md`). Phase 8 is done against its Definition-of-done row (added in phase 8).

When the two disagree, the gaps below are what is actually missing.

## Key decisions (already made)

- **World shape: a flat disc, not a sphere.**
  - The playable radius is 10 km (about 20 km across), with ocean out to the water edge. The
    numbers come from `public/data/world.json`.
  - It is presented as a small floating world: starfield, rim glow, crust wall.
- **World generation: Path B, a rule-driven approximation** (`docs/DECISION.md`, accepted by the
  user). Sourced layout rules drive our own noise, and every world is labelled "Approximation".
  Exact reproduction of real seeds is out of scope.
- **Stack:** Vite, TypeScript (strict), React, react-three-fiber, drei, Zustand, zod, Vitest,
  Playwright.
- **Data source.**
  - The community wiki domains (valheim.fandom.com, valheim.wiki.gg, valheim.weirdgloop.org)
    and kirilloid.ru are blocked by this cloud environment's network policy.
  - Content facts therefore come from kirilloid's game-data extraction on GitHub, pinned to
    commit `ae63432`. Each entry cites the exact file URL at that commit.
  - The dataset has no OSS license: we store facts only, never files or prose.
  - Details: `docs/SOURCES.md` §e.
- **Spoiler defaults (implemented):** newcomers start spoiler-free (level 0) and veterans see
  everything (level 2). Users can change it (`?spoiler=`) or reveal single entries.
  A boss shares the spoiler level of its biome and guide step (level 0 covers tiers 1–2), and
  `validate:data` fails if a guide step is less gated than the boss or biome it names.
  - The choice is remembered in `localStorage` (`valheim-atlas:prefs`, `src/state/prefs.ts`).
    Precedence: URL > stored value > the mode's default.
  - Search never names an entry above the setting unless the query is its exact name; hidden
    matches are only counted. Hidden info panels are titled "Hidden boss" etc.
- **First run:** with no stored answer and no `mode`/`spoiler` in the URL, a "New to Valheim?"
  dialog asks once. Yes = newcomer + progression guide open; No = veteran + all layers; Esc or
  Skip keeps the defaults. e2e tests start as a returning visitor via Playwright
  `storageState` (`playwright.config.ts`); `tests/e2e/modes.spec.ts` opts out to test it.
- **valheim-map.world link-out** goes to the site's home page: its per-seed URL format is not
  recorded in `docs/SOURCES.md`/`DECISION.md`, so we do not guess one. The UI says so and
  offers "Copy seed". If a sourced format is found, put the seed into the link.
- **Static deploy (phase 7):** the build uses a relative base (`./`) so one `dist/` works at a
  domain root or under GitHub Pages' `/<repo>/`; a Content-Security-Policy `<meta>` is added at
  build time (static hosts can't send headers). Deploys go through
  `.github/workflows/deploy.yml`; `ci.yml` runs check, budget and e2e. See `docs/RELEASE.md`.
- **About view (F12):** a modal dialog, deep-linkable as `?about=1`, loaded on demand. It
  reads the version from `meta.json`, lists `sources.json` and counts unverified values from
  the loaded data (same rule as `DATA_TODO.md`).
- **Unverified values:** `null` means unverified. It is never dropped: the UI shows it as
  "unverified" and it is listed in the generated `docs/DATA_TODO.md`.

## Known open items

- **48 unverified data fields:** every `null` in `public/data`, listed in `docs/DATA_TODO.md`.
  Fixing them needs a second source, e.g. once the wiki domains are allowed.
- **Missing location loot tables:** `locations.json` has no loot data, so the Loot tab for
  locations says so rather than guessing.
- **Open verification items** at the bottom of `docs/SOURCES.md`: Deep North boss prefab, Fader
  altar count, Hildir's max distance, altitude reference, and others.
- **Conflicting facts marked `confidence: "conflict"`:** the Queen's summon, three Deep North
  weapon stat lines, and the frigid kiln recipe.
- **Shader programs are rebuilt for each new world** (seed change): per-world materials are
  recreated and the old ones disposed, so three.js releases and relinks their programs. It
  happens behind the loading screen, one shader per task (≤ ~200 ms each in software WebGL),
  so it is not a hitch, but keeping materials across worlds would make seed changes faster.
- **No licence chosen:** the repository has no `LICENSE`. The owner must choose one (code
  and our own assets); until then all rights are reserved. Game data stays facts-only.
- **Deployment not yet verified:** the Pages workflow can't run until the owner sets
  *Settings → Pages → Source: GitHub Actions*. After the first deploy, open the live URL,
  check a world loads, and add the link to the README.
- **Newcomer tips are missing for 13 panels** (SPEC N6): Swamp, Mistlands, Ashlands, Deep
  North, Ocean and all 8 bosses have no tip tagged `newcomer`. The list is pinned by
  `src/data/story-coverage.test.ts`; closing it needs new sourced tips.

### Gaps against CLAUDE.md criteria

- **60 fps is not measured on real hardware.** CI renders in software. Workload per view is in
  `docs/screens/stats.json` (≤ 223 draw calls, ≤ 0.37 M triangles).
- **User stories partly met** (details in `docs/USER_STORIES.md`):
  - N3: the spoiler setting has three editorial levels, not SPEC F7's "defeated up to boss N".
  - N6: newcomer tips are missing for 13 panels (see open items).
  - V8: the link-out opens valheim-map.world's home page, not the seed's map (no sourced URL
    format).
- **Manual-only checks:** touch controls, distance rings, and generation time on a real
  mid-range laptop (`docs/USER_STORIES.md` M1–M4).
- **Lighthouse is run by hand**, not in CI (recorded in `docs/RELEASE.md`; 100 on all four
  checked pages since phase 8). `tests/e2e/visuals.spec.ts` guards the label/HUD overlap that
  used to cost the mobile score.
- **Phase 7 "deployed build verified"** is pending the owner enabling Pages; the production
  build is verified locally under a sub-path by the `subpath` e2e project.
