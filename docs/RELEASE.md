# Release (phase 7: polish and release; phase 8: visual refinements)

What was checked before the first public release, how to repeat it, and how the site is
deployed. Numbers below were measured on 2026-09-29 in the dev container (branch
`claude/eager-galileo-lw2rru`), with Chromium 141 rendering WebGL in software (SwiftShader).
Phase 8 re-measured everything it touched; see [Phase 8](#phase-8-visual-refinements).

## Release checklist

1. `npm run check` passes (typecheck, lint, unit tests, `validate:data`).
2. `npm run test:e2e` passes. It runs two Playwright projects:
   - `chromium`: the dev server, including the axe audit (`a11y.spec.ts`), About view
     (`about.spec.ts`), reduced motion (`motion.spec.ts`) and phone layout (`mobile.spec.ts`);
   - `subpath`: the production build served under `/valheim-atlas/` (`subpath.spec.ts`).
3. `npm run budget` passes (initial JS under 1.5 MB gzipped).
4. Lighthouse accessibility ≥ 90 on the production build (command below).
5. Manual checks M1–M4 in `docs/USER_STORIES.md` on real hardware when the related feature
   changed (touch, generation time, distance rings, footer version).
6. `docs/PROJECT_STATUS.md` updated; the deploy workflow ran green on `main`.

## Accessibility

### axe-core (automated, every e2e run)

`tests/e2e/a11y.spec.ts` runs `@axe-core/playwright` with the tags `wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice` on:

- the initial view (returning visitor),
- an open info panel (Troll Cave),
- the progression guide,
- the About view,
- the first-run "New to Valheim?" dialog (clean visit, controls help shown).

**Result: 0 violations of any impact** (serious, critical, moderate or minor) in all five
states. The test fails on any serious/critical violation and on any moderate/minor one not
listed (with a reason) in `ALLOWED_MINOR_RULES`; that list is empty.

axe reports text contrast over the 3D view as "needs review" (it cannot compute the colour
behind translucent panels on a WebGL canvas). Manual check, worst case = panel over pure white
snow (panel background 90% `#0e1a24`, so at least `#26313a` behind the text):

| Colour | On solid panel `#122230` | Worst case over snow |
|---|---|---|
| Text `#e8eef2` | 13.8:1 | ≥ 9:1 |
| Muted `#9fb3c0` | 7.5:1 | 6.1:1 |
| Accent `#d8b45a` | 8.2:1 | ≥ 5.4:1 |
| Links `#8fc6e6` | 8.8:1 | ≥ 5.8:1 |
| Danger `#f08a8a`, resist `#e08a5a`, immune `#9aa4b1` | 6.1–6.7:1 | 5.0–5.5:1 |

Biome-name labels on the map are white on a 75% dark pill (about 8:1 over white snow).

### Lighthouse (production build, manual)

```bash
npm run build && npm run preview &   # http://localhost:4173/
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx -y lighthouse@13.5.0 http://localhost:4173/ --only-categories=accessibility \
  --chrome-flags="--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist" \
  [--preset=desktop] [--output=json --output-path=lh.json]
```

`CHROME_PATH` is the Playwright Chromium in this container; use any Chrome elsewhere. Lighthouse
was run with `npx` (not added as a dependency). Results, Lighthouse 13.5.0:

| URL | Form factor | Phase 7 (08:20 UTC) | Phase 8 (09:48 UTC) | Phase 8, `--pause-after-load-ms=15000` |
|---|---|---|---|---|
| `/` (first visit: "New to Valheim?" dialog open) | mobile (default) | 100 | **100** | **100** |
| `/` | desktop | 100 | **100** | **100** |
| `/?mode=newcomer` (no dialog; main view) | mobile | 96 | **100** | **100** |
| `/?mode=newcomer` | desktop | 100 | **100** | **100** |

The phase 8 world takes a moment longer to appear (shaders compile behind the loading screen),
so the last column repeats each run with a 15 s pause after load: the final screenshot of that
run shows the world, markers and HUD fully loaded, and every audit still passes.

Phase 7's one failing audit (`target-size` on the mobile main view: a floating biome-name
button could sit partly under a camera button) is fixed: labels now hide while their screen
rectangle overlaps any HUD surface or runs off screen (`src/render/label-occlusion.ts`), and
`tests/e2e/visuals.spec.ts` sweeps 40 camera views at desktop and phone size checking that no
visible label overlaps the HUD (and that some labels really were hidden by it).

### What was fixed in this phase

- **Landmarks:** `main` ("Map") holds the 3D view; the HUD has one `banner` (title and search,
  which is a `search` landmark), a `complementary` side drawer ("Map controls"), a "Camera"
  region, the info panel region and one `contentinfo` bottom bar. Headings run h1 → h2 → h3.
