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
};
