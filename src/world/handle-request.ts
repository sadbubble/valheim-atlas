import { generateWorldSync } from './generate';
import type { WorkerRequest, WorkerResponse } from './protocol';

export type Emit = (res: WorkerResponse, transfer?: Transferable[]) => void;

/** Pure request handler, kept separate from worker.ts so it can be unit-tested. */
export function handleRequest(req: WorkerRequest, emit: Emit): void {
  // Only 'generate' exists so far; switch on req.type once more request kinds are added.
  const { requestId } = req;
  let last = -1;
  const world = generateWorldSync(req.seed, req.resolution, req.data, (progress) => {
    // Throttle to whole percents.
    const pct = Math.floor(progress * 100);
    if (pct !== last) {
      last = pct;
      emit({ type: 'progress', requestId, progress });
    }
  });
  // Transfer the big buffers instead of copying them.
  emit({ type: 'done', requestId, world }, [world.height.buffer, world.biomes.buffer]);
}
