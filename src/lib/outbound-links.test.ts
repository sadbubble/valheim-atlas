import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md rule 6: outbound links go only to sources listed in docs/SOURCES.md or to
 * valheim-map.world, never to a source flagged suspicious (e.g. S-WG-22), and only over https.
 * Scans every URL literal in the app source, the HTML entry pages and public/data.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** XML namespaces are identifiers, not links. */
const NOT_LINKS = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink']);
const EXTRA_ALLOWED_SITES = ['valheim-map.world'];
const URL_RE = /https?:\/\/[^\s"'`)<>\]|]+/g;

/** A "site" is a host, or host/owner/repo on code hosts where one host holds many projects. */
function siteOf(raw: string): string {
  const u = new URL(raw);
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  if (host === 'github.com' || host === 'raw.githubusercontent.com')
    return `github/${(parts[0] ?? '').toLowerCase()}/${(parts[1] ?? '').toLowerCase()}`;
  if (host === 'gist.github.com') return `gist/${(parts[0] ?? '').toLowerCase()}`;
  return host;
}

function walk(dir: string, keep: (f: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return walk(path, keep);
    return keep(path) ? [path] : [];
  });
}

const sourcesMd = read('docs/SOURCES.md');
const listed = new Set([...sourcesMd.matchAll(URL_RE)].map((m) => siteOf(m[0])));
for (const s of EXTRA_ALLOWED_SITES) listed.add(s);
/** Rows whose kind is **suspicious** must never be linked, even though they are listed. */
const denied = new Set(
  sourcesMd
    .split('\n')
    .filter((line) => line.startsWith('|') && /\*\*suspicious\*\*/i.test(line))
    .flatMap((line) => [...line.matchAll(URL_RE)].map((m) => siteOf(m[0]))),
);

const scanned = [
  ...walk('src', (f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f)),
  ...walk('public', (f) => /\.(json|svg|html)$/.test(f)),
  'index.html',
  'debug.html',
];
const found = scanned.flatMap((file) =>
  [...read(file).matchAll(URL_RE)]
    .map((m) => m[0].replace(/[.,;]+$/, ''))
    .filter((url) => !NOT_LINKS.has(url))
    .map((url) => ({ file: relative(ROOT, join(ROOT, file)), url })),
);

describe('outbound links (CLAUDE.md rule 6)', () => {
  it('finds the links it should check', () => {
    expect(found.length).toBeGreaterThan(100);
    expect(denied.size).toBeGreaterThan(0);
  });

  it('uses https only', () => {
    expect(found.filter((f) => !f.url.startsWith('https://'))).toEqual([]);
  });

  it('links only to sites listed in docs/SOURCES.md or valheim-map.world', () => {
    expect(found.filter((f) => !listed.has(siteOf(f.url)))).toEqual([]);
  });

  it('never links to a source flagged suspicious', () => {
    expect(found.filter((f) => denied.has(siteOf(f.url)))).toEqual([]);
  });
});