- **Skip link:** the first Tab stop is "Skip to search", visible when focused.
- **The 3D view** keeps `role="application"` (so screen readers pass arrow keys to the
  camera) but is described (`aria-describedby`): it says everything is reachable through
  search, biome buttons, the layer list and the guide, and that Tab leaves the view. Tab is
  never trapped (tested).
- **Modal dialogs** (first-run, About) make the rest of the page `inert` while open, trap
  Tab, close with Esc and hand focus back to their opener.
- **Target sizes** (WCAG 2.2): layer rows, disclosure summaries, inline entity links and map
  labels are at least 24 px; on small or touch screens the main controls are at least 44 px.
- **Contrast:** HUD panels went from 84% to 90% opacity and map labels from 55% to 75%, so
  small coloured text stays ≥ 5:1 over any terrain.
- **Focus** is always visible (`:focus-visible` outline in the accent colour; tested).

## Reduced motion

With `prefers-reduced-motion: reduce` (live: it follows the setting without a reload):

- camera flights (search, "Fly here", guide, reset, top-down) jump in one frame;
- orbit damping is off, so the view stops as soon as the drag ends;
- the shader clock stands still: marker and highlight pulses, water, lava, Mistlands mist,
  the rim glow and star twinkle freeze;
- CSS transitions and animations are off (`app.css`).

Phase 8 additions, all honouring the same setting:

- the loading screen has no pulse, bar animation or fade-out, and the world appears in one step
  instead of fading in;
- fly-to arcs don't play (the camera jumps);
- the selected-marker halo, the highlight outline pulse and the new horizon/atmosphere are
  driven by the frozen shader clock or are static;
- biome labels don't fade or lift on hover.

`tests/e2e/motion.spec.ts` checks that the camera reaches its target within two frames, that
the shader clock doesn't move, that no HUD element has a transition or animation, and that
without the setting the clock runs (and freezes when the setting is switched on). Since phase 8
it also checks that under the setting the world's fade-in value goes straight from 0 to 1, the
loading screen has no transition or animation and is gone as soon as the world shows, and
biome labels have no transition; and that without it the fade-in passes through in-between
values.

## Small screens and touch

At ≤ 900 px wide the side drawer folds behind a **Menu** button (bottom sheet), the info panel
becomes a bottom sheet with a sticky close button, camera buttons move to the top right, and
the cursor readout is hidden where there is no hovering pointer. `tests/e2e/mobile.spec.ts`
(390 × 844, touch, mobile) checks: no horizontal overflow, `touch-action: none` on the map,
Menu opens/closes the drawer, camera/Menu/About/search/close targets ≥ 44 × 44 px and not
covered, search → result → panel by touch, the panel fits and scrolls, and closing it.
Search results are now chosen on `click` (the press only keeps focus in the box), which made
tapping a result reliable on touch screens. One-finger orbit, two-finger pan and pinch zoom come from the orbit controls (manual check M2).

## Performance budget (SPEC §8)

`npm run budget` (`scripts/budget.ts`) reads the Vite manifest (building first when there is
none, or with `-- --build`), counts the `index.html` entry chunk and its static imports, and
fails above 1.5 MB gzipped. Lazy chunks, the worker, the debug page and `public/data` are not
counted. 2026-09-29:

| File | Kind | Raw | Gzip |
|---|---|---|---|
| `assets/main-*.js` | initial JS | 1071.1 kB | 290.1 kB |
| `assets/api-*.js` | initial JS (shared with debug.html) | 327.0 kB | 98.9 kB |
| `assets/worker-*.js` | world worker | 115.6 kB | 32.8 kB |
| `assets/main-*.css` | initial CSS | 14.3 kB | 3.7 kB |
| `assets/AboutDialog-*.js` | lazy (About view) | 7.6 kB | 3.1 kB |

**Initial JS: 389.0 kB gzipped, 26% of the 1.5 MB budget.** The About view is loaded on
demand; nothing else was worth splitting at this size.

After phase 8: `main` 1081.5 kB / 293.5 kB gzipped, `api` unchanged, CSS 16.1 kB / 4.2 kB,
plus the new `terrain-prep-worker-*.js` (113.0 kB / 32.3 kB, a worker, not counted).
**Initial JS: 392.4 kB gzipped (26%).**

**Main thread during generation.** `subpath.spec.ts` records long tasks (> 50 ms) with a
`PerformanceObserver` between the User Timing marks `atlas:generate:start` and
`atlas:generate:end` (production build):

