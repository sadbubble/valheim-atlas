import { useUiStore } from '../state/ui-store';

/** Hover tooltip for map markers (positioned at the pointer). */
export function Tooltip() {
  const hover = useUiStore((s) => s.hover);
  if (!hover) return null;
  return (
    <div
      className="map-tooltip"
      role="tooltip"
      data-testid="map-tooltip"
      style={{ left: hover.screenX + 14, top: hover.screenY + 14 }}
    >
      <strong>{hover.title}</strong>
      <span>{hover.subtitle}</span>
    </div>
  );
}
