import type { WorkerRequest, WorkerResponse } from './protocol';
import { hashSeed } from './rng';

/**
 * Pure request handler, kept separate from worker.ts so it can be unit-tested.
 * Phase 1 placeholder: real generation (heights, biomes, placements) lands in Phase 2.
 */
export function handleRequest(req: WorkerRequest, emit: (res: WorkerResponse) => void): void {
  // Only 'generate' exists so far; switch on req.type once more request kinds are added.
  emit({ type: 'progress', requestId: req.requestId, progress: 0 });
  const seedHash = hashSeed(req.seed);
  emit({ type: 'progress', requestId: req.requestId, progress: 1 });
  emit({ type: 'done', requestId: req.requestId, seed: req.seed, seedHash });
}
