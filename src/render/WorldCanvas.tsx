import { Canvas } from '@react-three/fiber';
import { AdaptiveQuality } from './AdaptiveQuality';
import { SCENE_COLORS } from './palette';
import { RENDER } from './render-config';
import { WorldScene } from './WorldScene';

export const MAP_DESCRIPTION_ID = 'map-description';
/** User Timing mark: the WebGL renderer exists (its one-off start-up cost is behind us). */
export const RENDERER_READY_MARK = 'atlas:renderer-ready';

export function WorldCanvas() {
  return (
    <>
      {/* The 3D view is visual only; say where its content is reachable in text (SPEC §7). */}
      <p id={MAP_DESCRIPTION_ID} className="sr-only">
        A 3D picture of the world. Everything shown on it can also be reached without the view: use
        the search box, the biome name buttons, the map layers list and the progression guide. Press
        Tab to leave the view.
      </p>
      <Canvas
        className="world-canvas"
        camera={{ position: [0, 14000, 22000], fov: RENDER.camera.fov, near: 5, far: 200000 }}
        dpr={[1, RENDER.quality.maxDpr]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        // Focusable so the keyboard camera controls work here (SPEC N8; see ui/use-shortcuts).
        tabIndex={0}
        // "application" passes arrow keys through to the camera for screen-reader users; Tab
        // still moves on (nothing traps it), and the description points to text alternatives.
        role="application"
        aria-roledescription="3D map"
        aria-label="3D world view. Arrow keys pan, plus and minus zoom, Q and E rotate, Page Up and Page Down tilt, T top-down view, R reset view."
        aria-describedby={MAP_DESCRIPTION_ID}
        onCreated={() => {
          performance.mark(RENDERER_READY_MARK);
        }}
      >
        <color attach="background" args={[SCENE_COLORS.space]} />
        <AdaptiveQuality />
        <WorldScene />
      </Canvas>
    </>
  );
}
