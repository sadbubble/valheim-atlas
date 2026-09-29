/**
 * npm run serve:subpath [-- --port 4180 --base /valheim-atlas/ --dir dist]
 *
 * A strict static file server that mimics GitHub Pages for a project site: dist/ is served
 * only under the base path, directories serve their index.html, and anything missing is a
 * plain 404 (no single-page-app fallback that could hide a broken URL). Used by the sub-path
 * e2e smoke test (playwright.config.ts, project "subpath"). Dev tooling only.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const k = args.indexOf(`--${name}`);
  return k >= 0 ? (args[k + 1] ?? fallback) : fallback;
};
const port = Number(opt('port', '4180'));
const base = opt('base', '/valheim-atlas/');
const root = resolve(opt('dir', 'dist'));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const notFound = () => {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  };
  // Like GitHub Pages: /valheim-atlas → /valheim-atlas/.
  if (`${url.pathname}/` === base) {
    res.writeHead(301, { location: base + url.search });
    res.end();
    return;
  }
  if (!url.pathname.startsWith(base)) {
    notFound();
    return;
  }
  let path = normalize(join(root, decodeURIComponent(url.pathname.slice(base.length))));
  if (path !== root && !path.startsWith(root + sep)) {
    notFound();
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path) || !statSync(path).isFile()) {
    notFound();
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(path).pipe(res);
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}${base}`);
});
