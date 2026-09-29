import { prefsStore, usePrefsStore } from '../state/prefs';
import { Icon } from './Icon';

export const CONTROLS_HINT_ID = 'controls-hint';

/**
 * On-screen help for moving the 3D view with a mouse, touch or keyboard (SPEC N8).
 * Shown until dismissed; the "Controls" button (or "?") brings it back.
 */
export function ControlsHint() {
  const hidden = usePrefsStore((s) => s.prefs.controlsHintHidden === true);
  if (hidden) return null;
  return (
    <section
      id={CONTROLS_HINT_ID}
      className="hud-panel controls-hint"
      aria-labelledby="controls-hint-title"
    >
      <header className="info-head">
        <h2 id="controls-hint-title">Moving around</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Hide controls help"
          onClick={() => {
            prefsStore.getState().update({ controlsHintHidden: true });
          }}
        >
          <Icon id="close" size={14} />
        </button>
      </header>
      <div className="controls-cols">
        <div>
          <h3>Mouse</h3>
          <ul>
            <li>Drag: orbit</li>
            <li>Right-drag: pan</li>
            <li>Scroll: zoom</li>
            <li>Double-click: focus there</li>
          </ul>
        </div>
        <div>
          <h3>Touch</h3>
          <ul>
            <li>One finger: orbit</li>
            <li>Two fingers: pan</li>
            <li>Pinch: zoom</li>
          </ul>
        </div>
        <div>
          <h3>Keyboard</h3>
          <ul>
            <li>
              <kbd>Tab</kbd> to the map, then arrows: pan
            </li>
            <li>
              <kbd>+</kbd> / <kbd>−</kbd>: zoom · <kbd>Q</kbd> / <kbd>E</kbd>: rotate
            </li>
            <li>
              <kbd>PgUp</kbd> / <kbd>PgDn</kbd>: tilt
            </li>
            <li>
              <kbd>T</kbd>: top-down · <kbd>R</kbd>: reset
            </li>
            <li>
              <kbd>/</kbd>: search · <kbd>?</kbd>: this help
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
