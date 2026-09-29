import { z } from 'zod';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { AppStore } from './app-store';
import { MODES, type UrlState } from './url-state';

/**
 * Per-viewer preferences kept in localStorage: the first-run answer, the last mode and
 * spoiler setting (SPEC F7), whether the controls hint is hidden, and guide progress.
 * Storage can be missing or throw (private windows, blocked site data), so every access is
 * wrapped and the app works the same without it, just without remembering.
 */
export const PREFS_KEY = 'valheim-atlas:prefs';

/** Upper bounds for stored lists: sanity limits, not game facts. */
const MAX_DONE_STEPS = 64;
const MAX_ID_LENGTH = 64;

export const PrefsSchema = z.object({
  /** The first-run answer; absent until the prompt was answered or dismissed. */
  onboarding: z.enum(['newcomer', 'veteran', 'dismissed']).optional(),
  mode: z.enum(MODES).optional(),
  spoiler: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  controlsHintHidden: z.boolean().optional(),
  /** Progression-guide step ids the user ticked off. */
  doneSteps: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_DONE_STEPS).optional(),
});
export type Prefs = z.infer<typeof PrefsSchema>;

/** The subset of the Web Storage API we use (injectable for tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `window.localStorage`, or null when there is none or merely touching it throws. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Reads stored prefs; anything missing, unreadable or malformed yields `{}`. */
export function readPrefs(storage: KeyValueStorage | null): Prefs {
  if (!storage) return {};
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (raw === null) return {};
    const parsed = PrefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Writes prefs; returns false (and changes nothing) when storage is unavailable. */
export function writePrefs(storage: KeyValueStorage | null, prefs: Prefs): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fills in what the URL does not say from stored prefs. Precedence for the spoiler setting
 * and the mode: URL > storage > the mode's default (see effectiveSpoiler).
 * `state` is the parsed URL (parseUrlState), `search` the raw query it came from.
 */
export function applyStoredPrefs(state: UrlState, search: string, prefs: Prefs): UrlState {
  const urlMode = new URLSearchParams(search).get('mode') === state.mode;
  return {
    ...state,
    mode: urlMode ? state.mode : (prefs.mode ?? state.mode),
    spoiler: state.spoiler ?? prefs.spoiler ?? null,
  };
}

/**
 * The "New to Valheim?" prompt appears only on a first visit: nothing stored yet and no
 * mode or spoiler setting in the URL (a shared link already decides those). A link straight
 * to the About view shows that instead of the prompt.
 */
export function shouldShowFirstRun(search: string, prefs: Prefs): boolean {
  if (prefs.onboarding !== undefined) return false;
  const params = new URLSearchParams(search);
  return !params.has('mode') && !params.has('spoiler') && params.get('about') !== '1';
}

export interface PrefsState {
  prefs: Prefs;
  /** Merges a patch into the prefs and persists it (a key set to undefined is removed). */
  update: (patch: Partial<Prefs>) => void;
  toggleStepDone: (stepId: string) => void;
}

export type PrefsStore = StoreApi<PrefsState>;

export function createPrefsStore(storage: KeyValueStorage | null): PrefsStore {
  return createStore<PrefsState>()((set, get) => {
    const update = (patch: Partial<Prefs>) => {
      // Drop keys patched to undefined, so they disappear from storage too.
      const next = Object.fromEntries(
        Object.entries({ ...get().prefs, ...patch }).filter(([, v]) => v !== undefined),
      ) as Prefs;
      set({ prefs: next });
      writePrefs(storage, next);
    };
    return {
      prefs: readPrefs(storage),
      update,
      toggleStepDone: (stepId) => {
        const done = get().prefs.doneSteps ?? [];
        update({
          doneSteps: done.includes(stepId)
            ? done.filter((id) => id !== stepId)
            : [...done, stepId].slice(-MAX_DONE_STEPS),
        });
      },
    };
  });
}

/** Persists mode and spoiler changes made in the app (the URL keeps working as before). */
export function startPrefsSync(app: AppStore, prefs: PrefsStore): () => void {
  return app.subscribe((state, prev) => {
    if (state.mode === prev.mode && state.spoiler === prev.spoiler) return;
    prefs.getState().update({ mode: state.mode, spoiler: state.spoiler ?? undefined });
  });
}

export const prefsStore: PrefsStore = createPrefsStore(browserStorage());

export function usePrefsStore<T>(selector: (state: PrefsState) => T): T {
  return useStore(prefsStore, selector);
}
