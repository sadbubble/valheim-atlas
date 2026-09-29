import {
  BufferGeometry,
  Color,
  SRGBColorSpace,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PropKind } from './props-config';

type Rgb = readonly [number, number, number];
const TRUNK: Rgb = [0.42, 0.32, 0.24];
const WHITE: Rgb = [1, 1, 1];

/** Non-indexed copy with a constant vertex colour, so parts can be merged into one mesh. */
function part(geo: BufferGeometry, color: Rgb): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  geo.dispose();
  const count = g.getAttribute('position').count;
  const linear = new Color().setRGB(color[0], color[1], color[2], SRGBColorSpace);
  const colors = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) colors.set([linear.r, linear.g, linear.b], k * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  return g;
}

function merged(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  g.computeVertexNormals();
  return g;
}

/**
 * Our own low-poly prop meshes, in metres, standing on y = 0. Foliage is white so the
 * per-instance biome tint defines its colour.
 */
export function createPropGeometries(): Record<PropKind, BufferGeometry> {
  return {
    conifer: merged([
      part(new CylinderGeometry(0.35, 0.55, 3, 5).translate(0, 1.2, 0), TRUNK),
      part(new ConeGeometry(3.4, 7, 6).translate(0, 5.8, 0), WHITE),
      part(new ConeGeometry(2.5, 5.5, 6).translate(0, 9.2, 0), WHITE),
      part(new ConeGeometry(1.5, 3.8, 6).translate(0, 12, 0), WHITE),
    ]),
    broadleaf: merged([
      part(new CylinderGeometry(0.4, 0.6, 4.5, 5).translate(0, 1.9, 0), TRUNK),
      part(new IcosahedronGeometry(3.6, 0).scale(1, 0.85, 1).translate(0, 6.6, 0), WHITE),
      part(new IcosahedronGeometry(2.2, 0).translate(1.8, 7.8, 0.6), WHITE),
    ]),
    deadTree: merged([
      part(new ConeGeometry(0.55, 10, 5).translate(0, 4.6, 0), WHITE),
      part(new ConeGeometry(0.25, 4, 4).rotateZ(-0.9).translate(1.4, 6.5, 0), WHITE),
      part(new ConeGeometry(0.22, 3.2, 4).rotateZ(0.8).rotateY(2).translate(-0.9, 5.2, 0.8), WHITE),
    ]),
    rock: merged([
      part(new DodecahedronGeometry(2.3, 0).scale(1.2, 0.65, 1).translate(0, 0.4, 0), WHITE),
      part(new DodecahedronGeometry(1.2, 0).scale(1, 0.8, 1.1).translate(1.9, 0.2, 0.6), WHITE),
    ]),
    spire: merged([
      part(new ConeGeometry(2, 17, 5).translate(0, 7.5, 0), WHITE),
      part(new ConeGeometry(1.1, 8, 5).rotateZ(0.2).translate(1.7, 3.4, 0.4), WHITE),
    ]),
  };
}
