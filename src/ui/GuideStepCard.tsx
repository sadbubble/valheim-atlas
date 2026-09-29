import { useState } from 'react';
import { useContentStore } from '../state/content-store';
import { prefsStore } from '../state/prefs';
import { useUiStore } from '../state/ui-store';
import { EntityLink } from './EntityLink';
import { Icon } from './Icon';
import { IdList } from './IdList';
import { LinkRun } from './LinkRun';
import { flyToHighlight, openEntry } from './navigate';
import { revealIdsFor, type GuideStep } from './progression-model';
import { SourceList } from './SourceList';
import { SpoilerBadge } from './SpoilerBadge';
import { spoilerLabel, useSpoilerHidden } from './use-spoiler';

/**
 * One tier of the progression guide: biome, boss, how to summon it and where, key unlocks,
 * goals, a fly-to action and the step's sources. Spoiler-hidden steps show only their
 * number and tier, never a name.
 */
export function GuideStepCard({
  g,
  hidden,
  done,
  next,
}: {
  g: GuideStep;
  hidden: boolean;
  done: boolean;
  next: boolean;
}) {
  const index = useContentStore((s) => s.index);
  const isHidden = useSpoilerHidden();
  const [flyStatus, setFlyStatus] = useState('');
  const { step, boss, altar } = g;
  // Plain-text biome names are gated like links: a hidden biome is never named.
  const biomeName = (id: string) => {
    const b = index?.byId.get(id);
    if (b?.kind !== 'biome') return id;
    return isHidden(b.entry.spoilerLevel, id) ? 'a hidden biome' : b.entry.name;
  };
  const tierLabel = `Tier ${step.tier}`;

  if (hidden) {
    return (
      <li className="guide-step is-hidden" data-testid={`guide-step-${step.order}`}>
        <span className="guide-tier" aria-hidden="true">
          {step.tier}
        </span>
        <span className="sr-only">{tierLabel}</span>
        <div className="guide-body">
          <p className="entity-hidden">
            Step {step.order} is hidden by your spoiler setting (
            {spoilerLabel(step.spoilerLevel).toLowerCase()}).
          </p>
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().reveal(...revealIdsFor(g));
            }}
          >
            Show step {step.order} anyway
          </button>
        </div>
      </li>
    );
  }

  const regionName = step.biomeIds.map(biomeName).join(' / ');
  const fly = () => {
    const ok = flyToHighlight({ biomes: [...step.biomeIds], locationTypes: [] });
    setFlyStatus(ok ? '' : 'This region is not on the current map.');
  };

  return (
    <li
      className={`guide-step${next ? ' is-next' : ''}${done ? ' is-done' : ''}`}
      data-testid={`guide-step-${step.order}`}
      aria-current={next ? 'step' : undefined}
    >
      <span className="guide-tier" aria-hidden="true" title={tierLabel}>
        {step.tier}
      </span>
      <span className="sr-only">{tierLabel}</span>
      <div className="guide-body">
        <div className="guide-head">
          <h3>
            <button
              type="button"
              className="entity-link"
              onClick={() => {
                openEntry(step.id);
              }}
            >
              {step.name}
            </button>
          </h3>
          {next ? <span className="guide-next">Next</span> : null}
          <SpoilerBadge level={step.spoilerLevel} />
        </div>
        <dl className="facts guide-facts">
          <div className="fact">
            <dt>Biome</dt>
            <dd>
              <LinkRun ids={step.biomeIds} />
            </dd>
          </div>
          {boss ? (
            <>
              <div className="fact">
                <dt>Boss</dt>
                <dd>
                  <EntityLink id={boss.id} />
                  {boss.confidence === 'conflict' ? (
                    <span className="muted"> (sources disagree; see its panel)</span>
                  ) : null}
                </dd>
              </div>
              <div className="fact">
                <dt>Summon with</dt>
                <dd>
                  <IdList items={g.summonItems.map((s) => ({ id: s.itemId, count: s.count }))} />
                </dd>
              </div>
              <div className="fact">
                <dt>Altar</dt>
                <dd>
                  {altar ? <EntityLink id={altar.id} /> : <span className="muted">not listed</span>}
                  {g.altarBiomeIds.length > 0 ? (
                    <span className="muted"> in {g.altarBiomeIds.map(biomeName).join(', ')}</span>
                  ) : null}
                </dd>
              </div>
            </>
          ) : null}
          <div className="fact">
            <dt>Key unlocks</dt>
            <dd>
              <LinkRun ids={step.keyItemIds} />
            </dd>
          </div>
        </dl>
        <details className="guide-goals">
          <summary>Goals ({step.goals.length})</summary>
          <ul className="id-list">
            {step.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </details>
        <div className="row">
          <button type="button" onClick={fly} aria-label={`Fly to the ${regionName} region`}>
            <Icon id="fly" /> Fly to region
          </button>
          <label className="hud-check">
            <input
              type="checkbox"
              checked={done}
              aria-label={`Step ${step.order} done`}
              onChange={() => {
                prefsStore.getState().toggleStepDone(step.id);
              }}
            />
            Done
          </label>
        </div>
        {flyStatus ? (
          <p className="hud-hint" role="status">
            {flyStatus}
          </p>
        ) : null}
        <SourceList
          sources={step.sources}
          gameVersion={step.gameVersion}
          confidence={step.confidence}
          notes={step.notes}
        />
      </div>
    </li>
  );
}
