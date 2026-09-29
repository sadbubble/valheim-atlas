import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { loadSources } from '../data/load';
import type { SourceRef } from '../data/schema';
import { useMeta } from '../data/use-meta';
import { useContentStore } from '../state/content-store';
import { useWorldStore } from '../state/world-store';
import { GENERATOR_ID, GENERATOR_REVISION, IS_APPROXIMATION } from '../world/generator-info';
import { citationSummary, unverifiedSummary } from './about-model';
import { ABOUT_BUTTON_ID, DISCLAIMER } from './about-shared';
import { trapTabKey, useModalFocus } from './focus-trap';
import { Icon } from './Icon';
import { Unverified } from './Unverified';

type SourcesState =
  | { status: 'loading' }
  | { status: 'ready'; sources: SourceRef[] }
  | {
      status: 'error';
    };

const KIND_LABELS: Record<SourceRef['kind'], string> = {
  official: 'official',
  wiki: 'community wiki',
  'community-data': 'community data',
  'decompile-derived': 'derived from game code',
  press: 'guide / press',
};

const CONFIDENCE_LABELS: Record<SourceRef['confidence'], string> = {
  read: 'read in full',
  snippet: 'summary only',
  conflict: 'sources disagree',
};

function useSources(): SourcesState {
  const [state, setState] = useState<SourcesState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadSources().then(
      (sources) => {
        if (!cancelled) setState({ status: 'ready', sources });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/**
 * About / data view (SPEC F12, V7): target game version and data date from meta.json, how the
 * world is generated, the source list, how many values are still unverified, and the
 * fan-made disclaimer. A modal dialog: Esc closes it, focus stays inside and returns to
 * whatever opened it. Linkable as `?about=1`.
 */
export function AboutDialog({ onClose }: { onClose: () => void }) {
  const meta = useMeta();
  const sources = useSources();
  const index = useContentStore((s) => s.index);
  // CLAUDE.md rule 4: the world on screen decides; before one exists, the generator does.
  const approximate = useWorldStore((s) =>
    s.status.kind === 'ready' ? s.status.world.isApproximation : IS_APPROXIMATION,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Remember the opener; hand focus back to it (or the About button) when closing.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const target =
        opener && opener !== document.body && opener.isConnected
          ? opener
          : document.getElementById(ABOUT_BUTTON_ID);
      requestAnimationFrame(() => target?.focus());
    };
  }, []);
  useModalFocus(true, dialogRef, titleRef);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The dialog owns the keyboard: global shortcuts must not fire behind it.
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    trapTabKey(e, dialogRef.current);
  };

  const unverified = index ? unverifiedSummary(index.data) : null;
  const cited = index ? citationSummary(index.data) : null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="hud-panel about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        data-testid="about-dialog"
        onKeyDown={onKeyDown}
      >
        <div className="info-head">
          <h2 id="about-title" ref={titleRef} tabIndex={-1}>
            About Valheim Atlas
          </h2>
          <button type="button" className="icon-button" aria-label="Close About" onClick={onClose}>
            <Icon id="close" />
          </button>
        </div>

        <div className="about-body">
          <p className="about-disclaimer">
            <strong>{DISCLAIMER}</strong> This map uses no game art, models, music or code: its
            icons, colours and shaders are our own.
          </p>
          <p>
            An interactive 3D map of a Valheim-style world, for players finding their way and for
            veterans planning a run. Every fact on it says where it came from.
          </p>

          <section aria-labelledby="about-version">
            <h3 id="about-version">Game version</h3>
            {meta.status === 'ready' ? (
              <dl className="facts">
                <div className="fact">
                  <dt>Target game version</dt>
                  <dd data-testid="about-game-version">{meta.meta.targetGameVersion}</dd>
                </div>
                <div className="fact">
                  <dt>Data last updated</dt>
                  <dd>{meta.meta.dataUpdated}</dd>
                </div>
                <div className="fact">
                  <dt>World-generation version</dt>
                  <dd>{meta.meta.worldGenVersion}</dd>
                </div>
                <div className="fact">
                  <dt>Cited from</dt>
                  <dd>{meta.meta.sources.join(', ')}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">
                {meta.status === 'loading' ? 'Loading…' : 'The version data failed to load.'}
              </p>
            )}
          </section>

          <section aria-labelledby="about-generator">
            <h3 id="about-generator">How the world is made</h3>
            <p>
              Generator <code>{GENERATOR_ID}</code>, revision {GENERATOR_REVISION}.
            </p>
            {approximate ? (
              <p>
                <span className="hud-badge">Approximation</span> The world follows Valheim&apos;s
                published layout rules: which biome may appear at what distance from the centre, and
                where bosses, traders and dungeons are allowed. Its terrain comes from our own
                noise, though, so it is <strong>not</strong> the real world for your seed. Matching
                a seed exactly would mean copying the game&apos;s code, which we don&apos;t do. For
                the exact layout of your seed, use the valheim-map.world link in the side panel.
              </p>
            ) : (
              <p>This generator reproduces the game&apos;s world for a seed exactly.</p>
            )}
          </section>

          <section aria-labelledby="about-unverified">
            <h3 id="about-unverified">Unverified values</h3>
            {unverified && cited ? (
              <>
                <p data-testid="about-unverified">
                  {unverified.total} values have no verified source yet
                  {unverified.byFile.length > 0
                    ? ` (${unverified.byFile.map((f) => `${f.count} in ${f.file}`).join(', ')})`
                    : ''}
                  . The map shows them as <Unverified /> instead of guessing a number; the full list
                  is in <code>docs/DATA_TODO.md</code> in the project&apos;s files.
                </p>
                {cited.conflicts > 0 ? (
                  <p>
                    {cited.conflicts} entries are marked &ldquo;sources disagree&rdquo;: their
                    panels explain the difference.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="muted">Loading…</p>
            )}
          </section>

          <section aria-labelledby="about-sources">
            <h3 id="about-sources">Sources</h3>
            <p>
              Each info panel lists the exact pages behind it under &ldquo;Sources&rdquo;
              {cited ? ` (${cited.urls} pages and files on ${cited.sites.join(', ')})` : ''}. These
              are the main references for the world rules and game version:
            </p>
            {sources.status === 'ready' ? (
              <ul className="about-sources" data-testid="about-sources">
                {sources.sources.map((s) => (
                  <li key={s.id}>
                    <span className="about-source-id">{s.id}</span>{' '}
                    {s.url.startsWith('https://') ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                    <span className="muted">
                      {' '}
                      · {KIND_LABELS[s.kind]} · {CONFIDENCE_LABELS[s.confidence]}
                      {s.license ? ` · licence: ${s.license}` : ''} · accessed {s.accessed}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                {sources.status === 'loading' ? 'Loading…' : 'The source list failed to load.'}
              </p>
            )}
          </section>

          <section aria-labelledby="about-privacy">
            <h3 id="about-privacy">Privacy</h3>
            <p>
              No tracking, analytics, cookies or ads, and nothing is loaded from other websites.
              Your settings (mode, spoiler level, guide progress) and generated worlds stay in this
              browser.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
