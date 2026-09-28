import { describe, expect, it } from 'vitest';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { handleRequest } from './handle-request';
import { WorkerRequestSchema, WorkerResponseSchema, type WorkerResponse } from './protocol';

describe('handleRequest', () => {
  it('emits throttled progress, then done with transferable buffers', () => {
    const data = loadWorldGenDataFromDisk();
    const req = WorkerRequestSchema.parse({
      type: 'generate',
      requestId: 7,
      seed: 'abc',
      resolution: 64,
      data,
    });
    const out: { res: WorkerResponse; transfer: Transferable[] | undefined }[] = [];
    handleRequest(req, (res, transfer) => out.push({ res, transfer }));

    for (const { res } of out) expect(WorkerResponseSchema.safeParse(res).success).toBe(true);
    const progress = out.flatMap(({ res }) => (res.type === 'progress' ? [res.progress] : []));
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    expect(progress.length).toBeLessThanOrEqual(101);

    const last = out.at(-1);
    expect(last?.res.type).toBe('done');
    if (last?.res.type !== 'done') return;
    expect(last.res.requestId).toBe(7);
    expect(last.res.world.seed).toBe('abc');
    expect(last.transfer).toEqual([last.res.world.height.buffer, last.res.world.biomes.buffer]);
  });

  it('rejects malformed requests at the schema boundary', () => {
    expect(
      WorkerRequestSchema.safeParse({ type: 'generate', requestId: 1, seed: 'x', resolution: 8 })
        .success,
    ).toBe(false);
  });
});
