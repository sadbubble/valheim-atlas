import { useEffect } from 'react';
import { disposeTerrainPrepWorker, terrainPrepClient } from '../render/terrain-prep-client';
import { useAppStore } from '../state/app-store';
import { useWorldStore } from '../state/world-store';
import { disposeWorldWorker, generateWorld, getWorldGenData } from '../world/api';

export const GENERATION_START_MARK = 'atlas:generate:start';
export const GENERATION_END_MARK = 'atlas:generate:end';
/** User Timing mark: the terrain-prep worker has delivered the render buffers. */
export const PREPARED_MARK = 'atlas:terrain-prepared';

/**
 * Regenerates the world in the Web Worker (or loads it from cache) when the seed changes,
 * then has the terrain-prep worker build the render buffers, so neither step blocks the
 * main thread (SPEC §8).
 */
export function useWorldGeneration(): void {
  const seed = useAppStore((s) => s.seed);
  const setStatus = useWorldStore((s) => s.setStatus);

  useEffect(
    () => () => {
      disposeWorldWorker();
      disposeTerrainPrepWorker();
    },
    [],
  );

  useEffect(() => {
    if (seed === '') {
      setStatus({ kind: 'idle' });
      return;
    }
    let stale = false;
    // A function, so TypeScript doesn't narrow `stale` across the awaits below.
    const isStale = () => stale;
    setStatus({ kind: 'generating', seed, progress: 0, stage: 'start' });
    // Start the prep worker now so its script loads while the world generates.
    const prep = terrainPrepClient();
    // Standard User Timing marks (no tracking: they never leave the page). The e2e perf test
    // checks the main thread stays responsive in between (SPEC §8).
    performance.mark(GENERATION_START_MARK);
    Promise.all([
      generateWorld(seed, undefined, {
        onProgress: (progress, stage) => {
          if (!stale) setStatus({ kind: 'generating', seed, progress, stage });
        },
      }),
      getWorldGenData(),
    ])
      .then(async ([{ world, fromCache }, data]) => {
        performance.mark(GENERATION_END_MARK);
        if (stale) return;
        setStatus({ kind: 'preparing', seed, fromCache });
        const prepared = await prep.prepare(world, data.world);
        performance.mark(PREPARED_MARK);
        if (!isStale()) {
          setStatus({ kind: 'ready', seed, world, constants: data.world, fromCache, prepared });
        }
      })
      .catch((err: unknown) => {
        if (!stale) setStatus({ kind: 'error', seed, message: String(err) });
      });
    return () => {
      stale = true;
    };
  }, [seed, setStatus]);
}
