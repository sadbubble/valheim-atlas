import { describe, expect, it } from 'vitest';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { generateWorldSync } from './generate';

const data = loadWorldGenDataFromDisk();
/** Target: ~3 s at 1024² on a mid-range laptop. CI machines vary, so assert with 2× slack. */
const TARGET_MS = 3000;
const CEILING_MS = 2 * TARGET_MS;

describe('generation performance', () => {
  it('generates a 1024² world within budget', () => {
    generateWorldSync('warmup', 256, data);
    const t0 = performance.now();
    const w = generateWorldSync('HelloWorld', 1024, data);
    const ms = performance.now() - t0;
    console.info(`1024² world: ${ms.toFixed(0)} ms, ${w.locations.length} locations`);
    expect(ms).toBeLessThan(CEILING_MS);
  }, 30_000);
});
