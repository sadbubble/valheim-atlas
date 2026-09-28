# Valheim Atlas

An interactive, orbitable 3D map of a Valheim-style world for newcomers and veterans. It covers biomes, bosses, points of interest, progression and tips, and every game fact is sourced.

> **Status: Phase 1 scaffold.** The app currently shows a rotating placeholder disc with a
> HUD. World generation (Path B, a rule-driven *approximation*; see
> [`docs/DECISION.md`](docs/DECISION.md)) arrives in Phase 2.
>
> Fan-made; not affiliated with Iron Gate or Coffee Stain. Contains no game assets.

## Requirements

- Node.js **22+** (npm 10+)
- A browser with WebGL 2

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

You should see a slowly rotating disc. Drag to orbit, scroll to zoom, and right-drag to pan.

### URL parameters

The HUD state is mirrored in the query string, so any view can be shared:

| Param   | Values                                 | Default    |
| ------- | -------------------------------------- | ---------- |
| `seed`  | any text (≤ 64 chars)                  | empty      |
| `mode`  | `newcomer` \| `veteran`                | `newcomer` |
| `layer` | `biomes` \| `locations` \| `rings`     | `biomes`   |

Example: `http://localhost:5173/?seed=HelloWorld&mode=veteran&layer=rings`.

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
| `npm run check`     | typecheck, lint and test (run before pushing)   |

## Project layout

```
public/data/   sourced game data (JSON), fetched at runtime
src/app/       root <App/>: full-screen Canvas + HUD overlay
src/world/     world generation: pure TS, runs in a Web Worker
src/render/    react-three-fiber scene
src/data/      zod schemas + typed JSON loaders
src/state/     Zustand stores, URL state helper
src/ui/        HUD and panels
docs/          SPEC, DECISION, SOURCES
```

Contributor rules are in [`CLAUDE.md`](CLAUDE.md). In short: no game assets, every game fact lives in `public/data/*.json` with a source, and no invented stats.

## Tech

Vite · React 19 · TypeScript (strict) · three.js via @react-three/fiber and @react-three/drei ·
Zustand · zod · Vitest · ESLint · Prettier.
