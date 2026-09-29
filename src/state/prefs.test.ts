import { describe, expect, it } from 'vitest';
import { createAppStore } from './app-store';
import { applyOnboardingChoice } from './onboarding';
import {
  PREFS_KEY,
  applyStoredPrefs,
  createPrefsStore,
  readPrefs,
  shouldShowFirstRun,
  startPrefsSync,
  writePrefs,
  type KeyValueStorage,
  type Prefs,
} from './prefs';
import { effectiveSpoiler, LAYERS, parseUrlState } from './url-state';

/** In-memory stand-in for localStorage. */
function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

/** Storage that throws on every call, like a blocked or full localStorage. */
const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

/** Resolves the initial app state the way App.tsx does. */
const resolve = (search: string, stored: Prefs) =>
  applyStoredPrefs(parseUrlState(search), search, stored);

describe('prefs storage', () => {
  it('round-trips through storage', () => {
    const s = memoryStorage();
    expect(writePrefs(s, { onboarding: 'veteran', spoiler: 1 })).toBe(true);
    expect(readPrefs(s)).toEqual({ onboarding: 'veteran', spoiler: 1 });
  });

  it('falls back to empty prefs when storage throws, is missing or holds junk', () => {
    expect(readPrefs(throwingStorage)).toEqual({});
    expect(writePrefs(throwingStorage, { onboarding: 'newcomer' })).toBe(false);
    expect(readPrefs(null)).toEqual({});
    expect(writePrefs(null, {})).toBe(false);
    expect(readPrefs(memoryStorage({ [PREFS_KEY]: '{not json' }))).toEqual({});
    expect(readPrefs(memoryStorage({ [PREFS_KEY]: '{"spoiler":7}' }))).toEqual({});
  });

  it('a prefs store keeps working in memory when storage throws', () => {
    const store = createPrefsStore(throwingStorage);
    expect(store.getState().prefs).toEqual({});
    store.getState().update({ onboarding: 'dismissed' });
    store.getState().toggleStepDone('test-step');
    expect(store.getState().prefs).toEqual({ onboarding: 'dismissed', doneSteps: ['test-step'] });
    store.getState().toggleStepDone('test-step');
    expect(store.getState().prefs.doneSteps).toEqual([]);
  });

  it('removes keys set to undefined', () => {
    const s = memoryStorage();
    const store = createPrefsStore(s);
    store.getState().update({ spoiler: 2, mode: 'veteran' });
    store.getState().update({ spoiler: undefined });
    expect(JSON.parse(s.data[PREFS_KEY] ?? '{}')).toEqual({ mode: 'veteran' });
  });
});

describe('spoiler precedence: URL > storage > mode default', () => {
  it('uses the URL value when present', () => {
    const s = resolve('?spoiler=2', { spoiler: 0 });
    expect(s.spoiler).toBe(2);
    expect(effectiveSpoiler(s)).toBe(2);
  });

  it('uses the stored value when the URL is silent or invalid', () => {
    expect(resolve('', { spoiler: 1 }).spoiler).toBe(1);
    expect(resolve('?spoiler=9', { spoiler: 1 }).spoiler).toBe(1);
  });

  it("falls back to the mode's default when nothing is set", () => {
    expect(effectiveSpoiler(resolve('', {}))).toBe(0);
    expect(effectiveSpoiler(resolve('?mode=veteran', {}))).toBe(2);
    expect(effectiveSpoiler(resolve('', { mode: 'veteran' }))).toBe(2);
  });

  it('the URL mode wins over the stored mode', () => {
    expect(resolve('?mode=newcomer', { mode: 'veteran' }).mode).toBe('newcomer');
    expect(resolve('?mode=bogus', { mode: 'veteran' }).mode).toBe('veteran');
  });

  it('persists spoiler and mode changes made in the app', () => {
    const s = memoryStorage();
    const prefs = createPrefsStore(s);
    const app = createAppStore();
    const stop = startPrefsSync(app, prefs);
    app.getState().setSpoiler(1);
    expect(readPrefs(s)).toEqual({ mode: 'newcomer', spoiler: 1 });
    app.getState().setMode('veteran');
    app.getState().setSpoiler(null);
    expect(readPrefs(s)).toEqual({ mode: 'veteran' });
    app.getState().setSeed('unrelated');
    expect(readPrefs(s)).toEqual({ mode: 'veteran' });
    stop();
    app.getState().setSpoiler(2);
    expect(readPrefs(s).spoiler).toBeUndefined();
  });
});

describe('first-run prompt', () => {
  it('shows only on a clean first visit', () => {
    expect(shouldShowFirstRun('', {})).toBe(true);
    expect(shouldShowFirstRun('?seed=abc', {})).toBe(true);
    expect(shouldShowFirstRun('?mode=veteran', {})).toBe(false);
    expect(shouldShowFirstRun('?spoiler=0', {})).toBe(false);
    expect(shouldShowFirstRun('', { onboarding: 'dismissed' })).toBe(false);
  });

  it('shows again on every visit when storage is unavailable, without crashing', () => {
    const prefs = createPrefsStore(throwingStorage);
    applyOnboardingChoice('newcomer', createAppStore(), prefs);
    expect(shouldShowFirstRun('', readPrefs(throwingStorage))).toBe(true);
  });

  it('"Yes" gives the spoiler-free newcomer setup and opens the guide', () => {
    const s = memoryStorage();
    const prefs = createPrefsStore(s);
    const app = createAppStore({ ...parseUrlState(''), mode: 'veteran', spoiler: 2 });
    expect(applyOnboardingChoice('newcomer', app, prefs)).toEqual({ openGuide: true });
    expect(app.getState().mode).toBe('newcomer');
    expect(effectiveSpoiler(app.getState())).toBe(0);
    expect(shouldShowFirstRun('', readPrefs(s))).toBe(false);
  });

  it('"No" gives the veteran setup with every layer', () => {
    const prefs = createPrefsStore(memoryStorage());
    const app = createAppStore();
    expect(applyOnboardingChoice('veteran', app, prefs)).toEqual({ openGuide: false });
    expect(app.getState().mode).toBe('veteran');
    expect(effectiveSpoiler(app.getState())).toBe(2);
    expect([...app.getState().layers].sort()).toEqual([...LAYERS].sort());
  });

  it('dismissing keeps the current setup but is remembered', () => {
    const s = memoryStorage();
    const app = createAppStore();
    const before = app.getState().layers;
    applyOnboardingChoice('dismissed', app, createPrefsStore(s));
    expect(app.getState().layers).toBe(before);
    expect(readPrefs(s).onboarding).toBe('dismissed');
  });
});