- **During generation: no long tasks.** The worker does the work; the test fails on any task
  over 50 ms that starts after the renderer exists.
- **Start-up:** creating the WebGL context (a one-off, when the page opens) showed up as long
  tasks of 76 and 87 ms (up to ~230 ms in an unminified build) in software rendering and overlaps generation only because both start at load. It is reported
  by the test, not counted.
- **After generation (phase 7 gap, fixed in phase 8):** turning the finished world into
  terrain and compiling shaders used to block the main thread once per world: long tasks of
  0.4–0.6 s and ~0.2 s in the software renderer (phase 7 final run: 419 and 196 ms; re-measured
  at the start of phase 8: 600 and 215 ms). Since phase 8 the test also fails on any long task
  over 200 ms after generation; measured values are in [Phase 8](#phase-8-visual-refinements).

## Phase 8: visual refinements

### Main thread after generation

Before (HEAD of phase 7, production build, software WebGL, `subpath.spec.ts`): long tasks after
`atlas:generate:end` of **600 and 215 ms**. After, over five production-build runs:
**[55], [50], [], [72, 57, 100, 127] and [62, 58, 172] ms**: no task over 200 ms, and the test
now fails if one appears. The margin is thin in the worst run (172 ms): what remains is one
shader program's first use or one texture upload per task in software WebGL, which can't be
split further; slower CI machines could approach the limit. Start-up tasks (WebGL context and the first frame's star/sky shaders, before the
renderer is ready) are 50–290 ms as before; they are reported, not counted.

What moved and why:

1. **A second Web Worker** (`src/render/terrain-prep-worker.ts`, three-free) builds the render
   buffers: blurred surface colour and biome weights, the half-float height texture (own
   encoder, bit-identical to three's, unit-tested), the chunk layout, the coarsest mesh of every
   drawable chunk and the biome anchors. They come back as transferables (zero-copy); both
   directions are zod-parsed discriminated unions (`terrain-prep-protocol.ts`). The main thread
   copies the world once into the worker (structured clone, a few ms) and keeps its own copy for
   picking and props. The generator, its output and the IndexedDB cache are unchanged, so
   `GENERATOR_REVISION` stays 1 (the world worker's progress messages only gained a `stage`
   field; the cache stores worlds, not messages).
2. **Shader warm-up behind the loading screen** (`src/render/precompile.ts`). Profiling showed
   that in software WebGL (ANGLE + SwiftShader) each program is really built at its first use,
   about 100–300 ms each, and that `KHR_parallel_shader_compile` isn't available there, so three's
   `compileAsync` can't help. Three things fixed it: pausing the render loop during the warm-up
   (a GPU process still busy with earlier frames made every synchronous GL call wait for it),
   queuing all compiles at once and letting them finish in the background for
   `RENDER.loading.shaderSettleMs` (900 ms; where the extension exists, readiness is polled
   instead, with no fixed wait), then touching one program per task and drawing each distinct
   material once into a single scissored pixel. The star material no longer depends on the
   world, so its program isn't released and relinked for every world.
3. **The icon atlas** (a 2D canvas) is built once, while the prep worker runs.

### Search highlight

The highlight used to be the biome grid itself (bilinear blend of 20 m cells), so it
stair-stepped up close. Now the prep worker builds a mask per highlight (1 = highlighted biome,
box-blurred: radius 1 cell, 3 passes, `src/render/highlight-mask.ts`) and the terrain shader
draws its 0.5 iso-line with a screen-space antialiased edge and a thin gold outline. The biome
grid is untouched; only features narrower than about one blur width (single stray cells) lose
their outline. Unit tests check that big regions keep their border to within a cell and that a
shallow staircase border becomes nearly straight (its second difference drops from ≥ 1 cell to
< 0.35). `docs/screens/4-highlight.png` shows a close-up.

### Game feel (four items, own look, all in `render-config.ts` / `palette.ts`)

Chosen for the most visible effect per change, as listed in the phase brief. The shoreline was
skipped: the water shader already had shore foam.

1. **Loading experience:** a centre card with the seed, four named steps (shaping the land,
   placing locations, painting the map, lighting the scene) and an overall percent from the
   existing progress callback; the world fades in (1.1 s) when ready.
2. **Atmosphere:** aerial-perspective haze that starts about the orbit distance out and scales
   with zoom, so far terrain fades toward a pale blue at every zoom level, plus a sky backdrop
   with a faint horizon band (one extra draw call) that the haze melts into.
3. **Camera feel:** longer flights take a little longer (up to 2.3 s) and rise in an arc
   (added as `arc · 4k(1−k)`, zero at both ends, so no overshoot) when the hop is long
   compared with the current view distance.
4. **Marker and label feedback:** a selected or hovered marker gets a slowly swelling gold halo
   ring; biome labels lift slightly with an accent border on hover and focus.

### Workload (`docs/screens/stats.json`, `npm run screens`)

| View | Draw calls before → after | Triangles before → after | Props |
|---|---|---|---|
| 1-overview | 222 → 223 (+0.5%) | 72,480 → 73,440 (+1.3%) | 0 → 0 |
| 2-region | 93 → 94 (+1.1%) | 39,106 → 40,066 (+2.5%) | 0 → 0 |
| 3-close | 93 → 94 (+1.1%) | 368,766 → 369,726 (+0.3%) | 7,819 → 7,819 |
| 4-highlight (new) | – → 59 | – → 299,742 | – → 7,652 |

The sky sphere accounts for the +960 triangles and one draw call. The markers, halo and glow
wall now use `forceSinglePass` (their blending doesn't depend on draw order); that was expected
to save a draw call each, but the measured totals don't show it, and it wasn't investigated
further since the budget holds. Screenshots: `0-loading.png` (new), `1-overview.png`,
`2-region.png`, `3-close.png`, `4-highlight.png` (new).

## Static deploy

- **Build:** `vite.config.ts` uses a relative `base` (`./`), so the same `dist/` works at a
  domain root or under a sub-path such as GitHub Pages' `/<repo>/`. Data is fetched from
  `${import.meta.env.BASE_URL}data/…` and the worker URL is resolved by Vite, so both follow the
  page. Set `ATLAS_BASE=/some/path/` to build with an absolute base instead. There is no
  client-side routing (all state is in the query string), so no `404.html` fallback is needed.
- **Sub-path smoke test:** `npm run serve:subpath` (`scripts/serve-static.ts`) serves `dist/`
  only under `/valheim-atlas/` and answers 404 for anything else, like GitHub Pages (no
  single-page-app fallback that could hide a broken URL). The `subpath` Playwright project
  builds, serves and checks: a world generates, content data and `sources.json` load, the
  worker and the lazy About chunk load from under the sub-path, the favicon resolves, the bare
  `/valheim-atlas` redirects, the debug page works, **no request goes to another origin or
  outside the sub-path, nothing fails, and there are no console errors** (which would include
  CSP violations).
- **Security headers:** static hosts like GitHub Pages can't set response headers, so the
  build adds `<meta>` tags (build only; the dev server's hot reload needs inline scripts):
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
    style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';
    worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`
    (`style-src-attr` because React sets inline `style` attributes; zod runs in its `jitless`
    mode so nothing needs `eval`);
  - `referrer: no-referrer` (outbound links also carry `rel="noopener noreferrer"`).
  - Not possible with a `<meta>` tag: `frame-ancestors`, HSTS, `X-Content-Type-Options`.
- **Workflows** (official `actions/*` only):
  - `.github/workflows/ci.yml`: on pushes to `main`, pull requests and by hand: `npm ci`,
    `npm run check`, `npm run budget -- --build`, `npx playwright install --with-deps chromium`,
    `npm run test:e2e`; Playwright results are uploaded when it fails.
  - `.github/workflows/deploy.yml`: on pushes to `main` and by hand: validate data, build with
    the budget check, remove `dist/.vite` (the manifest), then `actions/upload-pages-artifact`
    and `actions/deploy-pages`.

### One-time setup by the repository owner

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run "Deploy to GitHub Pages" from the Actions tab).
3. The site appears at `https://<owner>.github.io/<repo>/`; put that link in the README.
4. Choose a licence (none is set; see `docs/PROJECT_STATUS.md`).

## Release hygiene

- **No tracking or analytics:** no analytics code, cookies or third-party requests. The
  only browser storage is `localStorage` (preferences) and IndexedDB (generated worlds), both
  local. The About view says so.
- **No external runtime requests:** asserted by `subpath.spec.ts` against the production
  build (fails on any request to a non-localhost origin). No web fonts or CDNs (system fonts).
- **Outbound links:** `src/lib/outbound-links.test.ts` scans every URL in `src/`, the HTML
  pages and `public/` and checks that each is https, that its site is listed in
  `docs/SOURCES.md` (or is valheim-map.world), and that none is flagged **suspicious**
  (S-WG-22). Two cited sites were missing from `SOURCES.md` and were registered as
  `S-DATA-02` and `S-DATA-03`.
- **Game version:** only in `public/data/meta.json`; the About view and the bottom bar read it.
- **Disclaimer:** "Fan-made. Not affiliated with or endorsed by Iron Gate or Coffee Stain." is
  always in the bottom bar and at the top of the About view.
