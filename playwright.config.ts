import { defineConfig, devices } from '@playwright/test';

const PORT = 4179;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Tests start as a returning visitor: the first-run prompt was answered ("dismissed") and
 * the controls hint closed, so neither covers the map. The first-run spec opts out of this
 * with an empty storage state to test a clean visit.
 */
export const RETURNING_VISITOR = {
  cookies: [],
  origins: [
    {
      origin: BASE_URL,
      localStorage: [
        {
          name: 'valheim-atlas:prefs',
          value: JSON.stringify({ onboarding: 'dismissed', controlsHintHidden: true }),
        },
      ],
    },
  ],
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    storageState: RETURNING_VISITOR,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        // Headless CI has no GPU: render WebGL in software (SwiftShader).
        launchOptions: {
          args: [
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
