import { useEffect } from 'react';
import { appStore } from '../state/app-store';
import { useUiStore } from '../state/ui-store';
import { SEARCH_INPUT_ID } from './SearchBar';

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/** "/" focuses search; Esc closes tools/panels; Delete removes the selected pin. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const ui = useUiStore.getState();
      if (e.key === '/' && !isEditable(e.target)) {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      } else if (e.key === 'Escape') {
        if (ui.tool !== 'none') ui.setTool('none');
        else if (ui.selection) ui.select(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable(e.target)) {
        const id = ui.selection?.id;
        if (id && appStore.getState().pins.some((p) => p.id === id)) {
          appStore.getState().removePin(id);
          ui.select(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
