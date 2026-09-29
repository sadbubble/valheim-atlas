import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import { ICONS, MARKER_ICONS, type IconId } from './icons';

export const ATLAS_CELL = 64;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = Math.ceil(MARKER_ICONS.length / ATLAS_COLS);

export function atlasIndex(icon: IconId): number {
  const k = MARKER_ICONS.indexOf(icon);
  return k < 0 ? MARKER_ICONS.indexOf('unknown') : k;
}

/** Rasterizes our SVG icon paths (white glyphs on transparent) into a texture atlas. */
export function createIconAtlas(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * ATLAS_CELL;
  canvas.height = ATLAS_ROWS * ATLAS_CELL;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = '#ffffff';
  const glyph = ATLAS_CELL * 0.56;
  MARKER_ICONS.forEach((id, k) => {
    const col = k % ATLAS_COLS;
    const row = Math.floor(k / ATLAS_COLS);
    ctx.save();
    ctx.translate(
      col * ATLAS_CELL + (ATLAS_CELL - glyph) / 2,
      row * ATLAS_CELL + (ATLAS_CELL - glyph) / 2,
    );
    ctx.scale(glyph / 24, glyph / 24);
    const icon = ICONS[id];
    ctx.fill(new Path2D(icon.d), icon.evenOdd ? 'evenodd' : 'nonzero');
    ctx.restore();
  });
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
