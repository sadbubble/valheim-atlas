import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';
import { useWorldStore } from '../state/world-store';
import { disposeWorldWorker, generateWorld, getWorldGenData } from '../world/api';

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
    Promise.all([
      generateWorld(seed, undefined, {
        onProgress: (progress) => {
          if (!stale) setStatus({ kind: 'generating', seed, progress });
        },
      }),
      getWorldGenData(),
    ]).then(
      ([{ world, fromCache }, data]) => {
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
