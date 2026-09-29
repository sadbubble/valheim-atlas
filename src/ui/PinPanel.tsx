import { formatCoords, formatDistance } from '../lib/format';
import { useAppStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useUiStore } from '../state/ui-store';
import type { Pin } from '../state/url-state';
import { Icon } from './Icon';

export function PinPanel({ pin }: { pin: Pin }) {
  const pins = useAppStore((s) => s.pins);
  const { renamePin, removePin } = useAppStore((s) => s);
  const others = pins.filter((p) => p.id !== pin.id);
  return (
    <section className="info-panel hud-panel" aria-labelledby="info-title" data-testid="info-panel">
      <header className="info-head">
        <span className="kind">
          <Icon id="pin" /> Your pin
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={() => {
            useUiStore.getState().select(null);
          }}
        >
          <Icon id="close" />
        </button>
      </header>
      <label className="pin-name">
        <span id="info-title">Name</span>
        <input
          value={pin.label}
          maxLength={40}
          onChange={(e) => {
            renamePin(pin.id, e.target.value);
          }}
        />
      </label>
      <p>{formatCoords(pin.x, pin.z)}</p>
      {others.length > 0 ? (
        <ul className="id-list">
          {others.map((o) => (
            <li key={o.id}>
              {formatDistance(Math.hypot(o.x - pin.x, o.z - pin.z))} to {o.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row">
        <button
          type="button"
          onClick={() => {
            useCameraStore.getState().focus(pin.x, pin.z, 1500);
          }}
        >
          <Icon id="fly" /> Fly here
        </button>
        <button
          type="button"
          onClick={() => {
            removePin(pin.id);
            useUiStore.getState().select(null);
          }}
        >
          Delete pin
        </button>
      </div>
    </section>
  );
}
