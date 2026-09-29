import { buildHighlightMask } from './highlight-mask';
import { RENDER } from './render-config';
import { preparedTransferables, prepareTerrainSync } from './terrain-prep';
import type { PrepRequest, PrepResponse } from './terrain-prep-protocol';

export type PrepEmit = (res: PrepResponse, transfer?: Transferable[]) => void;

/** What the worker remembers between requests: the last world's biome grid, for masks. */
export interface PrepWorkerState {
  world: { id: number; resolution: number; biomes: Uint8Array } | null;
}

/** Pure request handler, kept separate from the worker entry so it can be unit-tested. */
export function handlePrepRequest(req: PrepRequest, state: PrepWorkerState, emit: PrepEmit): void {
  switch (req.type) {
    case 'prepare': {
      const terrain = prepareTerrainSync(req.input);
      state.world = { id: req.worldId, resolution: req.input.resolution, biomes: req.input.biomes };
      emit({ type: 'prepared', requestId: req.requestId, terrain }, preparedTransferables(terrain));
      return;
    }
    case 'highlight-mask': {
      const w = state.world;
      if (w?.id !== req.worldId) {
        emit({ type: 'error', requestId: req.requestId, message: 'Unknown or replaced world' });
        return;
      }
      const { maskBlurCells, maskBlurPasses } = RENDER.highlight;
      const mask = buildHighlightMask(
        w.biomes,
        w.resolution,
        req.biomeIndices,
        maskBlurCells,
        maskBlurPasses,
      );
      emit({ type: 'mask', requestId: req.requestId, mask }, [mask.buffer]);
      return;
    }
  }
}
