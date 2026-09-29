import { expect, test, type Page } from '@playwright/test';
import { getView } from './helpers';

/** Opens the app and waits until a world is rendered and the content data is loaded. */
async function openApp(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

/** The camera's polar angle a couple of frames from now (0 = looking straight down). */
async function polarSoon(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            resolve(window.__atlas?.getView()?.polar ?? Number.NaN);
          }),
        );
      }),
  );
}

test.describe('first run (clean visit)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('"Yes" gives the spoiler-free newcomer setup with the guide open; not shown again', async ({
    page,
  }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'New to Valheim?' });
    await expect(dialog).toBeVisible();
    const yes = dialog.getByRole('button', { name: /^Yes/ });
    await expect(yes).toBeFocused();
    // Focus is trapped inside the dialog, and global shortcuts don't fire behind it.
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Skip' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(yes).toBeFocused();
    await page.keyboard.press('/');
    await expect(page.locator('#atlas-search')).not.toBeFocused();

    await yes.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Progression guide' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('progression-guide')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Newcomer' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('tab', { name: 'Layers & tools' }).click();
    await expect(page.getByLabel('None (spoiler-free)')).toBeChecked();

    // The controls hint is shown on a first visit, can be closed and brought back.
    const hint = page.getByRole('region', { name: 'Moving around' });
    await expect(hint).toBeVisible();
    await hint.getByRole('button', { name: 'Hide controls help' }).click();
    await expect(hint).toHaveCount(0);
    await page.getByRole('button', { name: 'Controls help' }).click();
    await expect(hint).toBeVisible();

    await page.reload();
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('"No" gives the veteran setup with every layer, remembered on the next visit', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'No, show me everything' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Veteran' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByLabel('Grid & coordinates')).toBeChecked();
    await expect(page.getByLabel('Creatures (per biome)')).toBeChecked();
    await expect(page.getByLabel('Everything', { exact: true })).toBeChecked();
    expect(new URL(page.url()).searchParams.get('mode')).toBe('veteran');

    await page.goto('/');
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Veteran' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('never shown for a link that sets the mode; Esc dismisses it for good', async ({ page }) => {
    await page.goto('/?mode=veteran');
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'New to Valheim?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('works when localStorage throws (the prompt simply asks again)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage blocked');
        },
      });
    });
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'New to Valheim?' });
    await dialog.getByRole('button', { name: /^Yes/ }).click();
    await expect(page.getByTestId('progression-guide')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'New to Valheim?' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('newcomer and veteran features', () => {
  test('progression guide: boss link → info panel → fly to region; spoilers stay hidden', async ({
    page,
  }) => {
    await openApp(page); // newcomer, spoiler-free
    await page.getByRole('tab', { name: 'Progression guide' }).click();
    const guide = page.getByTestId('progression-guide');
    await expect(guide.getByRole('heading', { name: 'Progression guide' })).toBeVisible();

    // Tier order at a glance, with later tiers hidden (never named) at spoiler level 0.
    const hiddenStep = guide.getByTestId('guide-step-3');
    await expect(hiddenStep).toContainText('hidden by your spoiler setting');
    await expect(hiddenStep.getByRole('link')).toHaveCount(0);
    await expect(hiddenStep.locator('.entity-link')).toHaveCount(0);

    // Step 1: boss, summon items with counts, altar and its biome, all cited.
    const step = guide.getByTestId('guide-step-1');
    await expect(step).toContainText('Summon with');
    await expect(step).toContainText(/Altar.+ in .+/);
    await expect(step.locator('.sources summary')).toContainText(/Sources \(\d+\)/);
    await step.getByRole('button', { name: 'Eikthyr', exact: true }).click();
    const panel = page.getByTestId('info-panel');
    await expect(panel.getByRole('heading', { name: 'Eikthyr' })).toBeVisible();

    const before = await getView(page);
    if (!before) throw new Error('no view');
    await step.getByRole('button', { name: /^Fly to the .+ region$/ }).click();
    await expect
      .poll(
        async () => {
          const v = await getView(page);
          return v
            ? Math.hypot(v.x - before.x, v.z - before.z) + Math.abs(v.distanceM - before.distanceM)
            : 0;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(1000);

    // Ticking a step moves "Next" on.
    await expect(step).toHaveAttribute('aria-current', 'step');
    await step.getByRole('checkbox', { name: 'Step 1 done' }).check();
    await expect(guide.getByTestId('guide-step-2')).toHaveAttribute('aria-current', 'step');
  });

  test('search finds guide steps and never names spoiler-hidden entries', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('/');
    await page.keyboard.type('first steps');
    const option = page.getByRole('option', { name: /first steps.*Guide step/ });
    await expect(option).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-panel')).toContainText('Guide step');

    await page.keyboard.press('/');
    await page.keyboard.type('bonem');
    await expect(
      page.getByRole('option', { name: /hidden by your spoiler setting/ }),
    ).toBeVisible();
    await expect(page.getByRole('option', { name: /Bonemass/ })).toHaveCount(0);
  });

  test('top-down view button and keyboard camera controls', async ({ page }) => {
    await openApp(page);
    const start = await getView(page);
    if (!start) throw new Error('no view');
    await page.getByRole('button', { name: 'Top-down view' }).click();
    await expect
      .poll(async () => (await getView(page))?.polar ?? 1, { timeout: 20_000 })
      .toBeLessThan(0.05);

    // R resets to the overview; T goes top-down again.
    await page.keyboard.press('r');
    await expect
      .poll(async () => (await getView(page))?.polar ?? 0, { timeout: 20_000 })
      .toBeGreaterThan(0.5);
    await page.keyboard.press('t');
    await expect
      .poll(async () => (await getView(page))?.polar ?? 1, { timeout: 20_000 })
      .toBeLessThan(0.05);

    // With the map focused: arrows pan, "+" zooms in.
    await page.locator('.world-canvas').focus();
    const a = await getView(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await getView(page))?.x ?? 0).toBeGreaterThan((a?.x ?? 0) + 100);
    const b = await getView(page);
    await page.keyboard.press('+');
    await expect
      .poll(async () => (await getView(page))?.distanceM ?? Infinity)
      .toBeLessThan((b?.distanceM ?? 0) * 0.95);
  });

  test('reduced motion: camera moves jump instead of flying', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    expect(await polarSoon(page)).toBeGreaterThan(0.5);
    await page.getByRole('button', { name: 'Top-down view' }).click();
    expect(await polarSoon(page)).toBeLessThan(0.05);
  });

  test('link-out to valheim-map.world (seed format undocumented → home page)', async ({ page }) => {
    await openApp(page);
    const link = page.getByRole('link', { name: 'View the exact map on valheim-map.world' });
    await expect(link).toBeVisible();
    // No seed URL format is recorded in docs/SOURCES.md or DECISION.md, so no seed param.
    await expect(link).toHaveAttribute('href', 'https://valheim-map.world/');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('title', /isn't documented/);
    await expect(link).toHaveAttribute('title', /HelloWorld/);
    // V7: the data's target game version is always in the footer.
    await expect(page.locator('.hud-footer')).toContainText(/Target game version \d+\.\d+\.\d+/);
  });

  test('spoiler setting is remembered for a plain visit; the URL still wins', async ({ page }) => {
    await openApp(page);
    await page.getByLabel('Up to mild spoilers').check();
    await page.goto('/');
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByLabel('Up to mild spoilers')).toBeChecked();
    await page.goto('/?spoiler=2');
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await expect(page.getByLabel('Everything', { exact: true })).toBeChecked();
  });

  test('location panels explain their category in plain words (N7)', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('/');
    await page.keyboard.type('troll cave');
    await page.keyboard.press('Enter');
    const glossary = page.getByTestId('category-glossary');
    await expect(glossary).toContainText('What is a dungeon?');
    await expect(glossary.locator('.sources summary')).toContainText(/Sources \(\d+\)/);
    // V5: spawn rules and constraints, with sources.
    const panel = page.getByTestId('info-panel');
    for (const label of [
      'Placement attempts per world',
      'Placed before other places',
      'Min distance from centre',
      'Max altitude above sea',
    ]) {
      await expect(panel.locator('.fact', { hasText: label })).toHaveCount(1);
    }
    await expect(panel.locator('.overview > .sources summary')).toContainText(/Sources \(\d+\)/);
  });

  test('searching a resource shows where it is found, "unknown" when unsourced (N5)', async ({
    page,
  }) => {
    await openApp(page);
    await page.keyboard.press('/');
    await page.keyboard.type('copper ore');
    await page.keyboard.press('Enter');
    const panel = page.getByTestId('info-panel');
    await panel.getByRole('tab', { name: 'Loot' }).click();
    const loot = panel.getByRole('tabpanel');
    await expect(loot).toContainText('Found in biomes');
    await expect(loot.locator('.entity-link').first()).toBeVisible();
    await expect(loot).toContainText('Found in locations');
    await expect(loot).toContainText('unknown');
  });

  test('the seed box regenerates the world, still labelled as an approximation (V1)', async ({
    page,
  }) => {
    await openApp(page);
    await page.locator('#seed-input').fill('E2eOtherSeed');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.locator('.hud-status')).toContainText(
      /Shaping the land|Placing locations|Painting the map|Loading your saved world|World ready/,
    );
    expect(new URL(page.url()).searchParams.get('seed')).toBe('E2eOtherSeed');
    await expect(page.locator('.hud-status')).toContainText('World ready', { timeout: 150_000 });
    await expect(page.locator('.hud-badge')).toHaveText('Approximation');
    await expect(page.getByTestId('exact-map-link')).toHaveAttribute('title', /E2eOtherSeed/);
  });

  test('find the nearest trader from a pin: highlight, panel and fly (V3)', async ({ page }) => {
    await openApp(page, '?mode=veteran&pins=0,0,Home');
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    const panel = page.getByTestId('info-panel');
    await panel.getByLabel('Find nearest').selectOption('trader');
    await panel.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(panel.locator('.kind')).toHaveText('Location');
    await expect(panel).toContainText(/X -?\d+ · Z -?\d+/);
    await expect
      .poll(async () => (await getView(page))?.distanceM ?? Infinity, { timeout: 20_000 })
      .toBeLessThan(5000);
  });

  test('a copied link reopens the selected panel (V6)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page, '?mode=veteran');
    await page.keyboard.press('/');
    await page.keyboard.type('troll cave');
    await page.keyboard.press('Enter');
    const panel = page.getByTestId('info-panel');
    await expect(panel.getByRole('heading', { name: 'Troll Cave' })).toBeVisible();
    await page.getByRole('button', { name: 'Copy link' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).searchParams.get('sel')).toBe('troll-cave');

    await page.goto('/');
    await expect(page.locator('#atlas-search')).toBeEnabled();
    await page.goto(link);
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    await expect(panel.getByRole('heading', { name: 'Troll Cave' })).toBeVisible();
  });

  test('layer counts and per-type filters (V2)', async ({ page }) => {
    await openApp(page, '?mode=veteran');
    await expect(page.locator('.layer-toggle', { hasText: 'Dungeons' }).first()).toContainText(
      /\(\d+\)/,
    );
    await page.getByText('Filter by place type').click();
    const troll = page.getByRole('checkbox', { name: /Troll Cave/ });
    await expect(troll).toBeChecked();
    await troll.uncheck();
    expect(new URL(page.url()).searchParams.get('hide')).toBe('troll-cave');
  });

  test('biome threats flag creatures as hostile or passive (N4); hover shows biome tier (N1)', async ({
    page,
  }) => {
    await openApp(page, '?mode=veteran');
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId('coords')).toContainText(/\(tier \d\)/);

    await page.keyboard.press('/');
    await page.keyboard.type('meadows');
    await page.getByRole('option', { name: /^Meadows\b.*Biome/ }).click();
    const panel = page.getByTestId('info-panel');
    await panel.getByRole('tab', { name: 'Threats' }).click();
    await expect(panel.getByRole('tabpanel')).toContainText('Hostile');
    await expect(panel.getByRole('tabpanel')).toContainText('Passive');
  });
});
