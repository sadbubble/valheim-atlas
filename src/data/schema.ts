import { z } from 'zod';

/** Source IDs mirror docs/SOURCES.md, e.g. "S-LOC-01". */
export const SourceIdSchema = z
  .string()
  .regex(/^S-[A-Z]+-\d{2}$/, 'Expected a source ID like S-LOC-01');
export type SourceId = z.infer<typeof SourceIdSchema>;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

export const SourceRefSchema = z.object({
  id: SourceIdSchema,
  title: z.string().min(1),
  url: z.url(),
  kind: z.enum(['official', 'wiki', 'community-data', 'decompile-derived', 'press']),
  license: z.string().optional(),
  accessed: IsoDateSchema,
  gameVersion: z.string().optional(),
  confidence: z.enum(['read', 'snippet', 'conflict']),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const SourcesFileSchema = z.array(SourceRefSchema);

/** Every record carrying game facts must cite at least one source (CLAUDE.md rule 2). */
export const SourcedSchema = z.object({
  sources: z.array(SourceIdSchema).min(1),
  notes: z.string().optional(),
});

export const MetaSchema = SourcedSchema.extend({
  targetGameVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  worldGenVersion: z.number().int().nonnegative(),
  dataUpdated: IsoDateSchema,
});
export type Meta = z.infer<typeof MetaSchema>;
