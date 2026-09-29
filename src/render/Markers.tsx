import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type Vector3,
} from 'three';
import { useAppStore } from '../state/app-store';
import { useContentStore } from '../state/content-store';
import { useMapStore } from '../state/map-store';
import { useUiStore } from '../state/ui-store';
import { effectiveSpoiler, type Layer } from '../state/url-state';
import { frameStats } from './frame-stats';
import { ATLAS_COLS, ATLAS_ROWS, atlasIndex, createIconAtlas } from './icon-atlas';
import { markerRegistry, type PlacedMarker } from './marker-registry';
import { buildMarkerSources, clusterCellSize, clusterMarkers } from './markers-model';
import type { SharedUniforms } from './materials';
import { LAYER_COLORS, MARKER_COLORS } from './palette';
import { sampleHeight } from './pick';
import { RENDER } from './render-config';
import { MARKER_FRAGMENT, MARKER_VERTEX } from './shaders/markers';
import type { TerrainModel } from './terrain-model';

const IMPORTANT = new Set<Layer>(['bosses', 'npcs']);

/** Billboarded, clustered map markers for locations, biome badges and user pins. */
export function Markers({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const index = useContentStore((s) => s.index);
  const layers = useAppStore((s) => s.layers);
  const pins = useAppStore((s) => s.pins);
  const hide = useAppStore((s) => s.hide);
  const spoiler = useAppStore(effectiveSpoiler);
  const anchors = useMapStore((s) => s.anchors);
  const highlight = useUiStore((s) => s.highlight);
  const selection = useUiStore((s) => s.selection);
  const hoverKey = useUiStore((s) => s.hover?.key ?? null);

  const sources = useMemo(() => {
    if (!index) return [];
    return buildMarkerSources({
      locations: model.world.locations,
      types: new Map(index.data.locations.map((l) => [l.id, l])),
      anchors,
      biomes: new Map(index.data.biomes.map((b) => [b.id, b])),
      pins,
      layers,
      hide,
    });
  }, [index, model, anchors, pins, layers, hide]);

  const res = useMemo(() => {
    const max = RENDER.markers.max;
    const geometry = new PlaneGeometry(1, 1);
    const aIcon = new InstancedBufferAttribute(new Float32Array(max), 1);
    const aColor = new InstancedBufferAttribute(new Float32Array(max * 3), 3);
    const aSize = new InstancedBufferAttribute(new Float32Array(max), 1);
    const aState = new InstancedBufferAttribute(new Float32Array(max), 1);
    geometry.setAttribute('aIcon', aIcon);
    geometry.setAttribute('aColor', aColor);
    geometry.setAttribute('aSize', aSize);
    geometry.setAttribute('aState', aState);
    const atlas = createIconAtlas();
    const material = new ShaderMaterial({
      vertexShader: MARKER_VERTEX,
      fragmentShader: MARKER_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uAtlas: { value: atlas },
        uViewport: { value: new Vector2(1, 1) },
        uExag: shared.uExag,
        uTime: shared.uTime,
        uAtlasCols: { value: ATLAS_COLS },
        uAtlasRows: { value: ATLAS_ROWS },
        uRefDist: { value: RENDER.markers.refDistanceM },
        uMinScale: { value: RENDER.markers.minScale },
        uMaxScale: { value: RENDER.markers.maxScale },
        uGlyph: { value: new Color(MARKER_COLORS.glyph) },
        uRing: { value: new Color(MARKER_COLORS.ring) },
        uGold: { value: new Color(MARKER_COLORS.selected) },
      },
    });
    const mesh = new InstancedMesh(geometry, material, max);
    mesh.frustumCulled = false;
    mesh.renderOrder = 20;
    mesh.count = 0;
    mesh.name = 'markers';
    const colors = Object.fromEntries(
      Object.entries(LAYER_COLORS).map(([k, v]) => [k, new Color(v)]),
    ) as Record<Layer, Color>;
    return { mesh, geometry, material, atlas, aIcon, aColor, aSize, aState, colors };
  }, [shared]);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.material.dispose();
      res.atlas.dispose();
      res.mesh.dispose();
      markerRegistry.markers = [];
    },
    [res],
  );

  const st = useRef({ cell: -1, dirty: true });
  useEffect(() => {
    st.current.dirty = true;
  }, [sources, spoiler, highlight, selection, hoverKey]);

  useFrame(({ camera, size, controls }) => {
    const viewport = res.material.uniforms.uViewport?.value as Vector2 | undefined;
    viewport?.set(size.width, size.height);
    const target = (controls as { target?: Vector3 } | null)?.target;
    const dist = target ? camera.position.distanceTo(target) : camera.position.length();
    const cell = clusterCellSize(dist);
    if (cell === st.current.cell && !st.current.dirty) return;
    st.current.cell = cell;
    st.current.dirty = false;

    const markers = clusterMarkers(sources, cell, spoiler).slice(0, RENDER.markers.max);
    const hlActive = highlight.biomes.length > 0 || highlight.locationTypes.length > 0;
    const hidden = new Color(MARKER_COLORS.hidden);
    const S = RENDER.markers.sizePx;
    const placed: PlacedMarker[] = [];
    const matrix = res.mesh.instanceMatrix.array as Float32Array;
    markers.forEach((m, k) => {
      const yM = Math.max(0, sampleHeight(model.world, m.x, m.z) - model.seaLevelM);
      const isBadge = m.layer === 'creatures' || m.layer === 'resources';
      const base =
        m.layer === 'pins'
          ? S.pin
          : isBadge
            ? S.badge
            : IMPORTANT.has(m.layer)
              ? S.important
              : m.layer === 'dungeons'
                ? S.normal
                : S.minor;
      const sizePx = m.cluster > 1 ? base + 4 * Math.log2(m.cluster) : base;
      const selected =
        (selection?.instance !== undefined && selection.instance.id === m.instanceId) ||
        (m.instanceId === undefined && m.cluster === 1 && selection?.id === m.contentId) ||
        hoverKey === m.key;
      const matches = isBadge
        ? highlight.biomes.includes(m.contentId as never)
        : highlight.locationTypes.includes(m.contentId);
      const state = selected
        ? 1
        : hlActive && m.layer !== 'pins'
          ? matches
            ? 2
            : 3
          : m.cluster > 1
            ? 4
            : 0;
      matrix.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, m.x, yM, m.z, 1], k * 16);
      res.aIcon.setX(k, atlasIndex(m.hidden ? 'unknown' : m.icon));
      const c = m.hidden ? hidden : res.colors[m.layer];
      res.aColor.setXYZ(k, c.r, c.g, c.b);
      res.aSize.setX(k, sizePx);
      res.aState.setX(k, state);
      placed.push({ ...m, yM, sizePx });
    });
    res.mesh.count = markers.length;
    res.mesh.instanceMatrix.needsUpdate = true;
    for (const a of [res.aIcon, res.aColor, res.aSize, res.aState]) a.needsUpdate = true;
    markerRegistry.markers = placed;
    frameStats.markers = markers.length;
  });

  return <primitive object={res.mesh} />;
}
