import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { appStore } from '../state/app-store';
import { useMapStore } from '../state/map-store';
import { useRenderStore } from '../state/render-store';
import { useUiStore } from '../state/ui-store';
import { BiomeLabels } from './BiomeLabels';
import { computeBiomeAnchors } from './biome-anchors';
import { Interaction } from './Interaction';
import { Markers } from './Markers';
import { MeasureLine } from './MeasureLine';
import { useWorldStore } from '../state/world-store';
import { CameraRig } from './CameraRig';
import { atlasDebug } from './debug-hooks';
import { frameStats } from './frame-stats';
import { createSharedUniforms } from './materials';
import { Props } from './Props';
import { Starfield } from './Starfield';
import { SurfacePicker } from './SurfacePicker';
import { Terrain } from './Terrain';
import { createTerrainModel } from './terrain-model';
import { Water } from './Water';
import { WorldRim } from './WorldRim';

export function WorldScene() {
  const status = useWorldStore((s) => s.status);
  const ready = status.kind === 'ready' ? status : null;
  const world = ready?.world;
  const constants = ready?.constants;

  const model = useMemo(
    () => (world && constants ? createTerrainModel(world, constants) : null),
    [world, constants],
  );
  useEffect(() => () => model?.dispose(), [model]);

  // Representative points per biome region, shared with the UI (labels, fly-to).
  useEffect(() => {
    useMapStore
      .getState()
      .setAnchors(
        model ? computeBiomeAnchors(model.world, { maxRadiusM: model.worldRadiusM }) : [],
      );
  }, [model]);

  const shared = useMemo(
    () =>
      createSharedUniforms({
        extentM: model?.world.extentM ?? 1,
        worldRadiusM: model?.worldRadiusM ?? 1,
        waterEdgeM: model?.waterEdgeM ?? 1,
        seaLevelM: model?.seaLevelM ?? 0,
      }),
    [model],
  );

  const framesSinceModel = useRef(0);
  useEffect(() => {
    framesSinceModel.current = 0;
    atlasDebug().ready = false;
  }, [model]);

  useFrame(({ clock, gl }, delta) => {
    // SPEC §7: shader motion (marker pulse, highlight pulse, lava, mist, stars, rim) stands
    // still when the user prefers reduced motion.
    if (!prefersReducedMotion()) shared.uTime.value = clock.elapsedTime;
    frameStats.shaderTimeS = shared.uTime.value;
    shared.uExag.value = useRenderStore.getState().exaggeration;
    shared.uGrid.value = appStore.getState().layers.includes('grid') ? 1 : 0;
    const hl = useUiStore.getState().highlight;
    shared.uHighlightOn.value = hl.biomes.length > 0 || hl.locationTypes.length > 0 ? 1 : 0;
    if (model) {
      const ids = model.world.biomeIds;
      for (let k = 0; k < shared.uHighlight.value.length; k++) {
        const id = ids[k];
        shared.uHighlight.value[k] = id !== undefined && hl.biomes.includes(id) ? 1 : 0;
      }
    }
    if (delta > 0) frameStats.fps = frameStats.fps * 0.92 + (1 / delta) * 0.08;
    frameStats.drawCalls = gl.info.render.calls;
    frameStats.triangles = gl.info.render.triangles;
    if (model && ++framesSinceModel.current === 5) atlasDebug().ready = true;
  });

  return (
    <>
      <Starfield shared={shared} />
      <CameraRig worldRadiusM={model?.worldRadiusM ?? null} />
      {model ? (
        <>
          {/* Game coordinates are left-handed (x east, z north, y up); mirror z for three.js. */}
          <group scale={[1, 1, -1]}>
            <Terrain model={model} shared={shared} />
            <Water model={model} shared={shared} />
            <WorldRim model={model} shared={shared} />
            <Props model={model} shared={shared} />
            <Markers model={model} shared={shared} />
            <MeasureLine model={model} />
            <BiomeLabels model={model} />
          </group>
          <SurfacePicker model={model} shared={shared} />
          <Interaction model={model} shared={shared} />
        </>
      ) : null}
    </>
  );
}
