import { describe, expect, it } from 'vitest';
import { handleRequest } from './handle-request';
import { WorkerResponseSchema, type WorkerResponse } from './protocol';
import { hashSeed } from './rng';

describe('handleRequest', () => {
  it('emits progress then done with the seed hash', () => {
    const out: WorkerResponse[] = [];
    handleRequest({ type: 'generate', requestId: 7, seed: 'abc' }, (r) => out.push(r));
    for (const msg of out) expect(WorkerResponseSchema.parse(msg)).toEqual(msg);
    expect(out.at(-1)).toEqual({
      type: 'done',
      requestId: 7,
      seed: 'abc',
      seedHash: hashSeed('abc'),
    });
    expect(out.filter((m) => m.type === 'progress').map((m) => m.progress)).toEqual([0, 1]);
  });
});
