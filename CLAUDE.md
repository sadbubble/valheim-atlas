# CLAUDE.md: Valheim Atlas

Valheim Atlas is an interactive 3D, orbitable map of a Valheim world (a disc with a 10 km radius and ocean beyond it) for newcomers and veterans.

- Product spec: `docs/SPEC.md`
- World-generation path: `docs/DECISION.md`
- Research log and source IDs: `docs/SOURCES.md`
- **Target game version: 1.0.16.** It is set in `public/data/meta.json` and must never be hard-coded anywhere else.

## Non-negotiable rules

1. **No copyrighted game material.** Do not add any of the following to the repo:
   - game textures, models, icons, fonts, screenshots, music or audio;
   - decompiled game code;
   - files copied from unlicensed repos (e.g. kirilloid's data files, vegvisr);
   - pasted wiki prose (Fandom is CC BY-SA).

   Write our own words and make our own assets: SVG icons, procedural shaders, our own colour palette.
2. **Every game fact comes from `public/data/*.json` and carries a source.**
   - A game fact is a name, number, drop, biome rule or location constraint.
   - Each record has a non-empty `sources` list. Each entry is either an https URL of the exact page or file the fact comes from (preferred for content, e.g. a pinned GitHub blob URL), or a source ID that exists in `public/data/sources.json`, which mirrors `docs/SOURCES.md`.
   - Components, generator code and tests read facts through `src/data/`. **Never write game facts as literals in TS/TSX.**
   - Test fixtures may use invented values only when they are clearly fake (e.g. `"test-biome"`).
3. **No invented stats.** If no source gives a value, the field is `null` and the UI shows "Unknown". Never guess, interpolate or "fill in plausible" numbers. When sources conflict, set `confidence: "conflict"` and add `notes`.
   - `null` always means "unknown / unverified" and is listed in `docs/DATA_TODO.md` (generated). It never means "not applicable": omit optional fields instead (e.g. a location with no distance limit has no `maxDistM`).
   - Every content entry has `description` (beginner-friendly), `veteranNotes`, `biomeIds`, `tier`, `dangerLevel` (editorial rating), `spoilerLevel` (0 safe / 1 mild / 2 major), `sources` and `gameVersion`. See `src/data/content-schema.ts`.
4. **Label approximations.** Anything produced by the `approx-v1` generator must show the "Approximation" badge. Never claim to show a player's real world unless the active `WorldSource.isExact` is true.
5. **Pin the version.** When a patch changes a fact, update the data with new sources and bump `meta.targetGameVersion` in the same commit.
6. **Security and hygiene.**
   - No tracking or analytics.
   - No links to suspicious "seed viewer" downloads (see S-WG-22).
   - Outbound links go only to sources listed in SOURCES.md or to valheim-map.world.

## Stack

- **Build and language:** Vite; TypeScript with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **UI and 3D:** React, `@react-three/fiber`, `@react-three/drei`.
- **State:** Zustand, with one store per concern and a URL-sync middleware for shareable state.
- **Data validation:** zod schemas in `src/data/schema.ts`, used both at runtime and by `validate:data`.
- **Tests:** Vitest for unit tests; Playwright for end-to-end tests (Chromium only in CI; `PLAYWRIGHT_BROWSERS_PATH` is preconfigured, so do not run `playwright install`).
- **Lint and format:** ESLint (typescript-eslint strict, react-hooks) and Prettier.
- **Package manager:** npm, with the lockfile committed.

Do not add new runtime dependencies without a one-line justification in the PR description.

## Folder structure

```
/
├─ CLAUDE.md  README.md
├─ index.html  debug.html  app entry; biome-map debug page (2D canvas)
├─ docs/                  SPEC.md, DECISION.md, SOURCES.md, DATA_TODO.md (generated list of nulls)
├─ scripts/               validate-data.ts (npm run validate:data, run with tsx)
├─ public/
│  ├─ data/               game facts, all JSON, all sourced; fetched at runtime
│  │  ├─ meta.json        targetGameVersion, worldGenVersion, dataUpdated
│  │  ├─ sources.json     SourceRef[]; IDs match docs/SOURCES.md
│  │  ├─ world.json  biome-rules.json           world generation facts
│  │  ├─ biomes.json  bosses.json  creatures.json  resources.json  items.json
│  │  ├─ crafting-stations.json  food.json  progression.json  locations.json  tips.json
│  └─ favicon.svg         only self-made assets
├─ src/
│  ├─ main.tsx            entry point
│  ├─ app/                App.tsx (root: full-screen Canvas + HUD), app.css, app-level hooks
│  ├─ world/              world generation (approx-v1, docs/DECISION.md Path B)
│  │  ├─ api.ts           generateWorld(seed, resolution, {onProgress}) → worker + IndexedDB cache
│  │  ├─ generator-info.ts  GENERATOR_ID, IS_APPROXIMATION, resolution limits, revision
│  │  ├─ generate.ts      pure, deterministic generateWorldSync (runs inside the worker)
│  │  ├─ terrain.ts  biome.ts  placement.ts  noise.ts  math.ts  grid.ts  rng.ts
│  │  ├─ tuning.ts        approx-v1 tuning: the ONLY place for non-fact generator numbers
│  │  ├─ types.ts         GeneratedWorld (zod schema + type)
│  │  ├─ protocol.ts  handle-request.ts  worker.ts  client.ts   Web Worker plumbing
│  │  └─ cache.ts         IndexedDB cache (main thread)
│  ├─ render/             3D renderer (r3f); game coords are mirrored (scale z = -1) in WorldScene
│  │  ├─ WorldCanvas.tsx  WorldScene.tsx  Terrain.tsx  Water.tsx  WorldRim.tsx  Props.tsx
│  │  ├─ Starfield.tsx  CameraRig.tsx  SurfacePicker.tsx  AdaptiveQuality.tsx
│  │  ├─ chunks.ts  terrain-geometry.ts   LOD layout/selection; crack-free chunk meshes
│  │  ├─ surface-textures.ts  terrain-model.ts  props.ts  prop-geometry.ts  pick.ts
│  │  ├─ materials.ts  shaders/        our own GLSL (no game assets)
│  │  ├─ render-config.ts  palette.ts  props-config.ts   visual tuning + original palette
│  │  └─ debug-hooks.ts   window.__atlas (ready, get/setView, stats) for e2e/screenshots
│  ├─ data/               schema.ts + content-schema.ts (zod), load.ts (typed loaders incl. loadContent),
│  │                      validate.ts (all data rules; used by scripts/validate-data.ts and tests)
│  ├─ state/              Zustand stores; url-state.ts (?seed=&mode=&layer=) + url-sync.ts
│  ├─ ui/                 HUD, panels, drawers, legend, search, badges
│  ├─ debug/              debug.html app: biome map renderer, stats, placement report
│  ├─ test/               Node-only test helpers (read public/data from disk)
│  └─ lib/                small shared helpers (math, format, geometry)
├─ docs/screens/          renderer screenshots at 3 zoom levels + stats.json (npm run screens)
└─ tests/e2e/             Playwright specs (+ playwright.config.ts at the root)
```

Unit tests sit next to their code as `*.test.ts(x)`.

## Code style

- Use named exports; no default exports except for Vite/React entry points.
- File names are `kebab-case.ts`. React components are `PascalCase.tsx`, one component per file.
- Don't use `any`. Prefer `unknown` plus zod parsing at every boundary (JSON, URL, worker messages).
- `world/` generation code (everything the worker runs) must be deterministic:
  - no `Math.random`;
  - no `Date`;
  - no `Math.sin/cos/atan2/pow/exp` in generation: they are not bit-identical across engines (see `math.ts`);
  - all randomness comes from the seeded PRNG in `rng.ts`.
- Generator numbers that are **not** game facts (noise frequencies, height shaping, placement
  tries) go in `src/world/tuning.ts`, never inline. Changing tuning or generator output means bumping
  `GENERATOR_REVISION` so cached worlds are invalidated.

  Worker messages are typed discriminated unions.
- `src/render` coordinates: data is in game coordinates (x east, z north); the world group in
  `WorldScene` mirrors z because three.js is right-handed. Convert camera positions with
  `z = -scene.z` before comparing with data. Visual numbers go in `render-config.ts`,
  colours in `palette.ts` (original palette only).
- Keep react-three-fiber render loops allocation-free:
  - reuse vectors;
  - use `InstancedMesh` for markers;
  - never call `setState` inside `useFrame`.
- Units are metres. Coordinates are x = east, z = north, y = up. Name variables with a unit suffix: `distM`, `heightM`.
- Comments explain *why*. Cite a source ID when code implements a documented rule, e.g. `// S-BIO-02: Ashlands tested before ocean`. The numbers themselves stay in `public/data/`.
- UI text is plain and friendly for newcomers. Spoiler-sensitive content respects `progress.tier`.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies (Node ≥ 22) |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (`tsc -b`), then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b --noEmit` across the app, test and tooling tsconfigs |
| `npm run lint` | ESLint (typescript-eslint strict type-checked, react-hooks) and Prettier check |
| `npm run format` | Prettier write (Markdown is excluded so doc tables stay hand-aligned) |
| `npm test` | Vitest (unit); `npm run test:watch` for watch mode |
| `npm run perf` | Times a 1024² world generation (target ~3 s on a mid-range laptop; the test fails above 6 s) |
| `npm run check` | typecheck, lint, test and validate:data together: the pre-push gate |
| `npm run validate:data` | Validates every `public/data/*.json`: strict schemas (missing or unknown fields fail), sources (URL or registered ID), unique ids, cross-references, per-biome completeness, weaknesses vs damage modifiers, and that `docs/DATA_TODO.md` is current. `-- --write-todo` regenerates DATA_TODO.md; `-- --schema-only --dir <path>` checks partial drafts |
| `npm run test:e2e` | Playwright e2e in Chromium with software WebGL (SwiftShader); starts a dev server on :4179 |
| `npm run screens` | Regenerates `docs/screens/*.png` and `stats.json` (tagged `@screens`, skipped by `test:e2e`) |

## Definition of done

**All phases** require:
- `npm run check` passes (includes `validate:data`), and `npm run test:e2e` passes.
- No new un-sourced game facts, and no assets that break the rules above.
- Docs are updated (SPEC, SOURCES, and this file if conventions change).
- Changes are committed with a clear message and pushed.

| Phase | Scope | Done when |
|---|---|---|
| **0: Research and docs** | SOURCES, SPEC, DECISION, CLAUDE.md | All four docs are written and cited, and the user has confirmed the DECISION path |
| **1: Scaffold and data** | Vite + React + TS strict app shell; zod schemas; `validate:data`; seed data (`meta`, `sources`, `world`, `biome-rules`, `biomes`, `bosses`, core `locations`) | `npm run dev` shows an empty canvas; `validate:data` passes and fails on a deliberately broken fixture (tested); every record has sources |
| **2: World generator** | `world/` for the chosen path: PRNG, noise, biome rules from data, heights, location placement; worker plus progress | Same seed gives byte-identical output (tested); biome-rule unit tests cover every row of `biome-rules.json` (Ashlands south, Deep North north, ring bands); a 512² generation takes < 3 s in Node; no React/three imports in `world/` (lint rule) |
| **3: 3D scene** | Terrain mesh, biome texture, water, ocean ring, sky, camera controls, reset and top-down views | Orbit, zoom and pan are smooth at ≥ 50 fps on integrated graphics; an e2e test checks that the canvas renders and camera controls respond; no game assets |
| **4: Locations and panels** | Instanced markers, layers and legend, info panels, search and filter, fly-to | Every panel shows sources and confidence; unknown values show "Unknown"; e2e tests cover search → select → panel → fly-to |
| **5: Newcomer and veteran modes** | Progression guide, spoiler-safe mode, tips, seed input, measure tool, URL state, approximation badge and link-out | All user stories N1–N8 and V1–V8 in SPEC §4 meet their acceptance criteria, each with a test or a documented manual check |
| **6: Polish and release** | Accessibility, reduced motion, performance budget, About page, static deploy | Lighthouse accessibility ≥ 90; bundle under budget (SPEC §8); "not affiliated with Iron Gate/Coffee Stain" disclaimer shown; deployed build verified |

## Workflow notes

- Work in plan mode for any multi-file change. Present the plan and wait for approval.
- Research that adds facts must cite them (URL or registered ID) and record `confidence` honestly (`read` / `snippet` / `conflict`); new source families also get an entry in `docs/SOURCES.md` and `public/data/sources.json`.
- The community wikis are blocked in this cloud environment; see `docs/SOURCES.md` §e for how content was sourced instead.
- Open verification items live at the bottom of `docs/SOURCES.md`. Don't ship data that depends on an open item. Leave that field `null`.
