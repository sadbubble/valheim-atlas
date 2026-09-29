import { boxBlur } from './surface-textures';

/**
 * Soft mask for the search highlight: 255 inside the highlighted biomes, 0 outside, blurred
 * so the shader's 0.5 iso-line is a smooth curve instead of the 20 m biome grid's stair
 * steps. The biome grid itself is untouched: this only changes how the highlight is drawn.
 * Built once per highlight in the terrain-prep worker, never per frame.
 *
 * Features narrower than about one blur width (single stray cells) fade below 0.5 and are
 * not outlined; everything larger keeps its shape with rounded corners.
 */
export function buildHighlightMask(
  biomes: Uint8Array,
  resolution: number,
  /** Biome indices (into the world's biomeIds) to highlight. */
  selected: readonly number[],
  blurRadiusCells: number,
  passes: number,
): Uint8Array<ArrayBuffer> {
  const count = resolution * resolution;
  const out = new Uint8Array(count);
  if (selected.length === 0) return out;
  const on = new Uint8Array(256);
  for (const b of selected) on[b & 255] = 1;
  const mask = new Float32Array(count);
  let any = false;
  for (let k = 0; k < count; k++) {
    const v = on[biomes[k] ?? 0] ?? 0;
    mask[k] = v;
    if (v) any = true;
  }
  if (!any) return out;
  boxBlur(mask, resolution, 1, blurRadiusCells, passes);
  for (let k = 0; k < count; k++) out[k] = Math.round((mask[k] ?? 0) * 255);
  return out;
}
