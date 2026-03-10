import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.glassnode-terminal', 'cache');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheFilePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Read a cached value. Returns null if cache is missing or expired.
 */
export function readCache<T>(key: string): T | null {
  const filePath = cacheFilePath(key);
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ONE_DAY_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Write a value to the cache.
 */
export function writeCache<T>(key: string, data: T): void {
  ensureCacheDir();
  const entry: CacheEntry<T> = { timestamp: Date.now(), data };
  writeFileSync(cacheFilePath(key), JSON.stringify(entry), 'utf-8');
}
