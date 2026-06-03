/**
 * Redis-backed cache with in-memory fallback.
 * Provides the same API as the previous in-memory cache so all consumers work unchanged.
 *
 * Environment variables:
 *   - REDIS_URL (optional, default: redis://localhost:6379)
 *   - REDIS_ENABLED (optional, set to "false" to force in-memory mode)
 */

import Redis from "ioredis";

const DEFAULT_TTL_MS = 60_000; // 1 minute

// ── In-memory fallback store ──
interface MemoryEntry<T> {
  data: T;
  expiresAt: number;
}
const memoryStore = new Map<string, MemoryEntry<any>>();

// ── Redis client (lazy-init) ──
let redis: Redis | null = null;
let redisAvailable = false;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redisAvailable ? redis : null;

  redisInitialized = true;

  if (process.env.REDIS_ENABLED === "false") {
    console.log("[cache] Redis disabled via REDIS_ENABLED=false, using in-memory cache");
    return null;
  }

  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // give up after 3 retries
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
    });

    // Don't block startup — mark available on success, fall back silently on failure
    redis.connect().then(() => {
      redisAvailable = true;
      console.log("[cache] Redis connected");
    }).catch((err) => {
      redisAvailable = false;
      redis = null;
      console.warn("[cache] Redis unavailable, falling back to in-memory cache:", err.message);
    });

    return redis;
  } catch {
    console.warn("[cache] Failed to create Redis client, using in-memory cache");
    return null;
  }
}

// ── Public API ──

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();

  if (client) {
    try {
      const raw = await client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      // Fall through to in-memory on Redis error
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export async function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  const client = getRedis();

  if (client) {
    try {
      const json = JSON.stringify(data);
      await client.set(key, json, "PX", ttlMs);
      return;
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  memoryStore.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function clearCache(pattern?: string): Promise<void> {
  const client = getRedis();

  if (client) {
    try {
      if (pattern) {
        // SCAN is preferred for production; KEYS is fine for dev with small datasets
        const keys = await client.keys(`${pattern}*`);
        if (keys.length > 0) await client.del(...keys);
      } else {
        await client.flushdb();
      }
      return;
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  if (!pattern) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.includes(pattern)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Wraps an async function with caching. If the data is cached, returns it.
 * Otherwise calls the fetch function, caches the result, and returns it.
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await setCache(key, data, ttlMs);
  return data;
}
