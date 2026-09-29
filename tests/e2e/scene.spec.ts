import { expect, test } from '@playwright/test';
import { getView, openWorld } from './helpers';

test.describe('3D world view', () => {
  test('renders the world and labels it as an approximation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openWorld(page);

    await expect(page.locator('.hud-badge')).toHaveText('Approximation');
    const stats = await page.evaluate(() => window.__atlas?.stats);
    expect(stats?.drawCalls).toBeGreaterThan(10);
    expect(stats?.triangles).toBeGreaterThan(1000);

    // A rendered world compresses much worse than a blank canvas.
    const shot = await page.locator('canvas').screenshot();
    expect(shot.byteLength).toBeGreaterThan(100_000);
    expect(errors).toEqual([]);
  });

  test('camera controls respond: drag orbits, wheel zooms, reset returns', async ({ page }) => {
    await openWorld(page);
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const start = await getView(page);
    if (!start) throw new Error('no view');

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 220, cy, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => (await getView(page))?.azimuth).not.toBeCloseTo(start.azimuth, 2);

    const beforeZoom = (await getView(page))?.distanceM ?? 0;
    await page.mouse.move(cx, cy);
    for (let k = 0; k < 6; k++) await page.mouse.wheel(0, -400);
    await expect
      .poll(async () => (await getView(page))?.distanceM ?? 0)
      .toBeLessThan(beforeZoom * 0.9);

    await page.getByRole('button', { name: 'Reset view' }).click();
    await expect
      .poll(async () => (await getView(page))?.distanceM ?? 0, { timeout: 20_000 })
      .toBeCloseTo(start.distanceM, -1);
  });

  test('double-click focuses the camera on that point', async ({ page }) => {
    await openWorld(page);
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not visible');
    const before = await getView(page);
    await page.mouse.dblclick(box.x + box.width * 0.62, box.y + box.height * 0.55);
    await expect
      .poll(
        async () => {
          const v = await getView(page);
          return v && before ? Math.hypot(v.x - before.x, v.z - before.z) : 0;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(500);
  });

  test('vertical exaggeration slider updates', async ({ page }) => {
    await openWorld(page);
    const slider = page.locator('#exag-input');
    await slider.fill('2.5');
    await expect(page.locator('.hud-value')).toHaveText('2.5×');
  });
});
