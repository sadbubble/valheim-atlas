import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';
import { useWorldStore } from '../state/world-store';
import { disposeWorldWorker, generateWorld } from '../world/api';

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
    generateWorld(seed, undefined, {
      onProgress: (progress) => {
        if (!stale) setStatus({ kind: 'generating', seed, progress });
      },
    }).then(
      ({ world, fromCache }) => {
        if (!stale) setStatus({ kind: 'ready', seed, world, fromCache });
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
