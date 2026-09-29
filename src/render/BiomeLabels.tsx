import { Html } from '@react-three/drei';
import { useAppStore } from '../state/app-store';
import { useContentStore } from '../state/content-store';
import { useMapStore } from '../state/map-store';
import { useRenderStore } from '../state/render-store';
import { useUiStore } from '../state/ui-store';
import { effectiveSpoiler } from '../state/url-state';
import { sampleHeight } from './pick';
import type { TerrainModel } from './terrain-model';

const LABEL_SPACING_M = 1800;

/** Biome name labels (the "biomes" layer); each is a real button, so keyboard reachable. */
export function BiomeLabels({ model }: { model: TerrainModel }) {
  const on = useAppStore((s) => s.layers.includes('biomes'));
  const spoiler = useAppStore(effectiveSpoiler);
  const anchors = useMapStore((s) => s.anchors);
  const index = useContentStore((s) => s.index);
  const exag = useRenderStore((s) => s.exaggeration);
  const revealed = useUiStore((s) => s.revealed);
  if (!on || !index) return null;
  // Spoiler-hidden biomes get no label at all rather than a stack of "Unknown biome" tags.
  const hiddenBiome = (level: number, id: string) => level > spoiler && !revealed.includes(id);
  const visible = anchors.filter((a) => {
    const b = index.byId.get(a.biome);
    return b !== undefined && a.biome !== 'ocean' && !hiddenBiome(b.entry.spoilerLevel, a.biome);
  });
  // Largest regions first; skip labels that would crowd a bigger one.
  const shown: typeof anchors = [];
  for (const a of [...visible].sort((p, q) => q.areaM2 - p.areaM2)) {
    if (shown.every((s) => Math.hypot(s.x - a.x, s.z - a.z) > LABEL_SPACING_M)) shown.push(a);
  }
  return (
    <>
      {shown.map((a, k) => {
        const biome = index.byId.get(a.biome);
        if (biome?.kind !== 'biome' || a.biome === 'ocean') return null;
        const yM = Math.max(0, sampleHeight(model.world, a.x, a.z) - model.seaLevelM) * exag;
        return (
          <Html key={`${a.biome}-${k}`} position={[a.x, yM + 40, a.z]} center zIndexRange={[5, 0]}>
            <button
              type="button"
              className="biome-label"
              onClick={() => {
                useUiStore.getState().select({ id: a.biome });
              }}
            >
              {biome.entry.name}
            </button>
          </Html>
        );
      })}
    </>
  );
}
