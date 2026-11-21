import { CustomCategory, RoomData } from '../types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  updatedAt: number;
}

/**
 * Bounded in-memory + optional localStorage TTL cache.
 * Uses LRU eviction on insertion to keep storage compact and deterministic.
 */
export class TtlCache<T> {
  private memory = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly storageKey: string | null;
  private hydratedFromStorage = false;

  constructor(options: { defaultTtlMs: number; maxEntries?: number; storageKey?: string }) {
    this.defaultTtlMs = options.defaultTtlMs;
    this.maxEntries = options.maxEntries ?? 120;
    this.storageKey = options.storageKey ?? null;
  }

  private hydrate(): void {
    if (this.hydratedFromStorage || !this.storageKey) return;
    this.hydratedFromStorage = true;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CacheEntry<T>>;
      const now = Date.now();
      for (const [k, entry] of Object.entries(parsed)) {
        if (entry && typeof entry.expiresAt === 'number' && entry.expiresAt > now) {
          this.memory.set(k, entry);
        }
      }
    } catch {
      // Ignore malformed storage entries
    }
  }

  private persist(): void {
    if (!this.storageKey) return;
    try {
      const obj: Record<string, CacheEntry<T>> = {};
      this.memory.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // Ignore quota errors
    }
  }

  get(key: string): T | null {
    this.hydrate();
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      this.persist();
      return null;
    }
    // Refresh LRU order
    this.memory.delete(key);
    this.memory.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.hydrate();
    const now = Date.now();
    if (this.memory.has(key)) {
      this.memory.delete(key);
    } else if (this.memory.size >= this.maxEntries) {
      const oldestKey = this.memory.keys().next().value;
      if (oldestKey !== undefined) {
        this.memory.delete(oldestKey);
      }
    }
    this.memory.set(key, {
      value,
      updatedAt: now,
      expiresAt: now + ttlMs
    });
    this.persist();
  }

  invalidate(key: string): void {
    this.hydrate();
    if (this.memory.delete(key)) {
      this.persist();
    }
  }

  clear(): void {
    this.memory.clear();
    this.hydratedFromStorage = true;
    if (this.storageKey) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
    }
  }
}

export interface CachedUserProfile {
  name?: string;
  avatar?: string;
  friendCode?: string;
}

// 5-minute TTL cache for agent profiles (avoids redundant N+1 user node reads)
export const userProfileCache = new TtlCache<CachedUserProfile>({
  defaultTtlMs: 5 * 60 * 1000,
  maxEntries: 200,
  storageKey: 'spy_station_profile_cache_v1'
});

// 10-minute TTL cache for immutable friendCode -> uid resolution
export const friendCodeCache = new TtlCache<string>({
  defaultTtlMs: 10 * 60 * 1000,
  maxEntries: 100,
  storageKey: 'spy_station_friend_code_cache_v1'
});

// 60-second Stale-While-Revalidate cache for public rooms list (instant StationsTab render)
export const publicRoomsCache = new TtlCache<Record<string, RoomData>>({
  defaultTtlMs: 60 * 1000,
  maxEntries: 4,
  storageKey: 'spy_station_public_rooms_cache_v1'
});

// 2-minute Stale-While-Revalidate cache for published community & user custom categories
export const customCategoriesCache = new TtlCache<Record<string, CustomCategory>>({
  defaultTtlMs: 2 * 60 * 1000,
  maxEntries: 6,
  storageKey: 'spy_station_custom_cats_cache_v1'
});
