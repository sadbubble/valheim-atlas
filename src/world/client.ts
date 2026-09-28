import { WorkerResponseSchema } from './protocol';

export interface GenerateResult {
  seed: string;
  seedHash: number;
}

export interface WorldClient {
  generate(seed: string, onProgress?: (progress: number) => void): Promise<GenerateResult>;
  dispose(): void;
}

/** Main-thread wrapper around the world Web Worker. */
export function createWorldClient(): WorldClient {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let nextId = 0;
  const pending = new Map<
    number,
    {
      resolve: (r: GenerateResult) => void;
      reject: (e: Error) => void;
      onProgress: ((p: number) => void) | undefined;
    }
  >();

  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    const parsed = WorkerResponseSchema.safeParse(event.data);
    if (!parsed.success) return;
    const msg = parsed.data;
    const entry = pending.get(msg.requestId);
    if (!entry) return;
    switch (msg.type) {
      case 'progress':
        entry.onProgress?.(msg.progress);
        break;
      case 'done':
        pending.delete(msg.requestId);
        entry.resolve({ seed: msg.seed, seedHash: msg.seedHash });
        break;
      case 'error':
        pending.delete(msg.requestId);
        entry.reject(new Error(msg.message));
        break;
    }
  });

  return {
    generate(seed, onProgress) {
      const requestId = nextId++;
      return new Promise<GenerateResult>((resolve, reject) => {
        pending.set(requestId, { resolve, reject, onProgress });
        worker.postMessage({ type: 'generate', requestId, seed });
      });
    },
    dispose() {
      worker.terminate();
      for (const entry of pending.values()) entry.reject(new Error('World worker disposed'));
      pending.clear();
    },
  };
}
