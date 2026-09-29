/** Mutable per-frame renderer stats, written in useFrame and polled by the UI. */
export const frameStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  terrainChunks: 0,
  propInstances: 0,
  markers: 0,
  /** Shader animation clock (s); stands still under prefers-reduced-motion. */
  shaderTimeS: 0,
  /** World fade-in, 0 → 1; jumps straight to 1 under prefers-reduced-motion. */
  reveal: 0,
  /** 1 while a search highlight is drawn on the terrain (its mask has arrived). */
  highlightOn: 0,
};
