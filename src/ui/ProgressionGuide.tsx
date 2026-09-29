import { useMemo } from 'react';
import { useContentStore } from '../state/content-store';
import { usePrefsStore } from '../state/prefs';
import { GuideStepCard } from './GuideStepCard';
import { buildGuide, nextGuideStep } from './progression-model';
import { useSpoilerHidden } from './use-spoiler';

const EMPTY: readonly string[] = [];

/**
 * The progression guide (SPEC F6, N2): one row per tier, from the first biome to the last,
 * with the boss, how to summon it and where, and key unlocks. A tier strip on top makes the
 * order obvious at a glance and jumps to a step.
 */
export function ProgressionGuide() {
  const index = useContentStore((s) => s.index);
  const doneIds = usePrefsStore((s) => s.prefs.doneSteps ?? EMPTY);
  const hidden = useSpoilerHidden();
  const guide = useMemo(() => (index ? buildGuide(index) : []), [index]);
  if (!index) return <p className="hud-hint">Loading the guide…</p>;
  const next = nextGuideStep(guide, doneIds);
  const biomeName = (id: string | undefined) => {
    const b = id ? index.byId.get(id) : undefined;
    if (b?.kind !== 'biome') return '';
    return hidden(b.entry.spoilerLevel, b.entry.id) ? 'Hidden' : b.entry.name;
  };

  return (
    <section className="guide" aria-labelledby="guide-title" data-testid="progression-guide">
      <h2 id="guide-title" className="guide-title" tabIndex={-1}>
        Progression guide
      </h2>
      <p className="hud-hint">
        Each biome is a tier; beat its boss to unlock the next. Tick steps off as you go.
      </p>
      <ol className="guide-strip" aria-label="Tiers at a glance">
        {guide.map((g) => {
          const isHidden = hidden(g.step.spoilerLevel, g.step.id);
          const label = isHidden ? 'Hidden' : biomeName(g.step.biomeIds[0]);
          return (
            <li key={g.step.id}>
              <button
                type="button"
                className={`guide-chip${isHidden ? ' is-hidden' : ''}${
                  g === next ? ' is-next' : ''
                }${doneIds.includes(g.step.id) ? ' is-done' : ''}`}
                aria-label={`Step ${g.step.order}, tier ${g.step.tier}: ${label}`}
                onClick={() => {
                  document
                    .querySelector(`[data-testid="guide-step-${g.step.order}"]`)
                    ?.scrollIntoView({ block: 'start' });
                }}
              >
                <span className="guide-chip-tier">{g.step.tier}</span> {label}
              </button>
            </li>
          );
        })}
      </ol>
      <ol className="guide-steps">
        {guide.map((g) => (
          <GuideStepCard
            key={g.step.id}
            g={g}
            hidden={hidden(g.step.spoilerLevel, g.step.id)}
            done={doneIds.includes(g.step.id)}
            next={g === next}
          />
        ))}
      </ol>
    </section>
  );
}
