import { z } from 'zod';
import { BiomeIdSchema } from '../data/schema';
import { GENERATOR_ID } from './generator-info';

export const PlacedLocationSchema = z.object({
  /** Unique within the world, e.g. "troll-cave-17". */
  id: z.string(),
  /** LocationType id from public/data/locations.json. */
  type: z.string(),
  x: z.number(),
  z: z.number(),
  biomeId: BiomeIdSchema,
});
export type PlacedLocation = z.infer<typeof PlacedLocationSchema>;

export const PlacementReportSchema = z.object({
  type: z.string(),
  /** Instances we tried to place (quantity, or 1 for unique types); null = unknown. */
  wanted: z.number().int().nullable(),
  placed: z.number().int().nonnegative(),
  note: z.string().optional(),
});
export type PlacementReport = z.infer<typeof PlacementReportSchema>;

export const GeneratedWorldSchema = z
  .object({
    seed: z.string(),
    generator: z.literal(GENERATOR_ID),
    isApproximation: z.boolean(),
    resolution: z.number().int().positive(),
    /** The grid covers [-extentM, extentM]² metres; row 0 = north, column 0 = west. */
    extentM: z.number().positive(),
    cellSizeM: z.number().positive(),
    /** Ground height in metres, row-major, resolution². */
    height: z.instanceof(Float32Array),
    /** Index into `biomeIds`, row-major, resolution². */
    biomes: z.instanceof(Uint8Array),
    biomeIds: z.array(BiomeIdSchema),
    locations: z.array(PlacedLocationSchema),
    placementReport: z.array(PlacementReportSchema),
  })
  .refine(
    (w) =>
      w.height.length === w.resolution * w.resolution &&
      w.biomes.length === w.resolution * w.resolution,
    { message: 'height/biomes length must equal resolution²' },
  );
export type GeneratedWorld = z.infer<typeof GeneratedWorldSchema>;
