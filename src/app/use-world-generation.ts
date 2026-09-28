import { useEffect, useRef } from 'react';
import { useAppStore } from '../state/app-store';
import { useWorldStore } from '../state/world-store';
import { createWorldClient, type WorldClient } from '../world/client';

/** Regenerates the world in the Web Worker whenever the seed changes. */
export function useWorldGeneration(): void {
  const seed = useAppStore((s) => s.seed);
  const setStatus = useWorldStore((s) => s.setStatus);
  const clientRef = useRef<WorldClient | null>(null);

  useEffect(() => {
    const client = createWorldClient();
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    if (seed === '') {
      setStatus({ kind: 'idle' });
      return;
    }
    let stale = false;
    setStatus({ kind: 'generating', seed, progress: 0 });
    client
      .generate(seed, (progress) => {
        if (!stale) setStatus({ kind: 'generating', seed, progress });
      })
      .then(
        (res) => {
          if (!stale) setStatus({ kind: 'ready', seed: res.seed, seedHash: res.seedHash });
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
