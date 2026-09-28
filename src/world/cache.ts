import { GeneratedWorldSchema, type GeneratedWorld } from './types';

export interface WorldCache {
  get(key: string): Promise<GeneratedWorld | undefined>;
  put(key: string, world: GeneratedWorld): Promise<void>;
}

const WORLDS = 'worlds';
const META = 'meta';
const KEYS = 'keys';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

export interface IndexedDbCacheOptions {
  dbName?: string;
  /** Oldest entries are evicted beyond this many worlds (each 1024² world ≈ 5 MB). */
  maxEntries?: number;
  factory?: IDBFactory;
}

/**
 * Caches generated worlds by key in IndexedDB. Best-effort: returns null when IndexedDB
 * is unavailable, and callers should treat any rejection as a cache miss.
 */
export function createIndexedDbCache(options: IndexedDbCacheOptions = {}): WorldCache | null {
  const factory = options.factory ?? ('indexedDB' in globalThis ? globalThis.indexedDB : undefined);
  if (!factory) return null;
  const dbName = options.dbName ?? 'valheim-atlas';
  const maxEntries = options.maxEntries ?? 6;

  let dbPromise: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(WORLDS);
        req.result.createObjectStore(META);
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error('Could not open IndexedDB'));
      };
    });
    return dbPromise;
  };

  return {
    async get(key) {
      const db = await open();
      const tx = db.transaction(WORLDS, 'readonly');
      const value: unknown = await request(tx.objectStore(WORLDS).get(key));
      if (value === undefined) return undefined;
      const parsed = GeneratedWorldSchema.safeParse(value);
      return parsed.success ? parsed.data : undefined;
    },
    async put(key, world) {
      const db = await open();
      const tx = db.transaction([WORLDS, META], 'readwrite');
      const worlds = tx.objectStore(WORLDS);
      const meta = tx.objectStore(META);
      const stored: unknown = await request(meta.get(KEYS));
      const keys = Array.isArray(stored)
        ? stored.filter((k): k is string => typeof k === 'string' && k !== key)
        : [];
      keys.push(key);
      while (keys.length > maxEntries) {
        const oldest = keys.shift();
        if (oldest !== undefined) worlds.delete(oldest);
      }
      worlds.put(world, key);
      meta.put(keys, KEYS);
      await done(tx);
    },
  };
}
