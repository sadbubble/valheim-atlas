import { z } from 'zod';
import { WorldGenDataSchema } from '../data/schema';
import { MAX_RESOLUTION, MIN_RESOLUTION } from './generator-info';
import { GeneratedWorldSchema } from './types';

/** Messages from the main thread to the world worker. */
export const WorkerRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('generate'),
    requestId: z.number().int(),
    seed: z.string(),
    resolution: z.number().int().min(MIN_RESOLUTION).max(MAX_RESOLUTION),
    data: WorldGenDataSchema,
  }),
]);
export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;

/** Messages from the world worker to the main thread. */
export const WorkerResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('progress'),
    requestId: z.number().int(),
    progress: z.number().min(0).max(1),
    stage: z.enum(['terrain', 'locations']),
  }),
  z.object({ type: z.literal('done'), requestId: z.number().int(), world: GeneratedWorldSchema }),
  z.object({ type: z.literal('error'), requestId: z.number().int(), message: z.string() }),
]);
export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
