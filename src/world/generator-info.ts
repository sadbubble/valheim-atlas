/**
 * Identity of the world generator (docs/DECISION.md: Path B, accepted 2026-09-28).
 * The UI must show an "Approximation" badge whenever IS_APPROXIMATION is true
 * (CLAUDE.md rule 4).
 */
export const GENERATOR_ID = 'approx-v1';
export const IS_APPROXIMATION = true;
export const IS_EXACT = !IS_APPROXIMATION;

/** Bump when generator code changes output, so cached worlds are invalidated. */
export const GENERATOR_REVISION = 1;

export const DEFAULT_RESOLUTION = 1024;
export const MIN_RESOLUTION = 64;
export const MAX_RESOLUTION = 2048;

export function assertResolution(resolution: number): void {
  if (!Number.isInteger(resolution) || resolution < MIN_RESOLUTION || resolution > MAX_RESOLUTION) {
    throw new RangeError(
      `Resolution must be an integer in [${MIN_RESOLUTION}, ${MAX_RESOLUTION}], got ${resolution}`,
    );
  }
}
