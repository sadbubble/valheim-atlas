import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface Meta {
  targetGameVersion: string;
  dataUpdated: string;
}
interface Source {
  id: string;
  url: string;
}

const meta = JSON.parse(readFileSync('public/data/meta.json', 'utf8')) as Meta;
const sources = JSON.parse(readFileSync('public/data/sources.json', 'utf8')) as Source[];

async function openApp(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

test.describe('About / data view (SPEC F12, V7)', () => {
  test('opens from the bottom bar; shows version, generator, sources, disclaimer', async ({
    page,
  }) => {
    await openApp(page);
    // The disclaimer and version are always in the bottom bar.
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText(
      'Fan-made. Not affiliated with or endorsed by Iron Gate or Coffee Stain.',
    );
    await expect(footer).toContainText(`Target game version ${meta.targetGameVersion}`);

    const opener = page.getByRole('button', { name: 'About & sources' });
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'About Valheim Atlas' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/[?&]about=1/);

    // Version and date come from meta.json.
    await expect(dialog.getByTestId('about-game-version')).toHaveText(meta.targetGameVersion);
    await expect(dialog).toContainText(meta.dataUpdated);
    // Generator and the approximation note.
    await expect(dialog).toContainText('approx-v1');
    await expect(dialog).toContainText('Approximation');
    await expect(dialog).toContainText(/not.*the real world for your seed/);
    await expect(dialog).toContainText(
      'Fan-made. Not affiliated with or endorsed by Iron Gate or Coffee Stain.',
    );
    await expect(dialog.getByTestId('about-unverified')).toContainText(
      /\d+ values have no verified/,
    );

    // Every source in sources.json is listed; links go only to their https URLs.
    const list = dialog.getByTestId('about-sources');
    await expect(list.getByRole('listitem')).toHaveCount(sources.length);
    const hrefs = await list.getByRole('link').evaluateAll((as) =>
      as.map((a) => ({
        href: a.getAttribute('href'),
        rel: a.getAttribute('rel'),
      })),
    );
    const allowed = new Set(sources.map((s) => s.url));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) {
      expect(allowed.has(h.href ?? '')).toBe(true);
      expect(h.href).toMatch(/^https:\/\//);
      expect(h.rel).toBe('noopener noreferrer');
    }

    // Focus is trapped in the dialog.
    const close = dialog.getByRole('button', { name: 'Close About' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    // Global shortcuts don't fire behind it.
    await page.keyboard.press('/');
    await expect(page.locator('#atlas-search')).not.toBeFocused();

    // Esc closes it and hands focus back to the opener.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(page).not.toHaveURL(/about=1/);
  });

  test('deep link ?about=1 opens it (even on a first visit); closing focuses the About button', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/?about=1');
    const dialog = page.getByRole('dialog', { name: 'About Valheim Atlas' });
    await expect(dialog).toBeVisible();
    // No first-run prompt on top of it.
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(dialog.getByTestId('about-game-version')).toHaveText(meta.targetGameVersion);
    await dialog.getByRole('button', { name: 'Close About' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'About & sources' })).toBeFocused();
    await context.close();
  });
});
