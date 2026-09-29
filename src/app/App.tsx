import { useEffect } from 'react';
import { WorldCanvas } from '../render/WorldCanvas';
import { appStore } from '../state/app-store';
import { ensureContentLoaded } from '../state/content-store';
import { applyStoredPrefs, prefsStore, startPrefsSync } from '../state/prefs';
import { startUrlSync } from '../state/url-sync';
import { Hud } from '../ui/Hud';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { SEARCH_INPUT_ID } from '../ui/SearchBar';
import { useSharedSelection } from './use-shared-selection';
import { useWorldGeneration } from './use-world-generation';

export function App() {
  useEffect(() => {
    // URL first, then stored prefs, then defaults (SPEC F7: the spoiler setting persists).
    const stopUrl = startUrlSync(appStore, window, (parsed, search) =>
      applyStoredPrefs(parsed, search, prefsStore.getState().prefs),
    );
    const stopPrefs = startPrefsSync(appStore, prefsStore);
    return () => {
      stopPrefs();
      stopUrl();
    };
  }, []);
  useEffect(() => {
    ensureContentLoaded();
  }, []);
  useWorldGeneration();
  useSharedSelection();

  return (
    <div className="app">
      {/* First stop for keyboard users: straight to the search box (SPEC §7). */}
      <a
        className="skip-link"
        href={`#${SEARCH_INPUT_ID}`}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(SEARCH_INPUT_ID)?.focus();
        }}
      >
        Skip to search
      </a>
      <main className="map-main" aria-label="Map">
        <WorldCanvas />
        <LoadingOverlay />
      </main>
      <Hud />
    </div>
  );
}
