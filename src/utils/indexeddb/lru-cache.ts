import { dbConnection } from './connection';
import { STORES, type CacheMetadata } from './schema';
import { AIModelRepository } from './repositories/ai-model-repository';

export interface LRUCacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxItems: number; // Maximum number of items
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class LRUCache {
  private config: Required<LRUCacheConfig>;
  private aiModelRepo: AIModelRepository;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: LRUCacheConfig) {
    this.config = {
      maxSize: config.maxSize,
      maxItems: config.maxItems,
      ttl: config.ttl || 24 * 60 * 60 * 1000, // 24 hours default
      cleanupInterval: config.cleanupInterval || 60 * 60 * 1000, // 1 hour default
    };

    this.aiModelRepo = new AIModelRepository();
    this.startCleanupTimer();
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get cache metadata for a key
   */
  private async getCacheMetadata(key: string): Promise<CacheMetadata | null> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      STORES.CACHE_METADATA,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, STORES.CACHE_METADATA);

        return new Promise<CacheMetadata | null>((resolve, reject) => {
          const request = store.get(key);

          request.onsuccess = () => {
            resolve(request.result || null);
          };

          request.onerror = () => {
            reject(new Error(`Failed to get cache metadata: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(metadata: CacheMetadata): Promise<void> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      STORES.CACHE_METADATA,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, STORES.CACHE_METADATA);

        return new Promise<void>((resolve, reject) => {
          const request = store.put(metadata);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(new Error(`Failed to update cache metadata: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Get all cache metadata sorted by priority and access time
   */
  private async getAllCacheMetadata(): Promise<CacheMetadata[]> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      STORES.CACHE_METADATA,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, STORES.CACHE_METADATA);

        return new Promise<CacheMetadata[]>((resolve, reject) => {
          const results: CacheMetadata[] = [];
          const request = store.openCursor();

          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              // Sort by priority (higher first) then by last accessed (older first for eviction)
              results.sort((a, b) => {
                if (a.priority !== b.priority) {
                  return b.priority - a.priority;
                }
                return a.lastAccessed.getTime() - b.lastAccessed.getTime();
              });
              resolve(results);
            }
          };

          request.onerror = () => {
            reject(new Error(`Failed to get cache metadata: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Calculate cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    totalItems: number;
    hitRate: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  }> {
    const allMetadata = await this.getAllCacheMetadata();

    if (allMetadata.length === 0) {
      return {
        totalSize: 0,
        totalItems: 0,
        hitRate: 0,
        oldestItem: null,
        newestItem: null
      };
    }

    const totalSize = allMetadata.reduce((sum, meta) => sum + meta.size, 0);
    const totalAccess = allMetadata.reduce((sum, meta) => sum + meta.accessCount, 0);
    const hitRate = totalAccess > 0 ? allMetadata.length / totalAccess : 0;

    const sortedByDate = [...allMetadata].sort((a, b) =>
      a.lastAccessed.getTime() - b.lastAccessed.getTime()
    );

    return {
      totalSize,
      totalItems: allMetadata.length,
      hitRate,
      oldestItem: sortedByDate[0]?.lastAccessed || null,
      newestItem: sortedByDate[sortedByDate.length - 1]?.lastAccessed || null
    };
  }

  /**
   * Check if cache needs eviction
   */
  private async needsEviction(): Promise<boolean> {
    const stats = await this.getCacheStats();
    return stats.totalSize > this.config.maxSize || stats.totalItems > this.config.maxItems;
  }

  /**
   * Evict least recently used items
   */
  async evictLRU(targetSize?: number, targetItems?: number): Promise<number> {
    const allMetadata = await this.getAllCacheMetadata();

    // Sort by priority (lower first) then by last accessed (older first)
    const sortedForEviction = allMetadata.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.lastAccessed.getTime() - b.lastAccessed.getTime();
    });

    const currentStats = await this.getCacheStats();
    const sizeTarget = targetSize || this.config.maxSize * 0.8; // Evict to 80% of max
    const itemsTarget = targetItems || this.config.maxItems * 0.8;

    let evictedCount = 0;
    let currentSize = currentStats.totalSize;
    let currentItems = currentStats.totalItems;

    for (const metadata of sortedForEviction) {
      if (currentSize <= sizeTarget && currentItems <= itemsTarget) {
        break;
      }

      try {
        // Delete from the actual store
        if (metadata.store === STORES.AI_MODELS) {
          await this.aiModelRepo.delete(metadata.key);
        }
        // Add other store deletions as needed

        // Delete metadata
        await this.deleteCacheMetadata(metadata.key);

        currentSize -= metadata.size;
        currentItems -= 1;
        evictedCount++;
      } catch (error) {
        console.error(`Failed to evict cache item ${metadata.key}:`, error);
      }
    }

    return evictedCount;
  }

  /**
   * Delete cache metadata
   */
  private async deleteCacheMetadata(key: string): Promise<void> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      STORES.CACHE_METADATA,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, STORES.CACHE_METADATA);

        return new Promise<void>((resolve, reject) => {
          const request = store.delete(key);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(new Error(`Failed to delete cache metadata: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Update access information for a cache item
   */
  async updateAccess(key: string, store: string): Promise<void> {
    const metadata = await this.getCacheMetadata(key);

    if (metadata) {
      const updatedMetadata: CacheMetadata = {
        ...metadata,
        lastAccessed: new Date(),
        accessCount: metadata.accessCount + 1
      };

      await this.updateCacheMetadata(updatedMetadata);
    }
  }

  /**
   * Add new item to cache with metadata
   */
  async addToCache(
    key: string,
    store: string,
    size: number,
    priority: number = 1,
    expiresAt?: Date
  ): Promise<void> {
    // Check if we need to evict first
    if (await this.needsEviction()) {
      await this.evictLRU();
    }

    const metadata: CacheMetadata = {
      key,
      store,
      size,
      lastAccessed: new Date(),
      accessCount: 1,
      priority,
      expiresAt
    };

    await this.updateCacheMetadata(metadata);
  }

  /**
   * Remove expired items
   */
  async removeExpired(): Promise<number> {
    const allMetadata = await this.getAllCacheMetadata();
    const now = new Date();
    let removedCount = 0;

    for (const metadata of allMetadata) {
      const isExpired = metadata.expiresAt && metadata.expiresAt < now;
      const isTTLExpired = now.getTime() - metadata.lastAccessed.getTime() > this.config.ttl;

      if (isExpired || isTTLExpired) {
        try {
          // Delete from the actual store
          if (metadata.store === STORES.AI_MODELS) {
            await this.aiModelRepo.delete(metadata.key);
          }
          // Add other store deletions as needed

          // Delete metadata
          await this.deleteCacheMetadata(metadata.key);
          removedCount++;
        } catch (error) {
          console.error(`Failed to remove expired cache item ${metadata.key}:`, error);
        }
      }
    }

    return removedCount;
  }

  /**
   * Perform cache cleanup (remove expired + evict if needed)
   */
  async cleanup(): Promise<{ expired: number; evicted: number }> {
    const expired = await this.removeExpired();
    let evicted = 0;

    if (await this.needsEviction()) {
      evicted = await this.evictLRU();
    }

    return { expired, evicted };
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    // Clear all AI models
    await this.aiModelRepo.clear();

    // Clear cache metadata
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      STORES.CACHE_METADATA,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, STORES.CACHE_METADATA);

        return new Promise<void>((resolve, reject) => {
          const request = store.clear();

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(new Error(`Failed to clear cache metadata: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Get cache item if it exists and is valid
   */
  async get(key: string): Promise<any | null> {
    const metadata = await this.getCacheMetadata(key);

    if (!metadata) {
      return null;
    }

    // Check if expired
    const now = new Date();
    const isExpired = metadata.expiresAt && metadata.expiresAt < now;
    const isTTLExpired = now.getTime() - metadata.lastAccessed.getTime() > this.config.ttl;

    if (isExpired || isTTLExpired) {
      // Remove expired item
      await this.deleteCacheMetadata(key);
      if (metadata.store === STORES.AI_MODELS) {
        await this.aiModelRepo.delete(key);
      }
      return null;
    }

    // Update access information
    await this.updateAccess(key, metadata.store);

    // Get the actual data
    if (metadata.store === STORES.AI_MODELS) {
      return this.aiModelRepo.getById(key);
    }

    return null;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
  }
}