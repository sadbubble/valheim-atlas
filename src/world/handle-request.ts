import { generateWorldSync } from './generate';
import type { WorkerRequest, WorkerResponse } from './protocol';

export type Emit = (res: WorkerResponse, transfer?: Transferable[]) => void;

/** Pure request handler, kept separate from worker.ts so it can be unit-tested. */
export function handleRequest(req: WorkerRequest, emit: Emit): void {
  // Only 'generate' exists so far; switch on req.type once more request kinds are added.
  const { requestId } = req;
  let last = -1;
  let lastStage = '';
  const world = generateWorldSync(req.seed, req.resolution, req.data, (progress, stage) => {
    // Throttle to whole percents (and stage changes).
    const pct = Math.floor(progress * 100);
    if (pct !== last || stage !== lastStage) {
      last = pct;
      lastStage = stage;
      emit({ type: 'progress', requestId, progress, stage });
    }
  });
  // Transfer the big buffers instead of copying them.
  emit({ type: 'done', requestId, world }, [world.height.buffer, world.biomes.buffer]);
}
