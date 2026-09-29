import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';
import { useWorldStore } from '../state/world-store';
import { disposeWorldWorker, generateWorld, getWorldGenData } from '../world/api';

export const GENERATION_START_MARK = 'atlas:generate:start';
export const GENERATION_END_MARK = 'atlas:generate:end';

/** Regenerates the world in the Web Worker (or loads it from cache) when the seed changes. */
export function useWorldGeneration(): void {
  const seed = useAppStore((s) => s.seed);
  const setStatus = useWorldStore((s) => s.setStatus);

  useEffect(() => disposeWorldWorker, []);

  useEffect(() => {
    if (seed === '') {
      setStatus({ kind: 'idle' });
      return;
    }
    let stale = false;
    setStatus({ kind: 'generating', seed, progress: 0 });
    // Standard User Timing marks (no tracking: they never leave the page). The e2e perf test
    // checks the main thread stays responsive in between (SPEC §8).
    performance.mark(GENERATION_START_MARK);
    Promise.all([
      generateWorld(seed, undefined, {
        onProgress: (progress) => {
          if (!stale) setStatus({ kind: 'generating', seed, progress });
        },
      }),
      getWorldGenData(),
    ]).then(
      ([{ world, fromCache }, data]) => {
        performance.mark(GENERATION_END_MARK);
        if (!stale) setStatus({ kind: 'ready', seed, world, constants: data.world, fromCache });
      },
      (err: unknown) => {
        if (!stale) setStatus({ kind: 'error', seed, message: String(err) });
      },
    );
    return () => {
      stale = true;
    };
  }, [seed, setStatus]);
}
