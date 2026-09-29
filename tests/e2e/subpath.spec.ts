import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/**
 * Smoke test of the production build as deployed: served as static files under a
 * GitHub-Pages-style sub-path (project "subpath" in playwright.config.ts). Checks that data,
 * the worker, the lazy About chunk, the favicon and the debug page all resolve under it,
 * that the Content-Security-Policy doesn't break anything, and that nothing is requested
 * from any other origin (no CDNs, fonts, analytics).
 */
const SUBPATH = '/valheim-atlas/';
const meta = JSON.parse(readFileSync('public/data/meta.json', 'utf8')) as {
  targetGameVersion: string;
};

interface NetworkLog {
  external: string[];
  outsideBase: string[];
  failed: string[];
  urls: string[];
}

function watchNetwork(context: BrowserContext): NetworkLog {
  const log: NetworkLog = { external: [], outsideBase: [], failed: [], urls: [] };
  context.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:') return;
    log.urls.push(r.url());
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') log.external.push(r.url());
    else if (!u.pathname.startsWith(SUBPATH)) log.outsideBase.push(r.url());
  });
  context.on('requestfailed', (r) => log.failed.push(`${r.url()} (${r.failure()?.errorText})`));
  context.on('response', (r) => {
    if (r.status() >= 400) log.failed.push(`${r.url()} (HTTP ${r.status()})`);
  });
  return log;
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test.describe('production build under a sub-path', () => {
  test('loads a world and its data; no external or out-of-base requests; CSP holds', async ({
    page,
    context,
  }) => {
    const net = watchNetwork(context);
    const errors = trackErrors(page);
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(new URL(w.url()).pathname));
    await page.goto('./?seed=HelloWorld');
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByText('Approximation', { exact: true })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText(
      `Target game version ${meta.targetGameVersion}`,
    );
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);

    // Content data works end to end: search → panel.
    await page.keyboard.press('/');
    await page.keyboard.type('troll cave');
    await page.keyboard.press('Enter');
    await expect(
      page.getByTestId('info-panel').getByRole('heading', { name: 'Troll Cave' }),
    ).toBeVisible();

    // The lazily loaded About chunk and sources.json resolve too.
    await page.getByRole('button', { name: 'About & sources' }).click();
    await expect(page.getByTestId('about-sources').getByRole('listitem').first()).toBeVisible();

    const paths = net.urls.map((u) => new URL(u).pathname);
    expect(paths).toContain(`${SUBPATH}data/meta.json`);
    expect(paths).toContain(`${SUBPATH}data/sources.json`);
    // Headless Chromium doesn't fetch favicons; check the link resolves under the sub-path.
    const icon = await page
      .locator('link[rel="icon"]')
      .evaluate((l) => (l as HTMLLinkElement).href);
    expect(new URL(icon).pathname).toBe(`${SUBPATH}favicon.svg`);
    expect((await page.request.get(icon)).status()).toBe(200);
    // The world worker is a module script under the sub-path (the world rendered, so it ran).
    expect(workers.some((p) => /^\/valheim-atlas\/assets\/worker-[\w-]+\.js$/.test(p))).toBe(true);
    expect(paths.some((p) => /^\/valheim-atlas\/assets\/AboutDialog-[\w-]+\.js$/.test(p))).toBe(
      true,
    );

    expect(net.external, 'requests to other origins').toEqual([]);
    expect(net.outsideBase, 'requests outside the sub-path').toEqual([]);
    expect(net.failed, 'failed requests').toEqual([]);
    expect(errors, 'console errors (incl. CSP violations)').toEqual([]);
  });

  test('the bare sub-path redirects, and the debug page works there too', async ({
    page,
    context,
  }) => {
    // Like GitHub Pages, /valheim-atlas redirects to /valheim-atlas/.
    const res = await page.goto(SUBPATH.slice(0, -1).replace(/^\//, '../'));
    expect(new URL(res?.url() ?? '').pathname).toBe(SUBPATH);

    const net = watchNetwork(context);
    const errors = trackErrors(page);

    await page.goto('./debug.html?seed=HelloWorld&res=256');
    await expect(page.getByText(/Generated in \d+ ms|Loaded from cache in \d+ ms/)).toBeVisible({
      timeout: 60_000,
    });
    expect(net.external).toEqual([]);
    expect(net.outsideBase).toEqual([]);
    expect(net.failed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the main thread stays responsive while the world generates (SPEC §8)', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __longTasks: { start: number; ms: number }[] };
      w.__longTasks = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          w.__longTasks.push({ start: e.startTime, ms: e.duration });
      }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto('./?seed=LongTaskCheck');
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    const r = await page.evaluate(() => {
      const mark = (name: string) => performance.getEntriesByName(name)[0]?.startTime ?? NaN;
      const start = mark('atlas:generate:start');
      const end = mark('atlas:generate:end');
      const renderer = mark('atlas:renderer-ready');
      const tasks = (window as unknown as { __longTasks: { start: number; ms: number }[] })
        .__longTasks;
      const round = (t: { start: number; ms: number }) => Math.round(t.ms);
      return {
        generationMs: end - start,
        // One-off WebGL context creation when the page opens; it only overlaps generation
        // because both start at load. Reported, not generation work.
        startup: tasks.filter((t) => t.start < renderer).map(round),
        during: tasks.filter((t) => t.start >= renderer && t.start + t.ms > start && t.start < end),
        // Building the terrain from the finished world (textures, meshes, shader compile).
        after: tasks.filter((t) => t.start >= end).map(round),
      };
    });
    console.log(
      `generation ${r.generationMs.toFixed(0)} ms; long tasks (ms): start-up ${JSON.stringify(
        r.startup,
      )}, during generation ${JSON.stringify(r.during.map((t) => Math.round(t.ms)))}, after ${JSON.stringify(r.after)}`,
    );
    expect(r.generationMs).toBeGreaterThan(0);
    expect(r.during.filter((t) => t.ms > 50)).toEqual([]);
  });
});
