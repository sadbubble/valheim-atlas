import { defineConfig, devices } from '@playwright/test';

const PORT = 4179;
const BASE_URL = `http://localhost:${PORT}`;

/** Production build served under a GitHub-Pages-style sub-path (scripts/serve-static.ts). */
const SUBPATH_PORT = 4180;
export const SUBPATH = '/valheim-atlas/';
const SUBPATH_ORIGIN = `http://localhost:${SUBPATH_PORT}`;

/**
 * Tests start as a returning visitor: the first-run prompt was answered ("dismissed") and
 * the controls hint closed, so neither covers the map. The first-run spec opts out of this
 * with an empty storage state to test a clean visit.
 */
function returningVisitor(origin: string) {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: 'valheim-atlas:prefs',
            value: JSON.stringify({ onboarding: 'dismissed', controlsHintHidden: true }),
          },
        ],
      },
    ],
  };
}
export const RETURNING_VISITOR = returningVisitor(BASE_URL);

const chromium = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 800 },
  // Headless CI has no GPU: render WebGL in software (SwiftShader).
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  },
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
      testIgnore: /subpath\.spec\.ts/,
      use: chromium,
    },
    {
      // The static production build, as deployed (docs/RELEASE.md).
      name: 'subpath',
      testMatch: /subpath\.spec\.ts$/,
      use: {
        ...chromium,
        baseURL: `${SUBPATH_ORIGIN}${SUBPATH}`,
        storageState: returningVisitor(SUBPATH_ORIGIN),
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `npm run build && npm run serve:subpath -- --port ${SUBPATH_PORT} --base ${SUBPATH}`,
      url: `${SUBPATH_ORIGIN}${SUBPATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
