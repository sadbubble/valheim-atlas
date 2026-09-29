import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility audit (CLAUDE.md phase 7, SPEC §7) with axe-core on the main states of the
 * app. Serious and critical violations fail the test. Moderate and minor ones are allowed
 * only when listed here with a reason (also recorded in docs/RELEASE.md).
 */
const ALLOWED_MINOR_RULES: Record<string, string> = {};

async function audit(page: Page, state: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const describe = (v: (typeof results.violations)[number]) =>
    `${v.impact ?? 'unknown'} ${v.id}: ${v.help} (${v.nodes.length}×: ${v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(' '))
      .join(' | ')})`;
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const unexplained = results.violations.filter(
    (v) => v.impact !== 'serious' && v.impact !== 'critical' && !(v.id in ALLOWED_MINOR_RULES),
  );
  expect(blocking.map(describe), `serious/critical axe violations (${state})`).toEqual([]);
  expect(unexplained.map(describe), `undocumented minor axe violations (${state})`).toEqual([]);
}

async function openApp(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

test.describe('accessibility (axe)', () => {
  test('initial view, info panel, progression guide and About view', async ({ page }) => {
    await openApp(page);
    await audit(page, 'initial');

    await page.keyboard.press('/');
    await page.keyboard.type('troll cave');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-panel')).toBeVisible();
    await audit(page, 'info panel');

    await page.getByRole('tab', { name: 'Progression guide' }).click();
    await expect(page.getByTestId('progression-guide')).toBeVisible();
    await audit(page, 'progression guide');

    await page.getByRole('button', { name: 'About & sources' }).click();
    await expect(page.getByTestId('about-sources')).toBeVisible();
    await audit(page, 'About view');
  });

  test.describe('first visit', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('first-run dialog and controls help', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('dialog', { name: 'New to Valheim?' })).toBeVisible();
      await expect(page.locator('#atlas-search')).toBeEnabled();
      await audit(page, 'first-run dialog');
    });
  });

  test('landmarks, skip link and the map description', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('main', { name: 'Map' })).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'Map controls' })).toHaveCount(1);

    // The first Tab stop is the skip link; it jumps straight to the search box.
    await page.locator('body').focus();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to search' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#atlas-search')).toBeFocused();

    // The 3D view is described for screen readers and doesn't trap Tab.
    const map = page.getByRole('application');
    await expect(map).toHaveAccessibleDescription(/search box/);
    await map.focus();
    await page.keyboard.press('Tab');
    await expect(map).not.toBeFocused();

    // Keyboard focus is always visible.
    await page.getByRole('button', { name: 'Reset view' }).focus();
    const outline = await page
      .getByRole('button', { name: 'Reset view' })
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });
});
