/**
 * Map labels vs. HUD controls (WCAG 2.2 target size): a floating biome label must never sit
 * under, or poke out from behind, a HUD button. Rects are flat [left, top, right, bottom]
 * quadruples in CSS pixels so the per-frame check allocates nothing.
 */

/** Selector for the HUD surfaces labels must stay clear of. */
export const HUD_SURFACE_SELECTOR = '.hud .hud-panel, .hud .search, .skip-link:focus';

/** Writes the visible HUD surfaces' rects into `out`; returns how many were written. */
export function collectHudRects(root: ParentNode, out: Float64Array): number {
  let count = 0;
  for (const el of root.querySelectorAll(HUD_SURFACE_SELECTOR)) {
    if (count * 4 + 4 > out.length) break;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    out[count * 4] = r.left;
    out[count * 4 + 1] = r.top;
    out[count * 4 + 2] = r.right;
    out[count * 4 + 3] = r.bottom;
    count++;
  }
  return count;
}

/**
 * True when a label centred at (cx, cy) with the given size overlaps any HUD rect (grown by
 * `marginPx`), or is not wholly inside the viewport.
 */
export function labelCovered(
  cx: number,
  cy: number,
  widthPx: number,
  heightPx: number,
  hud: Float64Array,
  hudCount: number,
  viewportW: number,
  viewportH: number,
  marginPx: number,
): boolean {
  const left = cx - widthPx / 2;
  const right = cx + widthPx / 2;
  const top = cy - heightPx / 2;
  const bottom = cy + heightPx / 2;
  if (left < 0 || top < 0 || right > viewportW || bottom > viewportH) return true;
  for (let k = 0; k < hudCount; k++) {
    const o = k * 4;
    if (
      left < (hud[o + 2] ?? 0) + marginPx &&
      right > (hud[o] ?? 0) - marginPx &&
      top < (hud[o + 3] ?? 0) + marginPx &&
      bottom > (hud[o + 1] ?? 0) - marginPx
    ) {
      return true;
    }
  }
  return false;
}
