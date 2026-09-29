import { expect, test, type Page } from '@playwright/test';
import { setView, type View } from './helpers';

/**
 * Phase 8 visual refinements: the loading screen, the smooth search highlight (its mask
 * comes from the terrain-prep worker) and floating biome labels never overlapping the HUD.
 */

async function openFresh(page: Page, seed: string) {
  await page.goto(`/?seed=${seed}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

/** Visible biome labels that intersect a HUD surface (panels, search, camera buttons). */
function labelsUnderHud(page: Page) {
  return page.evaluate(() => {
    const hud = [...document.querySelectorAll('.hud .hud-panel, .hud .search')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const out: string[] = [];
    let visible = 0;
    let hiddenByHud = 0;
    for (const el of document.querySelectorAll<HTMLElement>('.biome-label')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const off = r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh;
      const hit = hud.some(
        (h) => r.left < h.right && r.right > h.left && r.top < h.bottom && r.bottom > h.top,
      );
      if (getComputedStyle(el).visibility === 'hidden') {
        if (hit && !off) hiddenByHud++;
        continue;
      }
      visible++;
      if (off || hit) out.push(`${el.textContent} @ ${Math.round(r.x)},${Math.round(r.y)}`);
    }
    return { overlapping: out, visible, hiddenByHud };
  });
}

/** Views that sweep the labels across the whole screen, HUD corners included. */
const SWEEP: View[] = [];
for (let k = 0; k < 8; k++) {
  const azimuth = (k / 8) * Math.PI * 2;
  SWEEP.push({ x: 0, z: 0, distanceM: 22000, polar: 0.85, azimuth });
  SWEEP.push({ x: 2500, z: -1500, distanceM: 9000, polar: 1.1, azimuth });
  SWEEP.push({ x: -3000, z: 3000, distanceM: 7000, polar: 0.5, azimuth });
  SWEEP.push({ x: 0, z: 0, distanceM: 22000, polar: 0.6, azimuth });
  SWEEP.push({ x: 0, z: 0, distanceM: 16000, polar: 1.05, azimuth });
}

test.describe('visual refinements', () => {
  test('the loading screen names its steps, then gets out of the way', async ({ page }) => {
    await page.goto('/?seed=E2eLoading');
    const overlay = page.getByTestId('loading-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Building your world');
    await expect(overlay.locator('.loading-steps li')).toHaveCount(4);
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
    // Purely visual: pointer events pass through to the map and HUD.
    expect(await overlay.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    await expect(overlay).toHaveCount(0);
    expect(await page.evaluate(() => window.__atlas?.stats.reveal)).toBe(1);
  });

  test('a biome search draws its smooth highlight mask', async ({ page }) => {
    await openFresh(page, 'HelloWorld');
    expect(await page.evaluate(() => window.__atlas?.stats.highlightOn)).toBe(0);
    await page.keyboard.press('/');
    await page.keyboard.type('meadows');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-panel')).toBeVisible();
    await page.waitForFunction(() => window.__atlas?.stats.highlightOn === 1, null, {
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Close panel' }).click();
    await page.waitForFunction(() => window.__atlas?.stats.highlightOn === 0);
  });

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`biome labels never sit under HUD controls (${viewport.width} × ${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openFresh(page, 'HelloWorld');
      let seen = 0;
      let hidden = 0;
      for (const view of SWEEP) {
        await setView(page, view);
        // Labels re-check the HUD every few frames; give them a moment.
        await page.waitForTimeout(400);
        const r = await labelsUnderHud(page);
        seen += r.visible;
        hidden += r.hiddenByHud;
        expect(r.overlapping, `view ${JSON.stringify(view)}`).toEqual([]);
      }
      expect(seen, 'some labels were shown').toBeGreaterThan(0);
      // The sweep really did push labels under the HUD, and they were hidden there.
      expect(hidden, 'some labels were hidden behind the HUD').toBeGreaterThan(0);
    });
  }
});
