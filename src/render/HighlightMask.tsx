import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { RedFormat, UnsignedByteType, type Texture } from 'three';
import type { BiomeId } from '../data/schema';
import { useUiStore } from '../state/ui-store';
import { frameStats } from './frame-stats';
import type { SharedUniforms } from './materials';
import { dataTexture, type TerrainModel } from './terrain-model';
import { terrainPrepClient } from './terrain-prep-client';

/**
 * Keeps the terrain's search-highlight mask in step with the highlighted biomes. The soft
 * mask (render/highlight-mask.ts) is built in the terrain-prep worker once per highlight,
 * never per frame, and swapped in when it arrives.
 */
export function HighlightMask({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const biomes = useUiStore((s) => s.highlight.biomes);
  const current = useRef<{ forBiomes: readonly BiomeId[] | null; tex: Texture | null }>({
    forBiomes: null,
    tex: null,
  });

  // The empty 1 × 1 mask the shared uniforms start with (owned by them, never disposed here).
  const [empty] = useState(() => shared.uHighlightMask.value);
  useEffect(
    () => () => {
      shared.uHighlightMask.value = empty;
      current.current.tex?.dispose();
      current.current = { forBiomes: null, tex: null };
    },
    [shared, empty],
  );

  useEffect(() => {
    let cancelled = false;
    const apply = (tex: Texture | null) => {
      const old = current.current.tex;
      current.current = { forBiomes: biomes, tex };
      shared.uHighlightMask.value = tex ?? empty;
      old?.dispose();
    };
    const ids = model.world.biomeIds;
    const indices = biomes.map((b) => ids.indexOf(b)).filter((k) => k >= 0);
    if (indices.length === 0) {
      // Location-only highlights dim every biome: the empty mask says just that.
      apply(null);
    } else {
      terrainPrepClient()
        .highlightMask(model.worldId, indices)
        .then((data) => {
          if (cancelled) return;
          const tex = dataTexture(data, model.world.resolution, RedFormat, UnsignedByteType, false);
          tex.unpackAlignment = 1;
          apply(tex);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [model, shared, empty, biomes]);

  useFrame(() => {
    const hl = useUiStore.getState().highlight;
    const active = hl.biomes.length > 0 || hl.locationTypes.length > 0;
    // Wait for this highlight's mask, so the map doesn't flash dim before it arrives.
    shared.uHighlightOn.value = active && current.current.forBiomes === hl.biomes ? 1 : 0;
    frameStats.highlightOn = shared.uHighlightOn.value;
  });

  return null;
}
