# Valheim Atlas

An interactive, orbitable 3D map of a Valheim-style world for newcomers and veterans. It covers biomes, bosses, points of interest, progression and tips, and every game fact is sourced.

> **Fan-made. Not affiliated with or endorsed by Iron Gate or Coffee Stain.** Contains no game
> art, models, music, fonts or code: every icon, colour and shader is our own.

**Live site:** _not deployed yet_ (it will be at `https://<owner>.github.io/<repo>/` once the
repository owner enables GitHub Pages; see [Deploy](#deploy)).

> **Status: Phase 7 (polish and release) done; deployment waits on the owner enabling Pages.**
> The world (Path B, a rule-driven *approximation*; see [`docs/DECISION.md`](docs/DECISION.md))
> renders as a stylized 3D disc floating in space, with map markers, search, info panels, a
> progression guide, newcomer/veteran modes, pins, measuring and an About / data view.
> Progress: [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

| Overview | Region | Close-up |
| --- | --- | --- |
| ![Overview](docs/screens/1-overview.png) | ![Region](docs/screens/2-region.png) | ![Close-up](docs/screens/3-close.png) |

Screenshots are regenerated with `npm run screens` (`docs/screens/`).

## Data and sourcing policy

- Every game fact (a name, number, drop, biome rule or location constraint) lives in
  `public/data/*.json` and cites where it came from: the exact page or file, or a source ID
  from [`docs/SOURCES.md`](docs/SOURCES.md). The app never hard-codes game facts.
- Nothing is invented. A value no source gives is `null`, shown as **unverified** in the app
  and listed in [`docs/DATA_TODO.md`](docs/DATA_TODO.md). Sources that disagree are marked
  `conflict` and explained.
- Worlds from the `approx-v1` generator are always labelled **Approximation**: they follow the
  published layout rules but are not the real world for a seed.
- The target game version lives only in `public/data/meta.json`; the About view and bottom bar
  read it from there.
- No tracking, analytics, cookies, ads, CDNs or web fonts: the built site loads nothing from
  other origins (tested), and outbound links go only to listed sources or valheim-map.world
  (unit-tested).

## Requirements

- Node.js **22+** (npm 10+)
- A browser with WebGL 2

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

The default seed's world is generated in a Web Worker and shown in 3D, with an
**Approximation** badge. Drag to orbit, scroll to zoom, right-drag to pan, double-click to
fly to a spot (touch: one finger orbits, two pan, pinch zooms). The HUD has a relief
(vertical exaggeration, default 1.5×) slider, a trees & rocks toggle, an FPS/draw-call overlay
and reset / top-down view buttons. **About & sources** in the bottom bar shows the target game
version, the source list, how the world is made and how many values are still unverified.

To try the production build locally: `npm run build && npm run preview`
(<http://localhost:4173/>), or under a GitHub-Pages-style sub-path:
`npm run build && npm run serve:subpath` (<http://localhost:4180/valheim-atlas/>).

### Using the map

- **Search** (press <kbd>/</kbd>): fuzzy search over biomes, locations, bosses, creatures,
  items, resources and food. Choosing a result opens its info panel, highlights every biome
  and location it occurs in, and flies the camera to the nearest one.
- **Markers:** our own icons for boss altars, dungeons, traders, Vegvisirs, villages,
  landmarks and your pins. They stay a readable size at every zoom and cluster when zoomed
  out; click a cluster to zoom in. Hover for a tooltip; click to open the info panel.
- **Info panel:** Overview / Threats / Loot / Tips tabs from `public/data`, with sources,
  confidence and game version, plus a **Fly here** button. Every value we could not verify
  shows an **unverified** tag (never hidden). Entries above your spoiler setting are hidden
  until you choose "Show anyway".
- **Layers panel:** biome names, bosses, dungeons, traders, Vegvisirs, villages, runestones and
  landmarks, creatures and resources (per-biome badges that open the Threats/Loot tabs), a 1 km
  grid, and your pins. The spoiler setting defaults to spoiler-free for newcomers and to
  everything for veterans.
- **Tools:** place, drag, rename and delete pins (also via the pin list); measure the distance
  between two points; **Copy link** shares the seed, camera, layers, spoiler setting and pins.
- **Cursor readout:** game-style X/Z coordinates, height above sea and distance from centre.
- **Keyboard:** the first <kbd>Tab</kbd> offers "Skip to search"; <kbd>/</kbd> search, arrow
  keys/<kbd>Enter</kbd> in results, arrow keys/<kbd>Home</kbd>/<kbd>End</kbd> on tabs,
  <kbd>Esc</kbd> closes the tool, panel or dialog, <kbd>Delete</kbd> removes the selected pin; on
  the map, arrows pan, <kbd>+</kbd>/<kbd>−</kbd> zoom, <kbd>Q</kbd>/<kbd>E</kbd> rotate,
  <kbd>T</kbd> top-down, <kbd>R</kbd> reset. Everything on the map is also reachable from search,
  biome labels (buttons), the layer list, the guide and the pin list.
- **Accessibility:** landmarks, visible focus, 44 px touch targets on small screens,
  `prefers-reduced-motion` (camera jumps instead of flying; shader motion stops), axe-core e2e
  audit and Lighthouse accessibility 96–100 (`docs/RELEASE.md`).
- **Small screens:** the side drawer folds behind a **Menu** button and opens as a bottom
  sheet; the info panel is a bottom sheet with a sticky close button.

### Renderer (`src/render`)

- **Terrain:** 16 × 16 chunks with 4 distance-based LOD levels and frustum culling. Every
  LOD keeps a full-resolution border and zips it to the coarser interior, so neighbouring
  chunks always share edge vertices: no cracks, no skirts (unit-tested). Chunks fully under
  water are skipped.
- **Shading:** our own GLSL: faceted low-poly normals, soft biome blending from blurred
  biome textures, slope rock, snow above the snow line and in the Deep North, ash with
  glowing lava cracks in the Ashlands, dark drifting mist in the Mistlands, beaches.
- **Water:** animated stylized sea with depth tint and shoreline foam, drawn with a small
  polygon offset and discarded over land so it never z-fights with sea-level terrain.
- **Presentation:** starfield, glowing halo and atmosphere wall at the rim, a crust wall and
  tapered underside so the disc reads as a small floating world.
- **Props:** procedural low-poly trees, dead trees, rocks and spires per biome, instanced
  per chunk, built lazily near the camera and shrunk out with distance.
- **Performance:** dynamic near/far planes; adaptive pixel ratio (drops to 1× under 50 fps).
  Workload at the three screenshot views is in `docs/screens/stats.json` (≤ 221 draw calls,
  ≤ 0.37 M triangles).

### Debug biome map

Open <http://localhost:5173/debug.html?seed=HelloWorld&res=1024>. It draws the generated biome grid
on a 2D canvas (north up) with hillshading, water, location markers by category, a cursor
readout (x/z, distance, biome, height), biome shares, generation time, and the locations that
could not be fully placed. Worlds are cached in IndexedDB by seed; untick the cache box to time a
fresh generation.

## World generation (approx-v1)

`generateWorld(seed, resolution = 1024, { onProgress })` in `src/world/api.ts` returns
`{ world, fromCache }`:

- `world.height`: `Float32Array` (metres) and `world.biomes`: `Uint8Array` (index into
  `world.biomeIds`), both `resolution²`, row 0 = north, covering the disc out to the water edge.
- `world.locations`: `{ id, type, x, z, biomeId }[]`, placed from `public/data/locations.json`.
- `world.isApproximation` / `IS_APPROXIMATION`: the UI must label these worlds as approximations.

Biome layout rules, world size, sea level and location constraints come from sourced JSON in
`public/data/`. Noise and height shaping are our own (`src/world/tuning.ts`), so a seed does
**not** reproduce the real game world. The same seed always gives the same output (tested).
Resolution can be 64–2048. A 1024² world takes about 1.5–2 s in Node on the dev container
(`npm run perf`).

## Game data

`public/data/*.json` holds every game fact, each entry with sources and a spoiler level:

- 9 biomes, with what to bring, threats, key resources, recommended gear tier, weather and boss
- 8 bosses (summon items, Forsaken powers)
- 85 creatures, with weaknesses and resistances
- 348 resources, 345 items (weapons, armor, tools, ammo, meads), 26 crafting stations and 87 foods
- a 9-step progression guide, 66 location types and 34 tips

Numbers come from a game-data extraction pinned to a commit (see `docs/SOURCES.md` §e); anything
unverified is `null` and listed in `docs/DATA_TODO.md`. Typed loaders are in `src/data/load.ts`
(`loadContent()`). Run `npm run validate:data` after editing data.

### URL parameters

The HUD state is mirrored in the query string, so any view can be shared:

| Param   | Values                                 | Default    |
| ------- | -------------------------------------- | ---------- |
| `seed`  | any text (≤ 64 chars)                  | `HelloWorld` |
| `mode`  | `newcomer` \| `veteran`                | `newcomer` |
| `layers` | comma list of `biomes,bosses,dungeons,npcs,vegvisirs,villages,landmarks,creatures,resources,grid,pins` | `biomes,bosses,dungeons,npcs,vegvisirs,villages,pins` |
| `spoiler` | `0` (spoiler-free) \| `1` (mild) \| `2` (all) | by mode: newcomer 0, veteran 2 |
| `pins` | `x,z,label;x,z,label…` (game metres) | none |
| `hide` | comma list of location type ids filtered off the map | none |
| `sel` | content or pin id: opens its panel on load | none |
| `cam` | `x,z,distance,polar,azimuth` (applied on load; written by **Copy link**) | overview |
| `about` | `1` opens the About / data view | closed |

Example: `http://localhost:5173/?seed=HelloWorld&mode=veteran&layers=bosses,dungeons,grid,pins&pins=-800,300,Base`.

Invalid values fall back to their defaults, and parameters left at their default are removed from the URL.

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                       |
| `npm run build`     | Typecheck, then build to `dist/`                |
| `npm run preview`   | Serve the production build                      |
| `npm run typecheck` | TypeScript (strict) across app, tests, tooling  |
| `npm run lint`      | ESLint and Prettier check                       |
| `npm run format`    | Prettier write                                  |
| `npm test`          | Vitest unit tests                               |
| `npm run perf`      | Time a 1024² world generation                   |
| `npm run test:e2e`  | Playwright e2e (Chromium, software WebGL): dev server, plus the production build under a sub-path |
| `npm run screens`   | Regenerate `docs/screens/*.png` + `stats.json`  |
| `npm run validate:data` | Validate `public/data` (+ `-- --write-todo`) |
| `npm run check`     | typecheck, lint, test, validate:data            |
| `npm run budget`    | Initial-JS size vs. the 1.5 MB gzip budget (`-- --build` to rebuild first) |
| `npm run serve:subpath` | Serve `dist/` under `/valheim-atlas/` like GitHub Pages |

## Project layout

```
public/data/   sourced game data (JSON), fetched at runtime
src/app/       root <App/>: full-screen Canvas + HUD overlay
src/world/     world generation (runs in a Web Worker) + IndexedDB cache
src/debug/     debug.html: 2D biome map
src/render/    react-three-fiber scene, shaders, terrain LOD, props
tests/e2e/     Playwright specs
src/data/      zod schemas + typed JSON loaders
src/state/     Zustand stores, URL state helper
src/ui/        HUD and panels
docs/          PROJECT_STATUS, SPEC, DECISION, SOURCES, RELEASE, USER_STORIES
scripts/       validate-data, budget, serve-static (dev tooling)
.github/       CI and GitHub Pages workflows
```

Contributor rules are in [`CLAUDE.md`](CLAUDE.md). In short: no game assets, every game fact lives in `public/data/*.json` with a source, and no invented stats.

## Deploy

The site is fully static. `.github/workflows/deploy.yml` builds it and publishes `dist/` to
GitHub Pages on every push to `main` (or by hand from the Actions tab). One-time setup by the
repository owner: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The
build uses relative asset URLs, so it works under `https://<owner>.github.io/<repo>/` or at a
domain root without changes. `.github/workflows/ci.yml` runs the checks, the bundle budget and
the e2e suite on pushes and pull requests. Details, the Content-Security-Policy and the release
checklist: [`docs/RELEASE.md`](docs/RELEASE.md).

## Licence

No licence has been chosen yet (the repository owner decides). Until then, all rights are
reserved by the authors. Game names belong to their owners.

## Tech

Vite · React 19 · TypeScript (strict) · three.js via @react-three/fiber and @react-three/drei ·
Zustand · zod · Vitest · ESLint · Prettier.
