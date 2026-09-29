import { writeFileSync } from 'node:fs';
import { test } from '@playwright/test';
import { openWorld, setView, type View } from './helpers';

/**
 * Captures docs/screens/*.png at three zoom levels. Tagged @screens so the regular e2e
 * run skips it: `npm run screens`.
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

test('@screens capture three zoom levels', async ({ page }) => {
  test.setTimeout(300_000);
  await openWorld(page);
  // Hide the HUD so the screenshots show the renderer only.
  await page.addStyleTag({ content: '.hud { display: none !important; }' });
  const stats: Record<string, unknown> = {};
  for (const shot of SHOTS) {
    if (shot.view) await setView(page, shot.view);
    // LOD refinement and prop building are spread over frames; let them settle.
    await page.waitForTimeout(shot.settleMs);
    await page.screenshot({ path: `docs/screens/${shot.name}.png` });
    stats[shot.name] = await page.evaluate(() => {
      const s = window.__atlas?.stats;
      return s ? { drawCalls: s.drawCalls, triangles: s.triangles, props: s.propInstances } : null;
    });
  }
  // Workload per view (GPU-independent). fps is not recorded: CI renders in software.
  writeFileSync('docs/screens/stats.json', `${JSON.stringify(stats, null, 2)}\n`);
});
