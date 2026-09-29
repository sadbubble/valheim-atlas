import { useState } from 'react';
import { useAppStore } from '../state/app-store';

/**
 * valheim-map.world (docs/SOURCES.md S-WG-14; docs/DECISION.md: veterans get the exact map
 * via a link, not by reproducing it). Its per-seed URL format is not recorded in our
 * sources, so we link to the home page rather than guess a pattern.
 */
export const EXACT_MAP_URL = 'https://valheim-map.world/';

/** Outbound link to the exact map of a seed (SPEC F9, V8), shown under Path B. */
export function ExactMapLink() {
  const seed = useAppStore((s) => s.seed);
  const [copied, setCopied] = useState('');
  const copySeed = () => {
    if ('clipboard' in navigator && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(seed).then(
        () => {
          setCopied('Seed copied');
        },
        () => {
          setCopied('Copy failed: select the seed box instead');
        },
      );
    } else setCopied('Copy failed: select the seed box instead');
  };
  return (
    <div className="exact-map">
      <a
        href={EXACT_MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="exact-map-link"
        title={`Opens valheim-map.world's home page: its link format for a seed isn't documented in our sources, so enter the seed "${seed}" there yourself.`}
        aria-describedby="exact-map-note"
      >
        View the exact map on valheim-map.world
      </a>
      <p id="exact-map-note" className="hud-hint">
        Opens the site&apos;s home page; enter your seed there.{' '}
        <button type="button" className="link-button" onClick={copySeed}>
          Copy seed
        </button>{' '}
        <span aria-live="polite">{copied}</span>
      </p>
    </div>
  );
}
