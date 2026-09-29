import { useAppStore } from '../state/app-store';
import { useUiStore } from '../state/ui-store';
import { effectiveSpoiler } from '../state/url-state';

/** Returns a predicate: is this entry hidden by the user's spoiler setting? */
export function useSpoilerHidden(): (level: number, id: string) => boolean {
  const spoiler = useAppStore(effectiveSpoiler);
  const revealed = useUiStore((s) => s.revealed);
  return (level, id) => level > spoiler && !revealed.includes(id);
}

export const SPOILER_LABELS = ['Spoiler-free', 'Mild spoiler', 'Major spoiler'] as const;

export function spoilerLabel(level: number): string {
  return SPOILER_LABELS[Math.min(2, Math.max(0, Math.round(level))) as 0 | 1 | 2];
}
