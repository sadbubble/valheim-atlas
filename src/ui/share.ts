import { appStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { toSearch } from '../state/url-state';

/** Build a link with seed, layers, spoiler setting, pins and the current camera. */
export function shareUrl(): string {
  const s = appStore.getState();
  const cam = useCameraStore.getState().getView();
  const search = toSearch({ ...s, cam }, '');
  return `${window.location.origin}${window.location.pathname}${search}`;
}
