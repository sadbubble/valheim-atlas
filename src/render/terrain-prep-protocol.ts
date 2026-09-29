import { z } from 'zod';
import { BiomeIdSchema } from '../data/schema';
import type { BiomeAnchor } from './biome-anchors';
import type { ChunkInfo } from './chunks';
import type { ChunkMesh, PreparedTerrain, TerrainPrepInput } from './terrain-prep';

/** Messages between the main thread and the terrain-prep worker (parsed on both sides). */

const TerrainPrepInputSchema = z.object({
  resolution: z.number().int().positive(),
  extentM: z.number().positive(),
  cellSizeM: z.number().positive(),
  height: z.instanceof(Float32Array),
  biomes: z.instanceof(Uint8Array),
  biomeIds: z.array(BiomeIdSchema),
  seaLevelM: z.number(),
  waterEdgeM: z.number().positive(),
  worldRadiusM: z.number().positive(),
}) satisfies z.ZodType<TerrainPrepInput>;

const ChunkInfoSchema = z.object({
  index: z.number().int(),
  i0: z.number().int(),
  i1: z.number().int(),
  j0: z.number().int(),
  j1: z.number().int(),
  minX: z.number(),
  maxX: z.number(),
  minZ: z.number(),
  maxZ: z.number(),
  minY: z.number(),
  maxY: z.number(),
  drawable: z.boolean(),
  levels: z.number().int().positive(),
}) satisfies z.ZodType<ChunkInfo>;

const ChunkMeshSchema = z.object({
  chunkIndex: z.number().int(),
  level: z.number().int().nonnegative(),
  positions: z.instanceof(Float32Array),
  indices: z.instanceof(Uint32Array),
}) satisfies z.ZodType<ChunkMesh>;

const BiomeAnchorSchema = z.object({
  biome: BiomeIdSchema,
  x: z.number(),
  z: z.number(),
  areaM2: z.number(),
}) satisfies z.ZodType<BiomeAnchor>;

export const PreparedTerrainSchema = z.object({
  color: z.instanceof(Uint8Array),
  weights: z.instanceof(Uint8Array),
  height: z.instanceof(Uint16Array),
  chunks: z.array(ChunkInfoSchema),
  coarse: z.array(ChunkMeshSchema),
  anchors: z.array(BiomeAnchorSchema),
  maxHeightM: z.number(),
}) satisfies z.ZodType<PreparedTerrain>;

export const PrepRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prepare'),
    requestId: z.number().int(),
    /** Identifies this world for later highlight-mask requests. */
    worldId: z.number().int(),
    input: TerrainPrepInputSchema,
  }),
  z.object({
    type: z.literal('highlight-mask'),
    requestId: z.number().int(),
    worldId: z.number().int(),
    /** Indices into the world's biomeIds. */
    biomeIndices: z.array(z.number().int().min(0).max(255)),
  }),
]);
export type PrepRequest = z.infer<typeof PrepRequestSchema>;

export const PrepResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prepared'),
    requestId: z.number().int(),
    terrain: PreparedTerrainSchema,
  }),
  z.object({
    type: z.literal('mask'),
    requestId: z.number().int(),
    mask: z.instanceof(Uint8Array),
  }),
  z.object({ type: z.literal('error'), requestId: z.number().int(), message: z.string() }),
]);
export type PrepResponse = z.infer<typeof PrepResponseSchema>;
