import { expect, test, type Page } from '@playwright/test';
import { getView, type View } from './helpers';

/** The camera view after `frames` animation frames. */
async function viewAfterFrames(page: Page, frames: number): Promise<View | null> {
  return page.evaluate(
    (n) =>
      new Promise<View | null>((resolve) => {
        let left = n;
        const tick = () => {
          if (--left <= 0) resolve(window.__atlas?.getView() ?? null);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

/** The shader clock after `frames` animation frames (software rendering is slow in CI). */
async function shaderTimeAfterFrames(page: Page, frames: number): Promise<number> {
  return page.evaluate(
    (n) =>
      new Promise<number>((resolve) => {
        let left = n;
        const tick = () => {
          if (--left <= 0) resolve(window.__atlas?.stats.shaderTimeS ?? Number.NaN);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

/** Records every distinct world fade-in value (frameStats.reveal) from page load on. */
async function recordReveal(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __reveals: number[] };
    w.__reveals = [];
    const tick = () => {
      const r = window.__atlas?.stats.reveal;
      if (r !== undefined && w.__reveals.at(-1) !== r) w.__reveals.push(r);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const reveals = (page: Page) =>
  page.evaluate(() => (window as unknown as { __reveals: number[] }).__reveals);

/** Elements (by class) with a running CSS transition or animation. */
const movingElements = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll<HTMLElement>(sel)]
        .map((el) => ({ el, cs: getComputedStyle(el) }))
        .filter(
          ({ cs }) =>
            cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ||
            cs.animationName !== 'none',
        )
        .map(({ el }) => el.className),
    selector,
  );

async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
  await expect(page.locator('#atlas-search')).toBeEnabled();
}

test.describe('prefers-reduced-motion (SPEC §7)', () => {
  test('fly-to jumps; shader motion and CSS transitions stand still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    const before = await getView(page);

    await page.keyboard.press('/');
    await page.keyboard.type('troll cave');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-panel')).toBeVisible();

    // Within two frames the camera is where it ends up: no flight in between.
    const soon = await viewAfterFrames(page, 2);
    const later = await viewAfterFrames(page, 30);
    expect(soon?.distanceM).toBeLessThan((before?.distanceM ?? 0) / 2);
    expect(Math.abs((soon?.distanceM ?? 0) - (later?.distanceM ?? 1e9))).toBeLessThan(1);
    expect(
      Math.hypot((soon?.x ?? 0) - (later?.x ?? 1e9), (soon?.z ?? 0) - (later?.z ?? 1e9)),
    ).toBeLessThan(1);

    // The shader clock (marker/highlight pulses, water, lava, mist, stars) stands still.
    const t0 = await shaderTimeAfterFrames(page, 1);
    expect(await shaderTimeAfterFrames(page, 3)).toBe(t0);

    // No CSS transitions or animations on the HUD.
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.hud *, .skip-link')]
        .map((el) => ({ el, cs: getComputedStyle(el) }))
        .filter(
          ({ cs }) =>
            cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ||
            cs.animationName !== 'none',
        )
        .map(({ el }) => el.className),
    );
    expect(moving).toEqual([]);
  });

  test('the loading screen and the world fade-in are instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordReveal(page);
    await page.goto('/?seed=E2eReducedLoad');
    const overlay = page.getByTestId('loading-overlay');
    await expect(overlay).toBeVisible();
    // No pulsing step marker, no sliding bar, no fade.
    expect(await movingElements(page, '.loading-overlay, .loading-overlay *')).toEqual([]);
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    // The world appears in one step (0 → 1) and the loading screen is gone at once.
    expect(await reveals(page)).toEqual([0, 1]);
    await expect(overlay).toHaveCount(0);
    // Biome labels: no fade or hover lift.
    await expect(page.locator('.biome-label').first()).toBeAttached();
    expect(await movingElements(page, '.biome-label')).toEqual([]);
  });

  test('without the setting, the world fades in', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordReveal(page);
    await page.goto('/?seed=E2eFadeLoad');
    await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
    const seen = await reveals(page);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    expect(seen.some((r) => r > 0 && r < 1)).toBe(true);
  });

  test('without the setting, shader motion keeps running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openApp(page);
    const t0 = await shaderTimeAfterFrames(page, 1);
    expect(await shaderTimeAfterFrames(page, 3)).toBeGreaterThan(t0);
    // Switching the setting on while the page is open freezes it too.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const t1 = await shaderTimeAfterFrames(page, 2);
    expect(await shaderTimeAfterFrames(page, 3)).toBe(t1);
  });
});
