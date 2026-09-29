import type { AppStore } from './app-store';
import { parseUrlState, toSearch } from './url-state';

/**
 * Two-way sync between the store and `window.location.search`.
 * Store changes replace the current history entry; back/forward restores state.
 * The camera is only read from the URL on load (shared links); it is written by the
 * "Copy link" button, not continuously.
 */
export function startUrlSync(store: AppStore, win: Window = window): () => void {
  store.getState().replaceUrlState(parseUrlState(win.location.search));

  const unsubscribe = store.subscribe((state) => {
    const search = toSearch({ ...state, cam: null }, win.location.search);
    if (search !== win.location.search) {
      const url = `${win.location.pathname}${search}${win.location.hash}`;
      win.history.replaceState(win.history.state, '', url);
    }
  });

  const onPopState = () => {
    store.getState().replaceUrlState(parseUrlState(win.location.search));
  };
  win.addEventListener('popstate', onPopState);

  return () => {
    unsubscribe();
    win.removeEventListener('popstate', onPopState);
  };
}
