import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import type { BiomeId, LocationCategory, WorldGenData } from '../data/schema';
import { LOCATION_CATEGORIES } from '../data/schema';
import { parseUrlState } from '../state/url-state';
import { generateWorld, getWorldGenData } from '../world/api';
import { DEFAULT_RESOLUTION, GENERATOR_ID } from '../world/generator-info';
import type { GeneratedWorld } from '../world/types';
import { BiomeMapCanvas, type HoverInfo, type MapMarker } from './BiomeMapCanvas';

const RESOLUTIONS = [256, 512, 1024, 2048] as const;

/** Our own marker colours for the debug map. */
const CATEGORY_COLORS: Record<LocationCategory, string> = {
  start: '#ffffff',
  'boss-altar': '#ff3b3b',
  trader: '#ffd23b',
  miniboss: '#ff8c1a',
  dungeon: '#b84dff',
  village: '#8b5a2b',
  vegvisir: '#3bd6ff',
  runestone: '#c8c8c8',
  landmark: '#4dff88',
};
const BIG: ReadonlySet<LocationCategory> = new Set(['start', 'boss-altar', 'trader', 'miniboss']);

type Run =
  | { kind: 'idle' }
  | { kind: 'running'; progress: number }
  | { kind: 'done'; world: GeneratedWorld; ms: number; fromCache: boolean }
  | { kind: 'error'; message: string };

function initialParams(): { seed: string; resolution: number } {
  const params = new URLSearchParams(window.location.search);
  const res = Number(params.get('res'));
  const seed = parseUrlState(window.location.search).seed;
  return {
    seed: seed === '' ? 'HelloWorld' : seed,
    resolution: RESOLUTIONS.some((r) => r === res) ? res : DEFAULT_RESOLUTION,
  };
}

