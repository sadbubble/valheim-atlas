import type { WorldConstants } from '../data/schema';
import type { GeneratedWorld } from '../world/types';
import type { PreparedTerrain } from './terrain-prep';
import { PrepResponseSchema, type PrepRequest, type PrepResponse } from './terrain-prep-protocol';

export interface PreparedWorld {
  /** Pass to {@link TerrainPrepClient.highlightMask} for this world. */
  worldId: number;
  terrain: PreparedTerrain;
}

export interface TerrainPrepClient {
  prepare(world: GeneratedWorld, constants: WorldConstants): Promise<PreparedWorld>;
  /** Blurred highlight mask (R8, resolution²) for the given biome indices of a prepared world. */
  highlightMask(worldId: number, biomeIndices: readonly number[]): Promise<Uint8Array>;
  dispose(): void;
}

type Settled = Exclude<PrepResponse, { type: 'error' }>;

/** Main-thread wrapper around the terrain-prep Web Worker. */
export function createTerrainPrepClient(): TerrainPrepClient {
  const worker = new Worker(new URL('./terrain-prep-worker.ts', import.meta.url), {
    type: 'module',
  });
  let nextId = 0;
  let nextWorld = 0;
  const pending = new Map<number, { resolve: (r: Settled) => void; reject: (e: Error) => void }>();

  const failAll = (message: string) => {
    for (const p of pending.values()) p.reject(new Error(message));
    pending.clear();
  };
  worker.addEventListener('error', (event) => {
    failAll(`Terrain-prep worker crashed: ${event.message}`);
  });
  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    const parsed = PrepResponseSchema.safeParse(event.data);
    if (!parsed.success) {
      failAll(`Invalid message from terrain-prep worker: ${parsed.error.message}`);
      return;
    }
    const msg = parsed.data;
    if (msg.type === 'error' && msg.requestId === -1) {
      failAll(msg.message);
      return;
    }
    const p = pending.get(msg.requestId);
    if (!p) return;
    pending.delete(msg.requestId);
    if (msg.type === 'error') p.reject(new Error(msg.message));
    else p.resolve(msg);
  });

  const send = (req: PrepRequest): Promise<Settled> =>
    new Promise((resolve, reject) => {
      pending.set(req.requestId, { resolve, reject });
      // No transfer list: the main thread keeps its copy of the world (picking, props).
      worker.postMessage(req);
    });

  return {
    async prepare(world, constants) {
      const worldId = nextWorld++;
      const res = await send({
        type: 'prepare',
        requestId: nextId++,
        worldId,
        input: {
          resolution: world.resolution,
          extentM: world.extentM,
          cellSizeM: world.cellSizeM,
          height: world.height,
          biomes: world.biomes,
          biomeIds: world.biomeIds,
          seaLevelM: constants.seaLevelM,
          waterEdgeM: constants.waterEdgeM,
          worldRadiusM: constants.worldRadiusM,
        },
      });
      if (res.type !== 'prepared') throw new Error(`Unexpected reply: ${res.type}`);
      return { worldId, terrain: res.terrain };
    },
    async highlightMask(worldId, biomeIndices) {
      const res = await send({
        type: 'highlight-mask',
        requestId: nextId++,
        worldId,
        biomeIndices: [...biomeIndices],
      });
      if (res.type !== 'mask') throw new Error(`Unexpected reply: ${res.type}`);
      return res.mask;
    },
    dispose() {
      worker.terminate();
      failAll('Terrain-prep worker disposed');
    },
  };
}

let shared: TerrainPrepClient | null = null;

/** The app's single terrain-prep worker (started on first use). */
export function terrainPrepClient(): TerrainPrepClient {
  shared ??= createTerrainPrepClient();
  return shared;
}

export function disposeTerrainPrepWorker(): void {
  shared?.dispose();
  shared = null;
}
