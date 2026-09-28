import { handleRequest } from './handle-request';
import { WorkerRequestSchema, type WorkerResponse } from './protocol';

const post = (res: WorkerResponse): void => {
  globalThis.postMessage(res);
};

globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  const parsed = WorkerRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    post({ type: 'error', requestId: -1, message: `Bad request: ${parsed.error.message}` });
    return;
  }
  try {
    handleRequest(parsed.data, post);
  } catch (err) {
    post({ type: 'error', requestId: parsed.data.requestId, message: String(err) });
  }
});