export function DebugApp() {
  const [init] = useState(initialParams);
  const [draftSeed, setDraftSeed] = useState(init.seed);
  const [request, setRequest] = useState({ ...init, useCache: true, nonce: 0 });
  const [data, setData] = useState<WorldGenData | null>(null);
  const [run, setRun] = useState<Run>({ kind: 'running', progress: 0 });
  const [shading, setShading] = useState(true);
  const [water, setWater] = useState(true);
  const [shown, setShown] = useState<ReadonlySet<LocationCategory>>(
    () => new Set<LocationCategory>(['start', 'boss-altar', 'trader', 'miniboss', 'vegvisir']),
  );
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [sizePx, setSizePx] = useState(() => mapSize());

  useEffect(() => {
    const onResize = () => {
      setSizePx(mapSize());
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    getWorldGenData().then(setData, (err: unknown) => {
      setRun({ kind: 'error', message: String(err) });
    });
  }, []);

  useEffect(() => {
    let stale = false;
    const url = new URL(window.location.href);
    url.searchParams.set('seed', request.seed);
    url.searchParams.set('res', String(request.resolution));
    window.history.replaceState(null, '', url);
    const t0 = performance.now();
    generateWorld(request.seed, request.resolution, {
      ...(request.useCache ? {} : { cache: null }),
      onProgress: (progress) => {
        if (!stale) setRun({ kind: 'running', progress });
      },
    }).then(
      ({ world, fromCache }) => {
        if (!stale) setRun({ kind: 'done', world, fromCache, ms: performance.now() - t0 });
      },
      (err: unknown) => {
        if (!stale) setRun({ kind: 'error', message: String(err) });
      },
    );
    return () => {
      stale = true;
    };
  }, [request]);

  const typeInfo = useMemo(() => new Map(data?.locations.map((l) => [l.id, l]) ?? []), [data]);
  const colors = useMemo(() => {
    const entries = data?.biomes.map((b) => [b.id, b.mapColor] as const) ?? [];
    return Object.fromEntries(entries) as Record<BiomeId, string>;
  }, [data]);
  const style = useMemo(
    () => ({ colors, seaLevelM: data?.world.seaLevelM ?? 0, shading, water }),
    [colors, data, shading, water],
  );

  const world = run.kind === 'done' ? run.world : null;
  const markers = useMemo<MapMarker[]>(() => {
    if (!world) return [];
    return world.locations.flatMap((location) => {
      const category = typeInfo.get(location.type)?.category;
      if (!category || !shown.has(category)) return [];
      return [{ location, color: CATEGORY_COLORS[category], radiusPx: BIG.has(category) ? 4 : 2 }];
    });
  }, [world, typeInfo, shown]);

  const stats = useMemo(
    () => (world && data ? biomeStats(world, data.world.worldRadiusM) : null),
    [world, data],
  );

  const regenerate = (
    change: Partial<Pick<typeof request, 'seed' | 'resolution' | 'useCache'>>,
  ) => {
    setRun({ kind: 'running', progress: 0 });
    setRequest((r) => ({ ...r, ...change, nonce: r.nonce + 1 }));
  };

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const seed = draftSeed.trim();
    regenerate(seed === '' ? {} : { seed });
  };

  const hoverText = (() => {
    if (!hover || !world) return 'Hover the map for coordinates';
    const biome = world.biomeIds[world.biomes[hover.cell] ?? 0] ?? 'ocean';
    const h = world.height[hover.cell] ?? 0;
    const d = Math.sqrt(hover.x * hover.x + hover.z * hover.z);
    return `x ${hover.x.toFixed(0)} m, z ${hover.z.toFixed(0)} m · ${d.toFixed(0)} m from centre · ${
      data?.biomes.find((b) => b.id === biome)?.name ?? biome
    } · ground ${h.toFixed(1)} m`;
  })();

  return (
    <div className="debug">
      <aside className="panel">
        <h1>
          Biome map <span className="badge">debug</span>{' '}
          {world?.isApproximation ? (
            <span className="badge warn" title="docs/DECISION.md, Path B">
              Approximation
            </span>
          ) : null}
        </h1>
        <p className="muted">
          Generator <code>{GENERATOR_ID}</code>. Layout rules and location constraints come from{' '}
          <code>public/data</code>; noise is our own, so this is not the real world for the seed.
        </p>

        <form onSubmit={onSubmit} className="row">
          <input
            value={draftSeed}
            aria-label="Seed"
            onChange={(e) => {
              setDraftSeed(e.target.value);
            }}
          />
          <button type="submit">Generate</button>
        </form>
        <div className="row">
          <label>
            Resolution{' '}
            <select
              value={request.resolution}
              onChange={(e) => {
                regenerate({ resolution: Number(e.target.value) });
              }}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}²
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={request.useCache}
              onChange={(e) => {
                regenerate({ useCache: e.target.checked });
              }}
            />{' '}
            IndexedDB cache
          </label>
        </div>
        <div className="row">
          <label>
            <input
              type="checkbox"
              checked={shading}
              onChange={(e) => {
                setShading(e.target.checked);
              }}
            />{' '}
            Hillshade
          </label>
          <label>
            <input
              type="checkbox"
              checked={water}
              onChange={(e) => {
                setWater(e.target.checked);
              }}
            />{' '}
            Water
          </label>
        </div>

        <p className="status" aria-live="polite" data-testid="run-status">
          {run.kind === 'running'
            ? `Generating… ${Math.round(run.progress * 100)}%`
            : run.kind === 'done'
              ? `${run.fromCache ? 'Loaded from cache' : 'Generated'} in ${run.ms.toFixed(0)} ms · ${
                  run.world.resolution
                }² (${run.world.cellSizeM.toFixed(1)} m/cell) · ${run.world.locations.length} locations`
              : run.kind === 'error'
                ? `Error: ${run.message}`
                : ''}
        </p>

        <h2>Locations</h2>
        <ul className="legend">
          {LOCATION_CATEGORIES.map((c) => {
            const count = world
              ? world.locations.filter((l) => typeInfo.get(l.type)?.category === c).length
              : 0;
            return (
              <li key={c}>
                <label>
                  <input
                    type="checkbox"
                    checked={shown.has(c)}
                    onChange={(e) => {
                      const next = new Set(shown);
                      if (e.target.checked) next.add(c);
                      else next.delete(c);
                      setShown(next);
                    }}
                  />{' '}
                  <span className="swatch round" style={{ background: CATEGORY_COLORS[c] }} /> {c}{' '}
                  <span className="muted">({count})</span>
                </label>
              </li>
            );
          })}
        </ul>

        <h2>Biomes (share of the 10 km disc)</h2>
        <ul className="legend">
          {data?.biomes.map((b) => (
            <li key={b.id}>
              <span className="swatch" style={{ background: b.mapColor }} /> {b.name}{' '}
              <span className="muted">
                {stats ? `${(100 * (stats.get(b.id) ?? 0)).toFixed(1)}%` : ''}
              </span>
            </li>
          ))}
        </ul>

        {world ? (
          <>
            <h2>Not fully placed</h2>
            <ul className="report">
              {world.placementReport
                .filter((r) => r.wanted === null || r.placed < r.wanted)
                .map((r) => (
                  <li key={r.type}>
                    <code>{r.type}</code> {r.placed}/{r.wanted ?? '?'}{' '}
                    <span className="muted">{r.note}</span>
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </aside>

      <main className="map-area">
        {world && data ? (
          <BiomeMapCanvas
            world={world}
            style={style}
            markers={markers}
            sizePx={sizePx}
            onHover={setHover}
          />
        ) : (
          <div className="map-placeholder" style={{ width: sizePx, height: sizePx }} />
        )}
        <p className="muted readout">{hoverText}</p>
      </main>
    </div>
  );
}

function mapSize(): number {
  return Math.max(256, Math.floor(Math.min(window.innerHeight - 60, window.innerWidth - 380)));
}

/** Fraction of cells inside the playable disc belonging to each biome. */
function biomeStats(world: GeneratedWorld, radiusM: number): Map<BiomeId, number> {
  const n = world.resolution;
  const counts = new Map<BiomeId, number>();
  let total = 0;
  for (let j = 0; j < n; j++) {
    const z = world.extentM - (j + 0.5) * world.cellSizeM;
    for (let i = 0; i < n; i++) {
      const x = -world.extentM + (i + 0.5) * world.cellSizeM;
      if (x * x + z * z > radiusM * radiusM) continue;
      const id = world.biomeIds[world.biomes[j * n + i] ?? 0] ?? 'ocean';
      counts.set(id, (counts.get(id) ?? 0) + 1);
      total++;
    }
  }
  for (const [k, v] of counts) counts.set(k, v / total);
  return counts;
}
