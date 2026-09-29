import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Cached so render loops can read it every frame without allocating. */
let mql: MediaQueryList | null | undefined;

function media(): MediaQueryList | null {
  if (mql !== undefined) return mql;
  try {
    mql = typeof window !== 'undefined' ? window.matchMedia(QUERY) : null;
  } catch {
    mql = null;
  }
  return mql;
}

/**
 * True when the user asked the OS/browser to minimise motion (SPEC §7). Live: it follows
 * changes to the setting without a reload.
 */
export function prefersReducedMotion(): boolean {
  return media()?.matches ?? false;
}

function subscribe(onChange: () => void): () => void {
  const m = media();
  if (!m) return () => undefined;
  m.addEventListener('change', onChange);
  return () => {
    m.removeEventListener('change', onChange);
  };
}

/** React hook form of {@link prefersReducedMotion}. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
