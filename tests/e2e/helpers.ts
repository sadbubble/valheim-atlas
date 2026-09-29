import type { Page } from '@playwright/test';
import type {} from '../../src/render/debug-hooks';

export interface View {
  x: number;
  z: number;
  distanceM: number;
  polar: number;
  azimuth: number;
}

/** Opens the app and waits until a world is generated and rendered. */
export async function openWorld(page: Page, seed = 'HelloWorld'): Promise<void> {
  await page.goto(`/?seed=${encodeURIComponent(seed)}`);
  await page.waitForFunction(() => window.__atlas?.ready === true, null, { timeout: 150_000 });
}

export async function getView(page: Page): Promise<View | null> {
  return page.evaluate(() => window.__atlas?.getView() ?? null);
}

export async function setView(page: Page, view: View): Promise<void> {
  await page.evaluate((v) => window.__atlas?.setView(v), view);
}
