/**
 * Renderer tuning. Visual choices only, not game facts: world sizes and sea level come
 * from the generated world and public/data/world.json.
 */
export const RENDER = {
  terrain: {
    /** The heightmap is split into CHUNKS × CHUNKS meshes. */
    chunksPerSide: 16,
    /**
     * LOD thresholds as multiples of the chunk width: a chunk nearer than lodDistances[k]
     * chunk-widths uses level k (step 2^k cells). Beyond the last entry: the coarsest level.
     */
    lodDistances: [1.3, 2.6, 5.2] as const,
    /** Fractional hysteresis so chunks don't flicker between levels at a threshold. */
    lodHysteresis: 0.1,
    /** Chunks whose highest point is this far below sea level are hidden by the water. */
    underwaterCullM: 2,
  },
  exaggeration: { min: 1, max: 3, default: 1.5, step: 0.1 },
  props: {
    /** Props are shown within this camera distance (metres) and shrink out near the limit. */
    maxDistanceM: 2600,
    /** Props are not placed below this height above sea level. */
    minAltitudeM: 1,
    /** Steeper cells (rise per metre) get no trees. */
    maxTreeSlope: 0.9,
  },
  camera: {
    fov: 45,
    minDistanceM: 120,
    maxDistanceM: 34000,
    maxPolarAngle: 1.36,
    dampingFactor: 0.08,
    /** Overview: distance as a multiple of the world radius, and polar angle. */
    overviewDistanceFactor: 2.25,
    overviewPolar: 0.85,
    focusDurationS: 1.4,
    focusDistanceM: 2200,
  },
  rim: {
    /** Depth of the stylized crust wall below sea level, metres. */
    wallDepthM: 700,
    /** Height of the underside cone that makes the disc read as a floating world. */
    undersideDepthM: 5500,
    haloWidthFactor: 0.35,
  },
  stars: { count: 3500 },
  quality: {
    /** Default device-pixel-ratio cap; lowered to 1 if fps falls below minFps. */
    maxDpr: 1.5,
    minFps: 50,
    targetFps: 58,
  },
} as const;
