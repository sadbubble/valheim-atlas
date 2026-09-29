import { expect, test, type Page } from '@playwright/test';
import { getView } from './helpers';

/** Collects console errors and page errors for the "no console errors" check. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function openApp(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

test.describe('interactivity', () => {
  test('smoke: search → fly → open panel, without console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await openApp(page);
    const before = await getView(page);

    await page.keyboard.press('/');
    await expect(page.locator('#atlas-search')).toBeFocused();
    await page.keyboard.type('troll cave');
    const option = page.getByRole('option', { name: /Troll Cave/ });
    await expect(option).toBeVisible();
    await page.keyboard.press('Enter');

    const panel = page.getByTestId('info-panel');
    await expect(panel.getByRole('heading', { name: 'Troll Cave' })).toBeVisible();
    // The camera flies to the nearest troll cave and zooms in.
    await expect
      .poll(async () => (await getView(page))?.distanceM ?? Infinity, { timeout: 20_000 })
      .toBeLessThan((before?.distanceM ?? 0) / 2);
    const after = await getView(page);
    expect(
      Math.hypot((after?.x ?? 0) - (before?.x ?? 0), (after?.z ?? 0) - (before?.z ?? 0)),
    ).toBeGreaterThan(50);

    await panel.getByRole('tab', { name: 'Threats' }).click();
    await expect(panel.getByRole('tabpanel')).toContainText('Weak to');
    expect(errors).toEqual([]);
  });

  test('keyboard only: search results, tabs and closing', async ({ page }) => {
    await openApp(page, '?mode=veteran');
    await page.keyboard.press('/');
    await page.keyboard.type('black forest');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    const panel = page.getByTestId('info-panel');
    await expect(panel.getByRole('heading', { name: 'Black Forest' })).toBeVisible();

    await panel.getByRole('tab', { name: 'Overview' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel.getByRole('tab', { name: 'Threats' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(panel.getByRole('tab', { name: 'Threats' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(panel.getByRole('tab', { name: 'Tips' })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('null data is shown as "unverified", not dropped', async ({ page }) => {
    await openApp(page, '?mode=veteran');
    await page.keyboard.press('/');
    await page.keyboard.type('perch');
    await page.getByRole('option', { name: /Perch/ }).first().click();
    const panel = page.getByTestId('info-panel');
    const weight = panel.locator('.fact', { hasText: 'Weight' });
    await expect(weight).toContainText('unverified');
  });

  test('spoiler setting hides late-game detail until revealed', async ({ page }) => {
    await openApp(page); // newcomer → spoiler-free by default
    await page.keyboard.press('/');
    await page.keyboard.type('fader');
    await page.getByRole('option', { name: /^Fader\b.*Boss/ }).click();
    const panel = page.getByTestId('info-panel');
    await expect(panel).toContainText('Details are hidden');
    await expect(panel.getByRole('tablist')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Show anyway' }).click();
    await expect(panel.getByRole('tablist')).toBeVisible();
  });

  test('pins, measuring and a shareable link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page, '?mode=veteran');
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not visible');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Coordinates readout under the cursor.
    await page.mouse.move(cx, cy);
    await expect(page.getByTestId('coords')).toContainText(/X -?\d+ · Z -?\d+/);

    // Place a pin by clicking the map.
    await page.getByRole('button', { name: 'Place pin' }).click();
    await page.mouse.click(cx, cy);
    await expect(page.getByTestId('info-panel')).toContainText('Your pin');
    expect(new URL(page.url()).searchParams.get('pins')).toMatch(/^-?\d+,-?\d+,Pin%201$/);

    // Measure between two points.
    await page.getByRole('button', { name: 'Measure' }).click();
    await page.mouse.click(cx - 150, cy);
    await page.mouse.click(cx + 150, cy + 40);
    await expect(page.locator('.hud-hint', { hasText: 'Distance:' })).toContainText(/\d/);

    // Toggle a layer and copy the link: it restores seed, layers, pins and camera.
    await page.getByLabel('Grid & coordinates').check();
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(
      page.locator('.hud-hint', { hasText: /Link copied|Copy this link/ }),
    ).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const params = new URL(link).searchParams;
    expect(params.get('layers')).toContain('grid');
    expect(params.get('pins')).toBeTruthy();
    expect(params.get('cam')?.split(',')).toHaveLength(5);

    const view = await getView(page);
    await page.goto(link);
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    const restored = await getView(page);
    expect(Math.abs((restored?.x ?? 0) - (view?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((restored?.distanceM ?? 0) - (view?.distanceM ?? 0))).toBeLessThan(2);
    await expect(page.getByLabel('Grid & coordinates')).toBeChecked();
    await expect(page.locator('.pins summary')).toContainText('My pins (1)');
  });
});
