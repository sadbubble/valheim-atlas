/**
 * Square grid covering [-extentM, extentM]² in world metres.
 * Row-major; row 0 is the NORTH edge (+z), column 0 is the WEST edge (-x), so the arrays
 * can be drawn straight into an image with north up.
 */
export interface GridSpec {
  resolution: number;
  extentM: number;
  cellSizeM: number;
}

export function makeGrid(resolution: number, extentM: number): GridSpec {
  return { resolution, extentM, cellSizeM: (2 * extentM) / resolution };
}

export const cellCenterX = (g: GridSpec, i: number): number => -g.extentM + (i + 0.5) * g.cellSizeM;
export const cellCenterZ = (g: GridSpec, j: number): number => g.extentM - (j + 0.5) * g.cellSizeM;

/** Index of the cell containing (x, z), clamped to the grid. */
export function cellIndexAt(g: GridSpec, x: number, z: number): number {
  const n = g.resolution;
  const i = Math.min(n - 1, Math.max(0, Math.floor((x + g.extentM) / g.cellSizeM)));
  const j = Math.min(n - 1, Math.max(0, Math.floor((g.extentM - z) / g.cellSizeM)));
  return j * n + i;
}
