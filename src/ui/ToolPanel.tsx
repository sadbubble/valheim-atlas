import { useState } from 'react';
import { formatCoords, formatDistance } from '../lib/format';
import { appStore, useAppStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useUiStore } from '../state/ui-store';
import { Icon } from './Icon';
import { shareUrl } from './share';

export function ToolPanel() {
  const tool = useUiStore((s) => s.tool);
  const measure = useUiStore((s) => s.measure);
  const pins = useAppStore((s) => s.pins);
  const [status, setStatus] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const { setTool } = useUiStore.getState();

  const copy = () => {
    const url = shareUrl();
    const done = () => {
      setStatus('Link copied');
      setFallbackUrl(null);
    };
    const fail = () => {
      setStatus('Copy this link:');
      setFallbackUrl(url);
    };
    if ('clipboard' in navigator && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url).then(done, fail);
    } else fail();
  };

  const addAtView = () => {
    const v = useCameraStore.getState().getView();
    const pin = appStore.getState().addPin(v?.x ?? 0, v?.z ?? 0);
    if (pin) useUiStore.getState().select({ id: pin.id });
  };

  const [a, b] = measure;
  return (
    <div className="tool-panel">
      <div className="row" role="group" aria-label="Map tools">
        <button
          type="button"
          aria-pressed={tool === 'pin'}
          onClick={() => {
            setTool(tool === 'pin' ? 'none' : 'pin');
          }}
        >
          <Icon id="pin" /> Place pin
        </button>
        <button
          type="button"
          aria-pressed={tool === 'measure'}
          onClick={() => {
            setTool(tool === 'measure' ? 'none' : 'measure');
          }}
        >
          <Icon id="ruler" /> Measure
        </button>
        <button type="button" onClick={copy}>
          <Icon id="link" /> Copy link
        </button>
      </div>
      <p className="hud-hint" aria-live="polite">
        {tool === 'pin'
          ? 'Click the map to drop a pin. Drag pins to move them. Esc to stop.'
          : tool === 'measure'
            ? a && b
              ? `Distance: ${formatDistance(Math.hypot(b.x - a.x, b.z - a.z))}. Click to start again.`
              : a
                ? 'Click a second point.'
                : 'Click two points on the map.'
            : ''}
      </p>
      {status ? (
        <p className="hud-hint share-status" aria-live="polite">
          {status}
        </p>
      ) : null}
      {fallbackUrl ? (
        <input
          className="share-url"
          readOnly
          value={fallbackUrl}
          aria-label="Shareable link"
          onFocus={(e) => {
            e.target.select();
          }}
        />
      ) : null}
      <details className="pins" open={pins.length > 0}>
        <summary>My pins ({pins.length})</summary>
        <ul>
          {pins.map((p, k) => {
            const prev = k > 0 ? pins[k - 1] : undefined;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="entity-link"
                  onClick={() => {
                    useUiStore.getState().select({ id: p.id });
                    useCameraStore.getState().focus(p.x, p.z, 1500);
                  }}
                >
                  {p.label}
                </button>
                <span className="muted">
                  {formatCoords(p.x, p.z)}
                  {prev
                    ? ` · ${formatDistance(Math.hypot(p.x - prev.x, p.z - prev.z))} from ${prev.label}`
                    : ''}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Delete ${p.label}`}
                  onClick={() => {
                    appStore.getState().removePin(p.id);
                  }}
                >
                  <Icon id="close" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={addAtView}>
          Add pin at view centre
        </button>
      </details>
    </div>
  );
}
