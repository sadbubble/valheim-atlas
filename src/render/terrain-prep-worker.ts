import { handlePrepRequest, type PrepWorkerState } from './handle-prep-request';
import { PrepRequestSchema, type PrepResponse } from './terrain-prep-protocol';

/** Terrain-prep Web Worker entry: turns a generated world into render buffers off the main thread. */
const state: PrepWorkerState = { world: null };

const post = (res: PrepResponse, transfer: Transferable[] = []): void => {
  globalThis.postMessage(res, { transfer });
};

globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  const parsed = PrepRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    post({ type: 'error', requestId: -1, message: `Bad request: ${parsed.error.message}` });
    return;
  }
  try {
    handlePrepRequest(parsed.data, state, post);
  } catch (err) {
    post({ type: 'error', requestId: parsed.data.requestId, message: String(err) });
  }
});
