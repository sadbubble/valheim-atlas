import { useEffect, useState } from 'react';
import { loadMeta } from './load';
import type { Meta } from './schema';

export type MetaState =
  { status: 'loading' } | { status: 'ready'; meta: Meta } | { status: 'error'; message: string };

export function useMeta(): MetaState {
  const [state, setState] = useState<MetaState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadMeta().then(
      (meta) => {
        if (!cancelled) setState({ status: 'ready', meta });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: String(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
