import { expect, test, type Locator, type Page } from '@playwright/test';

const WIDTH = 390;
const HEIGHT = 844;

async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

/** Fully on screen and at least 44 × 44 px (WCAG 2.5.5 touch targets). */
async function expectTouchTarget(target: Locator) {
  const box = await target.boundingBox();
  expect(box, 'target is laid out').not.toBeNull();
  if (!box) return;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(WIDTH);
  expect(box.y + box.height).toBeLessThanOrEqual(HEIGHT);
}

/** True when a tap at the centre of `target` would land on it (nothing covers it). */
async function isTappable(target: Locator): Promise<boolean> {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit !== null && (hit === el || el.contains(hit));
  });
}

test.describe('phone-sized touch screen (390 × 844)', () => {
  test.use({
    viewport: { width: WIDTH, height: HEIGHT },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });

  test('HUD fits, drawer folds away, search → panel → close by touch', async ({ page }) => {
    await openApp(page);
    // Nothing sticks out sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      WIDTH,
    );
    // One-finger drags go to the map, not to page scrolling: touch-action on the element the
    // camera controls listen on (it applies to the canvas inside it too).
    expect(
      await page.locator('.world-canvas').evaluate((el) => getComputedStyle(el).touchAction),
    ).toBe('none');

    // The side drawer is folded away until the Menu button opens it.
    const drawer = page.getByRole('complementary', { name: 'Map controls' });
    const menu = page.getByRole('button', { name: 'Menu' });
    await expect(drawer).toBeHidden();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expectTouchTarget(menu);
    await menu.tap();
    await expect(drawer).toBeVisible();
    await expect(drawer).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Hide menu' }).tap();
    await expect(drawer).toBeHidden();

    // Camera buttons and the About button are big enough and not covered.
    const camera = ['Reset view', 'Top-down view', 'Controls help'].map((name) =>
      page.getByRole('button', { name }),
    );
    for (const b of camera) {
      await expectTouchTarget(b);
      expect(await isTappable(b)).toBe(true);
    }
    await expectTouchTarget(page.getByRole('button', { name: 'About & sources' }));
    await expect(page.getByTestId('disclaimer')).toBeInViewport({ ratio: 1 });

    // Search by touch.
    const search = page.locator('#atlas-search');
    await expectTouchTarget(search);
    await search.tap();
    await page.keyboard.type('troll cave');
    const option = page.getByRole('option', { name: /Troll Cave/ });
    await expect(option).toBeInViewport();
    await option.tap();

    // The info panel opens as a sheet that fits on screen and scrolls on its own.
    const panel = page.getByTestId('info-panel');
    await expect(panel.getByRole('heading', { name: 'Troll Cave' })).toBeVisible();
    await expect(panel).toBeInViewport({ ratio: 1 });
    const scroll = await panel.evaluate((el) => {
      const overflowY = getComputedStyle(el).overflowY;
      const scrollable = el.scrollHeight > el.clientHeight;
      el.scrollTop = el.scrollHeight;
      return { overflowY, scrollable, scrolled: el.scrollTop > 0 };
    });
    expect(scroll.overflowY).toBe('auto');
    expect(scroll.scrolled).toBe(scroll.scrollable);
    // The camera buttons stay reachable with the panel open.
    for (const b of camera) expect(await isTappable(b)).toBe(true);

    const close = panel.getByRole('button', { name: 'Close panel' });
    await expectTouchTarget(close);
    await close.tap();
    await expect(panel).toHaveCount(0);

    // The About view opens by tap and fits the screen.
    await page.getByRole('button', { name: 'About & sources' }).tap();
    const about = page.getByRole('dialog', { name: 'About Valheim Atlas' });
    await expect(about).toBeInViewport({ ratio: 1 });
    await expectTouchTarget(about.getByRole('button', { name: 'Close About' }));
    await about.getByRole('button', { name: 'Close About' }).tap();
    await expect(about).toHaveCount(0);
  });
});
