import { AIAnalysisResult } from '../../types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  hash: string;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * In-memory cache with LRU eviction and TTL support
 */
export class ResponseCache<T = AIAnalysisResult> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats = {
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      compressionEnabled: false,
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * Get cached data by key
   */
  get(key: string): T | null {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.totalMisses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.totalMisses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.totalHits++;
    return entry.data;
  }

  /**
   * Set cached data with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 1,
      lastAccessed: now,
      hash: this.generateHash(data),
    };

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict least recently used entries if cache is full
    while (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete entry by key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.stats.totalRequests > 0
        ? this.stats.totalHits / this.stats.totalRequests
        : 0,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(content: string, type: string, userSkills?: string[]): string {
    const normalizedContent = content.trim().toLowerCase();
    const skillsStr = userSkills ? userSkills.sort().join(',') : '';
    const combined = `${type}:${normalizedContent}:${skillsStr}`;

    return this.hashString(combined);
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get entries sorted by access frequency
   */
  getPopularEntries(limit: number = 10): Array<{ key: string; accessCount: number; data: T }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        data: entry.data,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  /**
   * Export cache data for persistence
   */
  export(): Record<string, CacheEntry<T>> {
    const exported: Record<string, CacheEntry<T>> = {};

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        exported[key] = entry;
      }
    }

    return exported;
  }

  /**
   * Import cache data from persistence
   */
  import(data: Record<string, CacheEntry<T>>): void {
    this.cache.clear();

    for (const [key, entry] of Object.entries(data)) {
      if (!this.isExpired(entry)) {
        this.cache.set(key, entry);
      }
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private generateHash(data: T): string {
    return this.hashString(JSON.stringify(data));
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
}

/**
 * Persistent cache using IndexedDB
 */
export class PersistentResponseCache<T = AIAnalysisResult> {
  private memoryCache: ResponseCache<T>;
  private dbName: string;
  private storeName: string;
  private db?: IDBDatabase;

  constructor(
    dbName: string = 'gpt4o-cache',
    storeName: string = 'responses',
    config: Partial<CacheConfig> = {}
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.memoryCache = new ResponseCache<T>(config);
  }

  /**
   * Initialize the persistent cache
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadFromDB().then(() => resolve());
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached data (checks memory first, then IndexedDB)
   */
  async get(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      return memoryResult;
    }

    // Check IndexedDB
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && !this.isExpired(result)) {
          // Add to memory cache for faster future access
          this.memoryCache.set(key, result.data, result.ttl);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Set cached data (saves to both memory and IndexedDB)
   */
  async set(key: string, data: T, ttl?: number): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, data, ttl);

    // Set in IndexedDB
    if (!this.db) return;

    const entry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || 3600000,
      accessCount: 1,
      lastAccessed: Date.now(),
      hash: this.generateHash(data),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Delete entry from both caches
   */
  async delete(key: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key);

    if (!this.db) return memoryDeleted;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(memoryDeleted || request.result !== undefined);
    });
  }

  /**
   * Clear both caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get combined cache statistics
   */
  getStats(): CacheStats & { persistentSize: number } {
    const memoryStats = this.memoryCache.getStats();

    return {
      ...memoryStats,
      persistentSize: 0, // Would need to query IndexedDB for accurate count
    };
  }

  /**
   * Generate cache key
   */
  generateKey(content: string, type: string, userSkills?: string[]): string {
    return this.memoryCache.generateKey(content, type, userSkills);
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result;
        const validEntries: Record<string, CacheEntry<T>> = {};

        for (const entry of entries) {
          if (!this.isExpired(entry)) {
            validEntries[entry.key] = entry;
          }
        }

        this.memoryCache.import(validEntries);
        resolve();
      };
    });
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private generateHash(data: T): string {
    let hash = 0;
    const str = JSON.stringify(data);

    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }
}