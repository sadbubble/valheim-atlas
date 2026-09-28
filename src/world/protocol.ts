import { z } from 'zod';

/** Messages from the main thread to the world worker. */
export const WorkerRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('generate'), requestId: z.number().int(), seed: z.string() }),
]);
export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;

/** Messages from the world worker to the main thread. */
export const WorkerResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('progress'),
    requestId: z.number().int(),
    progress: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal('done'),
    requestId: z.number().int(),
    seed: z.string(),
    seedHash: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('error'), requestId: z.number().int(), message: z.string() }),
]);
export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
