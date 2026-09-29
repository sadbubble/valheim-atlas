/**
 * Float32 → IEEE half-float bits, without three.js, so the terrain-prep worker stays small.
 * Same table method (and the same truncating rounding) as three's `DataUtils.toHalfFloat`;
 * a unit test checks the two agree bit for bit.
 */
const baseTable = new Uint32Array(512);
const shiftTable = new Uint32Array(512);
for (let i = 0; i < 256; ++i) {
  const e = i - 127;
  let base: number;
  let shift: number;
  if (e < -27) {
    base = 0x0000; // ±0 and values too small for a half
    shift = 24;
  } else if (e < -14) {
    base = 0x0400 >> (-e - 14); // subnormal half
    shift = -e - 1;
  } else if (e <= 15) {
    base = (e + 15) << 10; // normal half
    shift = 13;
  } else if (e < 128) {
    base = 0x7c00; // too large: infinity
    shift = 24;
  } else {
    base = 0x7c00; // NaN / infinity stay
    shift = 13;
  }
  baseTable[i] = base;
  baseTable[i | 0x100] = base | 0x8000;
  shiftTable[i] = shift;
  shiftTable[i | 0x100] = shift;
}

const HALF_MAX = 65504;
const floatView = new Float32Array(1);
const uintView = new Uint32Array(floatView.buffer);

export function toHalfFloat(value: number): number {
  floatView[0] = value > HALF_MAX ? HALF_MAX : value < -HALF_MAX ? -HALF_MAX : value;
  const f = uintView[0] ?? 0;
  const e = (f >> 23) & 0x1ff;
  return (baseTable[e] ?? 0) + ((f & 0x007fffff) >> (shiftTable[e] ?? 24));
}
