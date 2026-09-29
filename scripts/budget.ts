/**
 * npm run budget [-- --build]
 *
 * SPEC §8 performance budget: the initial JavaScript of the app (the index.html entry chunk
 * plus everything it imports statically) must stay under 1.5 MB gzipped. Lazy chunks, the
 * world worker, the debug page and public/data are not counted. Reads the Vite manifest in
 * dist/ (building first if there is none, or always with --build), prints a table and exits
 * 1 when over budget.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';

/** SPEC §8: "The initial JS bundle is < 1.5 MB gzipped, excluding data." (1 MB = 10^6 B.) */
const INITIAL_JS_BUDGET_BYTES = 1_500_000;

const DIST = 'dist';
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const APP_ENTRY = 'index.html';

const ManifestSchema = z.record(
  z.string(),
  z.object({
    file: z.string(),
    isEntry: z.boolean().optional(),
    isDynamicEntry: z.boolean().optional(),
    imports: z.array(z.string()).optional(),
    dynamicImports: z.array(z.string()).optional(),
    css: z.array(z.string()).optional(),
    assets: z.array(z.string()).optional(),
  }),
);
type Manifest = z.infer<typeof ManifestSchema>;

if (process.argv.includes('--build') || !existsSync(MANIFEST)) {
  console.log('Building (npm run build)…');
  const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const manifest: Manifest = ManifestSchema.parse(JSON.parse(readFileSync(MANIFEST, 'utf8')));
const entry = manifest[APP_ENTRY];
if (!entry) {
  console.error(`✗ ${MANIFEST} has no "${APP_ENTRY}" entry`);
  process.exit(1);
}

/** Every chunk loaded before the app can start: the entry and its static imports. */
function staticClosure(m: Manifest, key: string, seen = new Set<string>()): Set<string> {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const k of m[key]?.imports ?? []) staticClosure(m, k, seen);
  return seen;
}

const initialKeys = staticClosure(manifest, APP_ENTRY);
const initialJs = new Set([...initialKeys].map((k) => manifest[k]?.file ?? ''));
const initialCss = new Set([...initialKeys].flatMap((k) => manifest[k]?.css ?? []));

const sizes = (file: string) => {
  const buf = readFileSync(join(DIST, file));
  return { raw: buf.length, gzip: gzipSync(buf).length };
};

interface Row {
  file: string;
  kind: string;
  counted: boolean;
  raw: number;
  gzip: number;
}
const rows: Row[] = [];
const labelFor = (file: string): string => {
  const key = Object.keys(manifest).find((k) => manifest[k]?.file === file);
  const chunk = key ? manifest[key] : undefined;
  if (chunk?.isDynamicEntry) return 'lazy (loaded on demand)';
  if (chunk?.isEntry) return 'other page (debug.html)';
  if (Object.values(manifest).some((c) => c.isEntry && c.css?.includes(file)))
    return 'other page (debug.html)';
  if (Object.values(manifest).some((c) => c.assets?.includes(file))) return 'worker';
  return 'not initial';
};
for (const file of readdirSync(join(DIST, 'assets')).map((f) => `assets/${f}`)) {
  const isJs = file.endsWith('.js');
  const isCss = file.endsWith('.css');
  if (!isJs && !isCss) continue;
  const counted = initialJs.has(file);
  const kind = counted
    ? 'initial JS'
    : initialCss.has(file)
      ? 'initial CSS (not in JS budget)'
      : labelFor(file);
  rows.push({ file, kind, counted, ...sizes(file) });
}
rows.sort((a, b) => Number(b.counted) - Number(a.counted) || b.gzip - a.gzip);

const kb = (n: number) => `${(n / 1000).toFixed(1)} kB`;
const pad = (s: string, n: number) => s.padEnd(n);
const lpad = (s: string, n: number) => s.padStart(n);
const w = Math.max(...rows.map((r) => r.file.length), 4);
console.log(`\n${pad('File', w)}  ${pad('Kind', 30)}  ${lpad('Raw', 10)}  ${lpad('Gzip', 10)}`);
console.log(`${'-'.repeat(w)}  ${'-'.repeat(30)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}`);
for (const r of rows) {
  console.log(
    `${pad(r.file, w)}  ${pad(r.kind, 30)}  ${lpad(kb(r.raw), 10)}  ${lpad(kb(r.gzip), 10)}`,
  );
}

const total = rows.filter((r) => r.counted).reduce((n, r) => n + r.gzip, 0);
const ok = total <= INITIAL_JS_BUDGET_BYTES;
console.log(
  `\nInitial JS: ${kb(total)} gzipped of ${kb(INITIAL_JS_BUDGET_BYTES)} budget (SPEC §8, ${(
    (total / INITIAL_JS_BUDGET_BYTES) *
    100
  ).toFixed(0)}%) ${ok ? '✓' : '✗ OVER BUDGET'}`,
);
process.exit(ok ? 0 : 1);
