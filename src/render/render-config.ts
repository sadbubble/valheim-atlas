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
    /** Soft biome borders: blur radius in metres (converted to cells per world). */
    biomeBlurM: 45,
  },
  /** Search highlight mask (render/highlight-mask.ts): box-blur radius in cells and passes. */
  highlight: { maskBlurCells: 1, maskBlurPasses: 3 },
  atmosphere: {
    /** Haze starts at this multiple of the camera's orbit distance… */
    fogStartFactor: 0.6,
    /** …and reaches 63% of fogMax this many orbit distances further out. */
    fogScaleFactor: 3.5,
    fogMax: 0.75,
    /** Horizon band of the sky, as the sine of the elevation: [below, above] the horizon. */
    horizonBand: [-0.08, 0.32] as const,
    horizonStrength: 0.9,
  },
  /** Fade the world in once it is ready (instant under reduced motion). */
  reveal: { durationS: 1.1 },
  /**
   * Loading screen: share of the progress bar for generation (or loading the saved world)
   * and for building the render buffers; shader compiling fills the rest. Fade-out in s.
   */
  /** Biome labels hide while they would overlap a HUD control (render/label-occlusion.ts). */
  labels: { hudMarginPx: 6, hudRefreshMs: 200 },
  loading: {
    generationShare: 0.85,
    prepareShare: 0.1,
    fadeOutS: 0.6,
    /** Background shader-compile wait where the browser can't report progress (precompile.ts). */
    shaderSettleMs: 900,
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
    /** Top-down "map" view: almost straight down (exactly 0 makes the view direction degenerate). */
    topDownPolar: 0.001,
    /** Keyboard steps: pan as a fraction of the view distance, zoom factor, angles in radians. */
    keyboard: { panFraction: 0.1, zoomFactor: 1.25, rotateRad: 0.15, tiltRad: 0.1 },
    focusDurationS: 1.4,
    /**
     * Fly-to feel: long flights take a little longer (s per km, up to maxS) and rise in an
     * arc: at mid-flight the view pulls back by arcFactor × the distance travelled, less half
     * the larger end distance (no arc for hops under arcMinTravelM), then settles in without
     * overshoot.
     */
    fly: { perKmS: 0.05, maxS: 2.3, arcFactor: 0.35, arcMinTravelM: 1500 },
    focusDistanceM: 2200,
    /** Search / "Fly here" distances for a location vs a whole biome. */
    flyLocationDistanceM: 2200,
    flyBiomeDistanceM: 6500,
  },
  rim: {
    /** Depth of the stylized crust wall below sea level, metres. */
    wallDepthM: 700,
    /** Height of the underside cone that makes the disc read as a floating world. */
    undersideDepthM: 5500,
    haloWidthFactor: 0.35,
  },
  stars: { count: 3500 },
  overlay: {
    /** Coordinate grid spacing (visual choice). */
    gridSpacingM: 1000,
  },
  markers: {
    /** Upper bound of drawn markers (instances). */
    max: 8000,
    /** Icon size in CSS pixels at the reference distance; scaled by refDistanceM / distance. */
    sizePx: { important: 30, normal: 23, minor: 18, pin: 30, badge: 26 },
    refDistanceM: 6000,
    minScale: 0.7,
    maxScale: 1.35,
    /** A selected or hovered marker grows by this factor… */
    selectedScale: 1.25,
    /** …and its quad by this much more, to fit the halo ring around it. */
    haloScale: 1.45,
    /** Hit radius padding around an icon, CSS pixels. */
    pickPaddingPx: 4,
    /** A pointer that moves less than this between down and up is a click. */
    clickSlopPx: 5,
  },
  quality: {
    /** Default device-pixel-ratio cap; lowered to 1 if fps falls below minFps. */
    maxDpr: 1.5,
    minFps: 50,
    targetFps: 58,
  },
} as const;
