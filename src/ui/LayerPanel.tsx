import { useMemo } from 'react';
import { LOCATION_CATEGORIES } from '../data/schema';
import type { IconId } from '../render/icons';
import { CATEGORY_ICON, CATEGORY_LAYER, countLocations } from '../render/markers-model';
import { LAYER_COLORS } from '../render/palette';
import { useAppStore } from '../state/app-store';
import { useContentStore } from '../state/content-store';
import { effectiveSpoiler, type Layer, type SpoilerLevel } from '../state/url-state';
import { useWorldStore } from '../state/world-store';
import { Icon } from './Icon';
import { SpoilerBadge } from './SpoilerBadge';
import { SPOILER_LABELS, useSpoilerHidden } from './use-spoiler';

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
  { id: 'grid', label: 'Grid & coordinates, distance rings', icon: 'ruler' },
  { id: 'pins', label: 'My pins', icon: 'pin' },
];

const LOCATION_LAYERS = new Set<Layer>(Object.values(CATEGORY_LAYER));

export function LayerPanel() {
  const layers = useAppStore((s) => s.layers);
  const hide = useAppStore((s) => s.hide);
  const spoiler = useAppStore(effectiveSpoiler);
  const { toggleLayer, toggleType, setSpoiler } = useAppStore((s) => s);
  const index = useContentStore((s) => s.index);
  const status = useWorldStore((s) => s.status);
  const hidden = useSpoilerHidden();

  const types = useMemo(() => index?.data.locations ?? [], [index]);
  const counts = useMemo(
    () =>
      countLocations(
        status.kind === 'ready' ? status.world.locations : [],
        new Map(types.map((t) => [t.id, t])),
      ),
    [status, types],
  );
  const ready = status.kind === 'ready';
  // Label: the layer name plus how many places this world has (SPEC V2).
  const countText = (n: number | undefined) => (ready ? ` (${n ?? 0})` : '');

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
            {LOCATION_LAYERS.has(l.id) ? (
              <span className="muted">{countText(counts.byLayer.get(l.id))}</span>
            ) : null}
          </label>
        ))}
      </fieldset>

      <details className="type-filters">
        <summary>Filter by place type</summary>
        {LAYER_INFO.filter((l) => LOCATION_LAYERS.has(l.id)).map((l) => (
          <fieldset key={l.id} disabled={!layers.includes(l.id)}>
            <legend>{l.label}</legend>
            {types
              .filter((t) => CATEGORY_LAYER[t.category] === l.id)
              .map((t) => {
                const isHidden = hidden(t.spoilerLevel, t.id);
                return (
                  <label key={t.id} className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={!hide.includes(t.id)}
                      onChange={(e) => {
                        toggleType(t.id, e.target.checked);
                      }}
                    />
                    {isHidden ? (
                      <>
                        <span className="entity-hidden">Hidden place type</span>
                        <SpoilerBadge level={t.spoilerLevel} />
                      </>
                    ) : (
                      t.name
                    )}
                    <span className="muted">{countText(counts.byType.get(t.id))}</span>
                  </label>
                );
              })}
          </fieldset>
        ))}
      </details>

      <details className="legend">
        <summary>What the map symbols mean</summary>
        <dl>
          {LOCATION_CATEGORIES.map((cat) => {
            const info = index?.categoryInfo(cat);
            if (!info) return null;
            const isHidden = hidden(info.spoilerLevel, `category:${cat}`);
            return (
              <div key={cat} className="legend-row">
                <dt>
                  <span
                    className="layer-swatch"
                    style={{ background: LAYER_COLORS[CATEGORY_LAYER[cat]] }}
                  >
                    <Icon id={CATEGORY_ICON[cat]} size={14} />
                  </span>
                  {info.name}
                </dt>
                <dd className={isHidden ? 'entity-hidden' : undefined}>
                  {isHidden ? 'Hidden by your spoiler setting' : info.description}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>

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
