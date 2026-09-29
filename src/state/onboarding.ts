import type { AppStore } from './app-store';
import type { PrefsStore } from './prefs';
import { LAYERS } from './url-state';

export type OnboardingChoice = 'newcomer' | 'veteran' | 'dismissed';

/**
 * Applies the first-run answer (SPEC §7): newcomers get the spoiler-safe default and the
 * progression guide; veterans get everything and all layers. Dismissing keeps the current
 * setup. The answer is stored so the prompt is not shown again.
 * Returns whether the progression guide should be opened.
 */
export function applyOnboardingChoice(
  choice: OnboardingChoice,
  app: AppStore,
  prefs: PrefsStore,
): { openGuide: boolean } {
  const a = app.getState();
  if (choice === 'newcomer') {
    a.setMode('newcomer');
    a.setSpoiler(null); // the newcomer default: spoiler-free (effectiveSpoiler → 0)
  } else if (choice === 'veteran') {
    a.setMode('veteran');
    a.setSpoiler(null); // the veteran default: everything (effectiveSpoiler → 2)
    a.setLayers(LAYERS);
  }
  prefs.getState().update({ onboarding: choice });
  return { openGuide: choice === 'newcomer' };
}
