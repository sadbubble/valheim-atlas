import type { AppStore } from './app-store';
import { parseUrlState, toSearch, type UrlState } from './url-state';

/**
 * Two-way sync between the store and `window.location.search`.
 * Store changes replace the current history entry; back/forward restores state.
 * The camera is only read from the URL on load (shared links); it is written by the
 * "Copy link" button, not continuously.
 * `resolve` fills in what the URL leaves out (stored prefs; see prefs.ts applyStoredPrefs).
 */
export function startUrlSync(
  store: AppStore,
  win: Window = window,
  resolve: (parsed: UrlState, search: string) => UrlState = (parsed) => parsed,
): () => void {
  const read = () => resolve(parseUrlState(win.location.search), win.location.search);
  store.getState().replaceUrlState(read());

  const unsubscribe = store.subscribe((state) => {
    const search = toSearch({ ...state, cam: null }, win.location.search);
    if (search !== win.location.search) {
      const url = `${win.location.pathname}${search}${win.location.hash}`;
      win.history.replaceState(win.history.state, '', url);
    }
  });

  const onPopState = () => {
    store.getState().replaceUrlState(read());
  };
  win.addEventListener('popstate', onPopState);

  return () => {
    unsubscribe();
    win.removeEventListener('popstate', onPopState);
  };
}
