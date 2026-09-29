import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Group, Vector3 } from 'three';
import { prefersReducedMotion } from '../lib/reduced-motion';
import { appStore } from '../state/app-store';
import { useMapStore } from '../state/map-store';
import { useRenderStore } from '../state/render-store';
import { BiomeLabels } from './BiomeLabels';
import { Interaction } from './Interaction';
import { Markers } from './Markers';
import { MeasureLine } from './MeasureLine';
import { useWorldStore } from '../state/world-store';
import { CameraRig } from './CameraRig';
import { cellIndexAt } from '../world/grid';
import { atlasDebug } from './debug-hooks';
import { frameStats } from './frame-stats';
import { HighlightMask } from './HighlightMask';
import { sharedIconAtlas } from './icon-atlas';
import { createSharedUniforms, setWorldDims } from './materials';
import { precompileScene } from './precompile';
import { Props } from './Props';
import { RENDER } from './render-config';
import { Sky } from './Sky';
import { Starfield } from './Starfield';
import { SurfacePicker } from './SurfacePicker';
import { Terrain } from './Terrain';
import { createTerrainModel } from './terrain-model';
import { Water } from './Water';
import { WorldRim } from './WorldRim';

const smoothstep01 = (t: number) => t * t * (3 - 2 * t);

export function WorldScene() {
  const status = useWorldStore((s) => s.status);
  const ready = status.kind === 'ready' ? status : null;
  const world = ready?.world;
  const constants = ready?.constants;
  const prepared = ready?.prepared;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setFrameloop = useThree((s) => s.setFrameloop);

  // Cheap: the terrain-prep worker already built the buffers (render/terrain-prep.ts).
  const model = useMemo(
    () => (world && constants && prepared ? createTerrainModel(world, constants, prepared) : null),
    [world, constants, prepared],
  );
  useEffect(() => () => model?.dispose(), [model]);

  // e2e/screenshot hook: which biome is where (e.g. to frame a highlight edge).
  useEffect(() => {
    atlasDebug().biomeAt = (x, z) => {
      if (!model) return null;
      const w = model.world;
      if (Math.abs(x) > w.extentM || Math.abs(z) > w.extentM) return null;
      return w.biomeIds[w.biomes[cellIndexAt(w, x, z)] ?? -1] ?? null;
    };
  }, [model]);

  // Idle while the terrain-prep worker runs: build the (world-independent) icon atlas now.
  useEffect(() => {
    if (status.kind === 'preparing') sharedIconAtlas();
  }, [status.kind]);

  // Representative points per biome region, shared with the UI (labels, fly-to).
  useEffect(() => {
    useMapStore.getState().setAnchors(model ? model.anchors : []);
  }, [model]);

  // One set for the app's lifetime, so materials that don't depend on the world (stars)
  // aren't rebuilt, and their shaders re-linked, for every new world.
  const shared = useMemo(
    () => createSharedUniforms({ extentM: 1, worldRadiusM: 1, waterEdgeM: 1, seaLevelM: 0 }),
    [],
  );
  useLayoutEffect(() => {
    if (model) setWorldDims(shared, { ...model, extentM: model.world.extentM });
  }, [model, shared]);

  // Compile shaders and upload textures behind the loading screen, then fade the world in.
  const worldGroup = useRef<Group>(null);
  const reveal = useRef<{ startS: number | null; frames: number }>({ startS: null, frames: 0 });
  useEffect(() => {
    atlasDebug().ready = false;
    reveal.current = { startS: null, frames: 0 };
    const setStage = useRenderStore.getState().setSceneStage;
    const group = worldGroup.current;
    if (!model || !group) {
      setStage('empty');
      return;
    }
    let cancelled = false;
    group.visible = false;
    setStage('compiling');
    // Pause rendering meanwhile: a software GPU process that is still busy drawing earlier
    // frames makes every synchronous GL call (texture upload, shader link) wait for it.
    setFrameloop('never');
    const textures = [model.heightTex, model.weightsTex, model.colorTex];
    shared.uReveal.value = 0;
    precompileScene(gl, group, camera, scene, textures, {
      settleMs: RENDER.loading.shaderSettleMs,
      cancelled: () => cancelled,
    })
      .catch(() => undefined)
      .finally(() => {
        // A superseded run leaves the loop to its successor (see the cleanup below).
        if (cancelled) return;
        setFrameloop('always');
        group.visible = true;
        reveal.current.startS = -1; // starts on the next frame
        setStage('shown');
      });
    return () => {
      cancelled = true;
      setFrameloop('always');
    };
  }, [model, shared, gl, camera, scene, setFrameloop]);

  useFrame(({ clock, gl: renderer, camera: cam, controls }, delta) => {
    const reduced = prefersReducedMotion();
    // SPEC §7: shader motion (marker pulse, highlight pulse, lava, mist, stars, rim) stands
    // still when the user prefers reduced motion.
    if (!reduced) shared.uTime.value = clock.elapsedTime;
    frameStats.shaderTimeS = shared.uTime.value;
    shared.uExag.value = useRenderStore.getState().exaggeration;
    shared.uGrid.value = appStore.getState().layers.includes('grid') ? 1 : 0;
    // Aerial perspective follows the zoom: clear near the orbit target, hazy beyond it.
    const target = (controls as { target?: Vector3 } | null)?.target;
    const orbitM = Math.max(1, target ? cam.position.distanceTo(target) : cam.position.length());
    shared.uFogStart.value = orbitM * RENDER.atmosphere.fogStartFactor;
    shared.uFogDensity.value = 1 / (orbitM * RENDER.atmosphere.fogScaleFactor);

    // Fade-in once shaders are ready (instant under reduced motion).
    const r = reveal.current;
    if (r.startS === -1) r.startS = clock.elapsedTime;
    if (r.startS !== null) {
      const t = reduced ? 1 : (clock.elapsedTime - r.startS) / RENDER.reveal.durationS;
      shared.uReveal.value = t >= 1 ? 1 : smoothstep01(Math.max(0, t));
      if (shared.uReveal.value >= 1 && ++r.frames === 5) atlasDebug().ready = true;
    }
    frameStats.reveal = shared.uReveal.value;

    if (delta > 0) frameStats.fps = frameStats.fps * 0.92 + (1 / delta) * 0.08;
    frameStats.drawCalls = renderer.info.render.calls;
    frameStats.triangles = renderer.info.render.triangles;
  });

  return (
    <>
      <Sky />
      <Starfield shared={shared} />
      <CameraRig worldRadiusM={model?.worldRadiusM ?? null} />
      {model ? (
        <>
          {/* Game coordinates are left-handed (x east, z north, y up); mirror z for three.js. */}
          <group ref={worldGroup} scale={[1, 1, -1]} visible={false}>
            <Terrain model={model} shared={shared} />
            <Water model={model} shared={shared} />
            <WorldRim model={model} shared={shared} />
            <Props model={model} shared={shared} />
            <Markers model={model} shared={shared} />
            <MeasureLine model={model} />
            <BiomeLabels model={model} />
          </group>
          <HighlightMask model={model} shared={shared} />
          <SurfacePicker model={model} shared={shared} />
          <Interaction model={model} shared={shared} />
        </>
      ) : null}
    </>
  );
}
