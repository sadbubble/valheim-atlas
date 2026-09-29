import { useEffect } from 'react';
import { RENDER } from '../render/render-config';
import { appStore } from '../state/app-store';
import { useCameraStore, type CameraNudge } from '../state/camera-store';
import { prefsStore } from '../state/prefs';
import { useUiStore } from '../state/ui-store';
import { SEARCH_INPUT_ID } from './SearchBar';

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/** Arrow/zoom keys move the camera only when nothing else wants them: the map or the page. */
const isMapTarget = (t: EventTarget | null) =>
  t === document.body || (t instanceof Element && t.closest('.world-canvas') !== null);

const K = RENDER.camera.keyboard;
const CAMERA_KEYS: Record<string, Partial<CameraNudge>> = {
  ArrowLeft: { panRight: -K.panFraction },
  ArrowRight: { panRight: K.panFraction },
  ArrowUp: { panUp: K.panFraction },
  ArrowDown: { panUp: -K.panFraction },
  '+': { zoom: 1 / K.zoomFactor },
  '=': { zoom: 1 / K.zoomFactor },
  '-': { zoom: K.zoomFactor },
  _: { zoom: K.zoomFactor },
  q: { rotate: -K.rotateRad },
  e: { rotate: K.rotateRad },
  PageUp: { tilt: -K.tiltRad },
  PageDown: { tilt: K.tiltRad },
};

/**
 * Global keys (SPEC N8): "/" search, "?" controls help, T top-down, R reset view, Esc closes
 * tools/panels, Delete removes the selected pin; with the map (or nothing) focused, arrows
 * pan, +/− zoom, Q/E rotate and PageUp/PageDown tilt.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      // A modal dialog (first-run prompt) owns the keyboard while it is open.
      if (document.querySelector('[aria-modal="true"]')) return;
      const ui = useUiStore.getState();
      const camera = useCameraStore.getState();
      const editable = isEditable(e.target);
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.key === '/' && !editable) {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      } else if (e.key === '?' && !editable) {
        const p = prefsStore.getState();
        p.update({ controlsHintHidden: !p.prefs.controlsHintHidden });
      } else if (key === 't' && !editable) {
        camera.topDown();
      } else if (key === 'r' && !editable) {
        camera.overview();
      } else if (e.key === 'Escape') {
        if (ui.tool !== 'none') ui.setTool('none');
        else if (ui.selection) ui.select(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !editable) {
        const id = ui.selection?.id;
        if (id && appStore.getState().pins.some((p) => p.id === id)) {
          appStore.getState().removePin(id);
          ui.select(null);
        }
      } else if (key in CAMERA_KEYS && isMapTarget(e.target)) {
        const nudge = CAMERA_KEYS[key];
        if (nudge) {
          e.preventDefault();
          camera.nudge(nudge);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
