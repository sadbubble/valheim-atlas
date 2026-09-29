import { appStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useUiStore } from '../state/ui-store';
import { toSearch } from '../state/url-state';

/** Build a link with seed, layers, spoiler setting, pins, filters, open panel and camera. */
export function shareUrl(): string {
  const s = appStore.getState();
  const cam = useCameraStore.getState().getView();
  const sel = useUiStore.getState().selection?.id ?? null;
  const search = toSearch({ ...s, cam, sel }, '');
  return `${window.location.origin}${window.location.pathname}${search}`;
}
