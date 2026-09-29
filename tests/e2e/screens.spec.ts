import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { getView, setView, type View } from './helpers';

/**
 * Captures docs/screens/*.png: the loading screen, three zoom levels and a close-up of a
 * search highlight's edge. Tagged @screens so the regular e2e run skips it: `npm run screens`.
 */
const SHOTS: { name: string; view: View | null; settleMs: number }[] = [
  { name: '1-overview', view: null, settleMs: 2500 },
  {
    name: '2-region',
    view: { x: -1500, z: 1200, distanceM: 6000, polar: 0.95, azimuth: 0.4 },
    settleMs: 8000,
  },
  {
    name: '3-close',
    view: { x: -900, z: 700, distanceM: 1100, polar: 1.15, azimuth: 0.9 },
    settleMs: 10000,
  },
];

const readStats = (page: Page) =>
  page.evaluate(() => {
    const s = window.__atlas?.stats;
    return s ? { drawCalls: s.drawCalls, triangles: s.triangles, props: s.propInstances } : null;
  });

/** The nearest point (game metres) from `from` where the biome changes, searching outward. */
async function nearestBiomeEdge(page: Page, from: { x: number; z: number }) {
  return page.evaluate(({ x, z }) => {
    const at = (px: number, pz: number) => window.__atlas?.biomeAt(px, pz) ?? null;
    const home = at(x, z);
    for (let r = 100; r < 6000; r += 50) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        const b = at(px, pz);
        if (b !== null && b !== home) return { x: px, z: pz };
      }
    }
    return null;
  }, from);
}

test('@screens capture the loading screen, three zoom levels and a highlight edge', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const stats: Record<string, unknown> = {};

  // The loading screen, part-way through generation (HUD included: it's the real first view).
  await page.goto('/?seed=HelloWorld');
  await expect(page.locator('.loading-percent')).toHaveText(/^(?:[2-9]\d)%$/, { timeout: 60_000 });
  await page.screenshot({ path: 'docs/screens/0-loading.png' });
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });

  // Hide the HUD so the screenshots show the renderer only.
  const hideHud = await page.addStyleTag({ content: '.hud { display: none !important; }' });
  for (const shot of SHOTS) {
    if (shot.view) await setView(page, shot.view);
    // LOD refinement and prop building are spread over frames; let them settle.
    await page.waitForTimeout(shot.settleMs);
    await page.screenshot({ path: `docs/screens/${shot.name}.png` });
    stats[shot.name] = await readStats(page);
  }

  // Search highlight up close: its edge should be a smooth curve, not 20 m grid steps.
  await hideHud.evaluate((el) => {
    (el as Element).remove();
  });
  await page.keyboard.press('/');
  await page.keyboard.type('black forest');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('info-panel')).toBeVisible();
  await page.waitForTimeout(3000); // fly-to
  const target = await getView(page);
  const edge = await nearestBiomeEdge(page, { x: target?.x ?? 0, z: target?.z ?? 0 });
  expect(edge).not.toBeNull();
  await page.addStyleTag({ content: '.hud { display: none !important; }' });
  await setView(page, {
    x: edge?.x ?? 0,
    z: edge?.z ?? 0,
    distanceM: 900,
    polar: 0.75,
    azimuth: 0.5,
  });
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'docs/screens/4-highlight.png' });
  stats['4-highlight'] = await readStats(page);

  // Workload per view (GPU-independent). fps is not recorded: CI renders in software.
  writeFileSync('docs/screens/stats.json', `${JSON.stringify(stats, null, 2)}\n`);
});
