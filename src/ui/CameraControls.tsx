import { useCameraStore } from '../state/camera-store';
import { prefsStore, usePrefsStore } from '../state/prefs';
import { CONTROLS_HINT_ID } from './ControlsHint';

/** Always-visible camera buttons: reset, top-down map view and the controls help toggle. */
export function CameraControls() {
  const hintHidden = usePrefsStore((s) => s.prefs.controlsHintHidden === true);
  return (
    <div className="hud-panel hud-camera" role="group" aria-label="Camera">
      <button
        type="button"
        aria-keyshortcuts="R"
        title="Reset view (R)"
        onClick={() => {
          useCameraStore.getState().overview();
        }}
      >
        Reset view
      </button>
      <button
        type="button"
        aria-keyshortcuts="T"
        title="Look straight down, north up (T)"
        onClick={() => {
          useCameraStore.getState().topDown();
        }}
      >
        Top-down view
      </button>
      <button
        type="button"
        aria-expanded={!hintHidden}
        aria-controls={hintHidden ? undefined : CONTROLS_HINT_ID}
        aria-keyshortcuts="Shift+?"
        title="How to move the view (?)"
        onClick={() => {
          prefsStore.getState().update({ controlsHintHidden: !hintHidden });
        }}
      >
        Controls help
      </button>
    </div>
  );
}
