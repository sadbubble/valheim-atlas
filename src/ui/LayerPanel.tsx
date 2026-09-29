import type { IconId } from '../render/icons';
import { LAYER_COLORS } from '../render/palette';
import { useAppStore } from '../state/app-store';
import { effectiveSpoiler, type Layer, type SpoilerLevel } from '../state/url-state';
import { Icon } from './Icon';
import { SPOILER_LABELS } from './use-spoiler';

const LAYER_INFO: { id: Layer; label: string; icon: IconId }[] = [
  { id: 'biomes', label: 'Biome names', icon: 'layers' },
  { id: 'bosses', label: 'Bosses & altars', icon: 'boss' },
  { id: 'dungeons', label: 'Dungeons', icon: 'dungeon' },
  { id: 'npcs', label: 'Traders (NPCs)', icon: 'trader' },
  { id: 'vegvisirs', label: 'Vegvisirs', icon: 'vegvisir' },
  { id: 'villages', label: 'Villages', icon: 'village' },
  { id: 'landmarks', label: 'Runestones & landmarks', icon: 'runestone' },
  { id: 'creatures', label: 'Creatures (per biome)', icon: 'creature' },
  { id: 'resources', label: 'Resources (per biome)', icon: 'resource' },
  { id: 'grid', label: 'Grid & coordinates', icon: 'ruler' },
  { id: 'pins', label: 'My pins', icon: 'pin' },
];

export function LayerPanel() {
  const layers = useAppStore((s) => s.layers);
  const spoiler = useAppStore(effectiveSpoiler);
  const { toggleLayer, setSpoiler } = useAppStore((s) => s);
  return (
    <div className="layer-panel">
      <fieldset>
        <legend>Layers</legend>
        {LAYER_INFO.map((l) => (
          <label key={l.id} className="layer-toggle">
            <input
              type="checkbox"
              checked={layers.includes(l.id)}
              onChange={(e) => {
                toggleLayer(l.id, e.target.checked);
              }}
            />
            <span className="layer-swatch" style={{ background: LAYER_COLORS[l.id] }}>
              <Icon id={l.icon} size={14} />
            </span>
            {l.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Spoilers shown</legend>
        {([0, 1, 2] as SpoilerLevel[]).map((lvl) => (
          <label key={lvl} className="layer-toggle">
            <input
              type="radio"
              name="spoiler"
              checked={spoiler === lvl}
              onChange={() => {
                setSpoiler(lvl);
              }}
            />
            {lvl === 0
              ? 'None (spoiler-free)'
              : lvl === 1
                ? `Up to ${SPOILER_LABELS[1].toLowerCase()}s`
                : 'Everything'}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
