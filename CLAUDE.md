# CLAUDE.md: Valheim Atlas

Valheim Atlas is an interactive 3D, orbitable map of a Valheim world (a disc with a 10 km radius and ocean beyond it) for newcomers and veterans.

- Product spec: `docs/SPEC.md`
- World-generation path: `docs/DECISION.md`
- Research log and source IDs: `docs/SOURCES.md`
- **Target game version: 1.0.16.** It is set in `data/meta.json` and must never be hard-coded anywhere else.

## Non-negotiable rules

1. **No copyrighted game material.** Do not add any of the following to the repo:
   - game textures, models, icons, fonts, screenshots, music or audio;
   - decompiled game code;
   - files copied from unlicensed repos (e.g. kirilloid's data files, vegvisr);
   - pasted wiki prose (Fandom is CC BY-SA).

   Write our own words and make our own assets: SVG icons, procedural shaders, our own colour palette.
2. **Every game fact comes from `data/*.json` and carries a source.**
   - A game fact is a name, number, drop, biome rule or location constraint.
   - Each record has a non-empty `sources: SourceId[]`, and every ID must exist in `data/sources.json`, which mirrors `docs/SOURCES.md`.
   - Components, generator code and tests read facts through `src/data/`. **Never write game facts as literals in TS/TSX.**
   - Test fixtures may use invented values only when they are clearly fake (e.g. `"test-biome"`).
3. **No invented stats.** If no source gives a value, the field is `null` and the UI shows "Unknown". Never guess, interpolate or "fill in plausible" numbers. When sources conflict, set `confidence: "conflict"` and add `notes`.
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
├─ CLAUDE.md
├─ docs/                  SPEC.md, DECISION.md, SOURCES.md
├─ data/                  game facts, all JSON, all sourced
│  ├─ meta.json           targetGameVersion, worldGenVersion, dataUpdated
│  ├─ sources.json        SourceRef[]; IDs match docs/SOURCES.md
│  ├─ world.json          world constants (radius, sea level, zone size…)
│  ├─ biome-rules.json    ordered biome decision table
│  ├─ biomes.json  locations.json  bosses.json  creatures.json
│  ├─ items.json  progression.json  tips.json
├─ public/                only self-made assets (icons, favicon)
├─ scripts/               node scripts (validate-data.ts, bake-world.ts)
├─ src/
│  ├─ app/                App.tsx, routing, layout, providers
│  ├─ scene/              r3f components: World, Terrain, Ocean, Sky, Markers, CameraRig
│  ├─ worldgen/           PURE TS, no React/three/DOM; runs in a Web Worker
│  │  ├─ rng.ts  noise.ts  biome.ts  height.ts  placement.ts
│  │  ├─ sources/         WorldSource implementations (approx-v1, …)
│  │  └─ worker.ts
│  ├─ data/               schema.ts (zod), loaders, typed selectors
│  ├─ state/              Zustand stores (world, ui, layers, progress, url-sync)
│  ├─ ui/                 panels, drawers, legend, search, badges
│  └─ lib/                small shared helpers (math, format, geometry)
└─ tests/e2e/             Playwright specs
```

Unit tests sit next to their code as `*.test.ts(x)`.

## Code style

- Use named exports; no default exports except for Vite/React entry points.
- File names are `kebab-case.ts`. React components are `PascalCase.tsx`, one component per file.
- Don't use `any`. Prefer `unknown` plus zod parsing at every boundary (JSON, URL, worker messages).
- `worldgen/` must be deterministic:
  - no `Math.random`;
  - no `Date`;
  - all randomness comes from the seeded PRNG in `rng.ts`.

  Worker messages are typed discriminated unions.
- Keep react-three-fiber render loops allocation-free:
  - reuse vectors;
  - use `InstancedMesh` for markers;
  - never call `setState` inside `useFrame`.
- Units are metres. Coordinates are x = east, z = north, y = up. Name variables with a unit suffix: `distM`, `heightM`.
- Comments explain *why*. Cite a source ID when code implements a documented rule, e.g. `// S-BIO-02: Ashlands tested before ocean`. The numbers themselves stay in `data/`.
- UI text is plain and friendly for newcomers. Spoiler-sensitive content respects `progress.tier`.

## Commands

Scripts are created in Phase 1.

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then build for production |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint and Prettier check |
| `npm run format` | Prettier write |
| `npm test` | Vitest (unit) |
| `npm run test:e2e` | Playwright (Chromium) |
| `npm run validate:data` | Check `data/*.json` against the zod schemas, verify every source ID and cross-reference resolves, and require numbers to be sourced or `null` |
| `npm run check` | Run typecheck, lint, test and validate:data (the pre-push gate) |

## Definition of done

**All phases** require:
- `npm run check` passes, and `npm run test:e2e` passes once it exists.
- No new un-sourced game facts, and no assets that break the rules above.
- Docs are updated (SPEC, SOURCES, and this file if conventions change).
- Changes are committed with a clear message and pushed.

| Phase | Scope | Done when |
|---|---|---|
| **0: Research and docs** | SOURCES, SPEC, DECISION, CLAUDE.md | All four docs are written and cited, and the user has confirmed the DECISION path |
| **1: Scaffold and data** | Vite + React + TS strict app shell; zod schemas; `validate:data`; seed data (`meta`, `sources`, `world`, `biome-rules`, `biomes`, `bosses`, core `locations`) | `npm run dev` shows an empty canvas; `validate:data` passes and fails on a deliberately broken fixture (tested); every record has sources |
| **2: World generator** | `worldgen/` for the chosen path: PRNG, noise, biome rules from data, heights, location placement; worker plus progress | Same seed gives byte-identical output (tested); biome-rule unit tests cover every row of `biome-rules.json` (Ashlands south, Deep North north, ring bands); a 512² generation takes < 3 s in Node; no React/three imports in `worldgen/` (lint rule) |
| **3: 3D scene** | Terrain mesh, biome texture, water, ocean ring, sky, camera controls, reset and top-down views | Orbit, zoom and pan are smooth at ≥ 50 fps on integrated graphics; an e2e test checks that the canvas renders and camera controls respond; no game assets |
| **4: Locations and panels** | Instanced markers, layers and legend, info panels, search and filter, fly-to | Every panel shows sources and confidence; unknown values show "Unknown"; e2e tests cover search → select → panel → fly-to |
| **5: Newcomer and veteran modes** | Progression guide, spoiler-safe mode, tips, seed input, measure tool, URL state, approximation badge and link-out | All user stories N1–N8 and V1–V8 in SPEC §4 meet their acceptance criteria, each with a test or a documented manual check |
| **6: Polish and release** | Accessibility, reduced motion, performance budget, About page, static deploy | Lighthouse accessibility ≥ 90; bundle under budget (SPEC §8); "not affiliated with Iron Gate/Coffee Stain" disclaimer shown; deployed build verified |

## Workflow notes

- Work in plan mode for any multi-file change. Present the plan and wait for approval.
- Research that adds facts must first add or update entries in `docs/SOURCES.md` and `data/sources.json`, with `confidence` recorded honestly (`read` / `snippet` / `conflict`).
- Open verification items live at the bottom of `docs/SOURCES.md`. Don't ship data that depends on an open item. Leave that field `null`.
