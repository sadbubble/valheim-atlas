/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy for the static build (docs/RELEASE.md). Static hosts such as GitHub
 * Pages can't send headers, so it goes in a <meta> tag. Everything is same-origin: scripts,
 * styles, data JSON and the world worker. React sets inline style *attributes* (never <style>
 * or inline scripts), hence style-src-attr. Not applied to the dev server, whose hot reload
 * injects inline scripts.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function securityMeta(): Plugin {
  return {
    name: 'atlas-security-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
      // Outbound links already use rel="noreferrer"; this covers everything else.
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head' },
    ],
  };
}

export default defineConfig({
  // Relative asset URLs, so the same build works at a domain root or under a sub-path such as
  // GitHub Pages' /<repo>/ (docs/RELEASE.md). ATLAS_BASE overrides it (e.g. "/valheim-atlas/").
  base: process.env.ATLAS_BASE ?? './',
  plugins: [react(), securityMeta()],
  worker: {
    format: 'es',
  },
  // three.js alone is ~1 MB minified; the real budget is SPEC §8 (< 1.5 MB gzipped), checked by
  // `npm run budget` (scripts/budget.ts) from the build manifest.
  build: {
    chunkSizeWarningLimit: 1500,
    manifest: true,
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        debug: fileURLToPath(new URL('./debug.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
