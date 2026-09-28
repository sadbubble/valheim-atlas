import type { WorldGenData } from '../data/schema';
import { WorkerResponseSchema } from './protocol';
import type { GeneratedWorld } from './types';

export interface WorldClient {
  generate(
    seed: string,
    resolution: number,
    data: WorldGenData,
    onProgress?: (progress: number) => void,
  ): Promise<GeneratedWorld>;
  dispose(): void;
}

/** Main-thread wrapper around the world Web Worker. */
export function createWorldClient(): WorldClient {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let nextId = 0;
  const pending = new Map<
    number,
    {
      resolve: (w: GeneratedWorld) => void;
      reject: (e: Error) => void;
      onProgress: ((p: number) => void) | undefined;
    }
  >();

  const failAll = (message: string) => {
    for (const entry of pending.values()) entry.reject(new Error(message));
    pending.clear();
  };

  worker.addEventListener('error', (event) => {
    failAll(`World worker crashed: ${event.message}`);
  });

  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    const parsed = WorkerResponseSchema.safeParse(event.data);
    if (!parsed.success) {
      failAll(`Invalid message from world worker: ${parsed.error.message}`);
      return;
    }
    const msg = parsed.data;
    if (msg.type === 'error' && msg.requestId === -1) {
      failAll(msg.message);
      return;
    }
    const entry = pending.get(msg.requestId);
    if (!entry) return;
    switch (msg.type) {
      case 'progress':
        entry.onProgress?.(msg.progress);
        break;
      case 'done':
        pending.delete(msg.requestId);
        entry.resolve(msg.world);
        break;
      case 'error':
        pending.delete(msg.requestId);
        entry.reject(new Error(msg.message));
        break;
    }
  });

  return {
    generate(seed, resolution, data, onProgress) {
      const requestId = nextId++;
      return new Promise<GeneratedWorld>((resolve, reject) => {
        pending.set(requestId, { resolve, reject, onProgress });
        worker.postMessage({ type: 'generate', requestId, seed, resolution, data });
      });
    },
    dispose() {
      worker.terminate();
      failAll('World worker disposed');
    },
  };
}
