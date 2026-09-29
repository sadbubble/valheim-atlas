import { useEffect } from 'react';
import { highlightFor } from '../render/navigation';
import { appStore, useAppStore } from '../state/app-store';
import { useContentStore } from '../state/content-store';
import { useUiStore } from '../state/ui-store';

/**
 * Opens the panel named by a shared link's `sel` param once the content is loaded (SPEC V6),
 * then clears it so it is not re-applied. The camera comes from `cam`, so no fly-to here.
 */
export function useSharedSelection(): void {
  const sel = useAppStore((s) => s.sel);
  const index = useContentStore((s) => s.index);
  useEffect(() => {
    if (sel === null || !index) return;
    appStore.setState({ sel: null });
    const isPin = appStore.getState().pins.some((p) => p.id === sel);
    if (!isPin && !index.byId.has(sel)) return;
    const ui = useUiStore.getState();
    ui.select({ id: sel });
    if (!isPin) ui.setHighlight(highlightFor(index, sel));
  }, [sel, index]);
}
