/**
 * 缓存管理专用Web Worker
 * 负责IndexedDB操作、数据同步、缓存策略管理等
 */

import type {
  PerformanceMetrics
} from '../types';

// Worker消息类型定义
export interface CacheWorkerMessage {
  type: 'STORE_DATA' | 'LOAD_DATA' | 'DELETE_DATA' | 'CLEAR_CACHE' | 'SYNC_DATA' | 'GET_STATS' | 'OPTIMIZE_CACHE';
  payload: {
    id: string;
    operation?: CacheOperation;
    key?: string;
    data?: unknown;
    metadata?: CacheMetadata;
    syncConfig?: SyncConfig;
  };
}

export interface CacheWorkerResponse {
  type: 'DATA_STORED' | 'DATA_LOADED' | 'DATA_DELETED' | 'CACHE_CLEARED' | 'SYNC_COMPLETE' | 'STATS_RETRIEVED' | 'CACHE_OPTIMIZED' | 'ERROR';
  payload: {
    id: string;
    result?: unknown;
    stats?: CacheStats;
    error?: CacheError;
    performanceMetrics?: PerformanceMetrics;
  };
}

export interface CacheOperation {
  store: string; // IndexedDB store name
  action: 'get' | 'put' | 'delete' | 'clear' | 'getAll';
  key?: string;
  data?: unknown;
  index?: string;
  range?: IDBKeyRange;
}

export interface CacheMetadata {
  version: string;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface SyncConfig {
  strategy: 'immediate' | 'batch' | 'scheduled';
  batchSize?: number;
  interval?: number;
  retryCount?: number;
  conflictResolution?: 'client-wins' | 'server-wins' | 'merge';
}

export interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  missRate: number;
  stores: StoreStats[];
  memoryUsage: number;
  lastOptimized: Date;
}

export interface StoreStats {
  name: string;
  itemCount: number;
  size: number;
  oldestItem: Date;
  newestItem: Date;
}

export interface CacheError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  retryAfter?: number;
}

// IndexedDB数据库配置
const DB_NAME = 'ResumeGeneratorDB';
const DB_VERSION = 1;

const STORES = {
  users: 'users',
  jobDescriptions: 'jobDescriptions',
  analysisResults: 'analysisResults',
  aiModels: 'aiModels',
  performanceMetrics: 'performanceMetrics',
  cache: 'cache'
} as const;

// LRU缓存管理器
class CacheLRUManager {
  private accessLog = new Map<string, { timestamp: number; count: number }>();
  private maxSize: number;
  private cleanupThreshold: number;

  constructor(maxSize = 1000, cleanupThreshold = 0.8) {
    this.maxSize = maxSize;
    this.cleanupThreshold = cleanupThreshold;
  }

  recordAccess(key: string): void {
    const now = Date.now();
    const existing = this.accessLog.get(key);

    if (existing) {
      this.accessLog.set(key, {
        timestamp: now,
        count: existing.count + 1
      });
    } else {
      this.accessLog.set(key, {
        timestamp: now,
        count: 1
      });
    }

    // 检查是否需要清理
    if (this.accessLog.size > this.maxSize * this.cleanupThreshold) {
      this.cleanup();
    }
  }

  getAccessInfo(key: string) {
    return this.accessLog.get(key);
  }

  getLeastRecentlyUsed(count: number): string[] {
    const entries = Array.from(this.accessLog.entries());
    entries.sort((a, b) => {
      // 首先按访问时间排序，然后按访问次数排序
      const timeDiff = a[1].timestamp - b[1].timestamp;
      if (timeDiff !== 0) return timeDiff;
      return a[1].count - b[1].count;
    });

    return entries.slice(0, count).map(([key]) => key);
  }

  private cleanup(): void {
    const entriesToRemove = Math.floor(this.maxSize * 0.2); // 清理20%的条目
    const lruKeys = this.getLeastRecentlyUsed(entriesToRemove);

    lruKeys.forEach(key => {
      this.accessLog.delete(key);
    });
  }

  clear(): void {
    this.accessLog.clear();
  }

  size(): number {
    return this.accessLog.size;
  }
}

// 数据库管理器
class DatabaseManager {
  private db: IDBDatabase | null = null;
  private lruManager = new CacheLRUManager();
  private stats: CacheStats = {
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    missRate: 0,
    stores: [],
    memoryUsage: 0,
    lastOptimized: new Date()
  };

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`数据库打开失败: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建用户存储
        if (!db.objectStoreNames.contains(STORES.users)) {
          const userStore = db.createObjectStore(STORES.users, { keyPath: 'id' });
          userStore.createIndex('email', 'profile.email', { unique: true });
          userStore.createIndex('createdAt', 'createdAt');
        }

        // 创建岗位描述存储
        if (!db.objectStoreNames.contains(STORES.jobDescriptions)) {
          const jobStore = db.createObjectStore(STORES.jobDescriptions, { keyPath: 'id' });
          jobStore.createIndex('title', 'title');
          jobStore.createIndex('company', 'company');
          jobStore.createIndex('analyzedAt', 'analyzedAt');
        }

        // 创建分析结果存储
        if (!db.objectStoreNames.contains(STORES.analysisResults)) {
          const analysisStore = db.createObjectStore(STORES.analysisResults, { keyPath: 'id' });
          analysisStore.createIndex('userId', 'userId');
          analysisStore.createIndex('jobId', 'jobId');
          analysisStore.createIndex('matchScore', 'matchScore');
          analysisStore.createIndex('createdAt', 'createdAt');
        }

        // 创建AI模型存储
        if (!db.objectStoreNames.contains(STORES.aiModels)) {
          const modelStore = db.createObjectStore(STORES.aiModels, { keyPath: 'id' });
          modelStore.createIndex('version', 'metadata.version');
          modelStore.createIndex('size', 'metadata.size');
        }

        // 创建性能指标存储
        if (!db.objectStoreNames.contains(STORES.performanceMetrics)) {
          const metricsStore = db.createObjectStore(STORES.performanceMetrics, { keyPath: 'id' });
          metricsStore.createIndex('timestamp', 'timestamp');
          metricsStore.createIndex('operation', 'operation');
        }

        // 创建通用缓存存储
        if (!db.objectStoreNames.contains(STORES.cache)) {
          const cacheStore = db.createObjectStore(STORES.cache, { keyPath: 'key' });
          cacheStore.createIndex('createdAt', 'metadata.createdAt');
          cacheStore.createIndex('lastAccessed', 'metadata.lastAccessed');
          cacheStore.createIndex('priority', 'metadata.priority');
          cacheStore.createIndex('tags', 'metadata.tags', { multiEntry: true });
        }
      };
    });
  }

  async storeData(operation: CacheOperation, metadata?: CacheMetadata): Promise<unknown> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const transaction = this.db.transaction([operation.store], 'readwrite');
    const store = transaction.objectStore(operation.store);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      switch (operation.action) {
        case 'put':
          if (metadata) {
            const dataWithMetadata = Object.assign({}, operation.data, {
              metadata: Object.assign({}, metadata, {
                lastAccessed: new Date(),
                accessCount: (metadata.accessCount || 0) + 1
              })
            });
            request = store.put(dataWithMetadata);
          } else {
            request = store.put(operation.data);
          }
          break;

        case 'get':
          request = store.get(operation.key!);
          break;

        case 'delete':
          request = store.delete(operation.key!);
          break;

        case 'clear':
          request = store.clear();
          break;

        case 'getAll':
          if (operation.index && operation.range) {
            const index = store.index(operation.index);
            request = index.getAll(operation.range);
          } else {
            request = store.getAll();
          }
          break;

        default:
          reject(new Error(`不支持的操作: ${operation.action}`));
          return;
      }

      request.onsuccess = () => {
        const result = request.result;

        // 记录访问日志
        if (operation.action === 'get' && operation.key) {
          this.lruManager.recordAccess(operation.key);
          this.updateStats('hit');
        } else if (operation.action === 'get' && !result) {
          this.updateStats('miss');
        }

        resolve(result);
      };

      request.onerror = () => {
        reject(new Error(`数据库操作失败: ${request.error?.message}`));
      };
    });
  }

  async optimizeCache(): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    // 获取缓存存储中的所有数据
    const cacheData = await this.storeData({
      store: STORES.cache,
      action: 'getAll'
    }) as Array<{ key: string; metadata: CacheMetadata }>;

    const now = Date.now();
    const expiredKeys: string[] = [];
    const lowPriorityKeys: string[] = [];

    // 识别过期和低优先级数据
    cacheData.forEach(item => {
      const { key, metadata } = item;

      // 检查TTL过期
      if (metadata.ttl && (now - metadata.createdAt.getTime()) > metadata.ttl) {
        expiredKeys.push(key);
      }

      // 检查低优先级且长时间未访问的数据
      const daysSinceAccess = (now - metadata.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      if (metadata.priority === 'low' && daysSinceAccess > 7) {
        lowPriorityKeys.push(key);
      }
    });

    // 删除过期数据
    for (const key of expiredKeys) {
      await this.storeData({
        store: STORES.cache,
        action: 'delete',
        key
      });
    }

    // 根据LRU策略删除部分低优先级数据
    const lruKeys = this.lruManager.getLeastRecentlyUsed(Math.min(lowPriorityKeys.length, 50));
    for (const key of lruKeys) {
      if (lowPriorityKeys.includes(key)) {
        await this.storeData({
          store: STORES.cache,
          action: 'delete',
          key
        });
      }
    }

    this.stats.lastOptimized = new Date();
  }

  async getStats(): Promise<CacheStats> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const storeStats: StoreStats[] = [];

    for (const storeName of Object.values(STORES)) {
      try {
        const data = await this.storeData({
          store: storeName,
          action: 'getAll'
        }) as unknown[];

        if (data && Array.isArray(data)) {
          const dates = data
            .map(item => {
              if (typeof item === 'object' && item !== null) {
                const obj = item as any;
                return obj.createdAt || obj.metadata?.createdAt;
              }
              return null;
            })
            .filter(date => date !== null)
            .map(date => new Date(date));

          storeStats.push({
            name: storeName,
            itemCount: data.length,
            size: JSON.stringify(data).length, // 粗略估算
            oldestItem: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(),
            newestItem: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date()
          });
        }
      } catch (error) {
        console.warn(`获取存储 ${storeName} 统计信息失败:`, error);
      }
    }

    const totalItems = storeStats.reduce((sum, store) => sum + store.itemCount, 0);
    const totalSize = storeStats.reduce((sum, store) => sum + store.size, 0);

    this.stats = Object.assign({}, this.stats, {
      totalSize,
      itemCount: totalItems,
      stores: storeStats,
      memoryUsage: this.estimateMemoryUsage()
    });

    return this.stats;
  }

  private updateStats(type: 'hit' | 'miss'): void {
    const total = this.stats.hitRate + this.stats.missRate + 1;

    if (type === 'hit') {
      this.stats.hitRate = (this.stats.hitRate + 1) / total;
      this.stats.missRate = this.stats.missRate / total;
    } else {
      this.stats.missRate = (this.stats.missRate + 1) / total;
      this.stats.hitRate = this.stats.hitRate / total;
    }
  }

  private estimateMemoryUsage(): number {
    // 粗略估算内存使用量（字节）
    return this.lruManager.size() * 100 + this.stats.totalSize;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.lruManager.clear();
  }
}

// Worker实例
const dbManager = new DatabaseManager();
let isInitialized = false;

// 初始化数据库
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await dbManager.initialize();
    isInitialized = true;
  }
}

// 发送错误信息
function sendError(id: string, error: CacheError): void {
  const response: CacheWorkerResponse = {
    type: 'ERROR',
    payload: {
      id,
      error
    }
  };
  self.postMessage(response);
}

// 数据存储处理
async function handleStoreData(id: string, operation: CacheOperation, metadata?: CacheMetadata): Promise<void> {
  const startTime = Date.now();

  try {
    await ensureInitialized();
    const result = await dbManager.storeData(operation, metadata);

    const response: CacheWorkerResponse = {
      type: 'DATA_STORED',
      payload: {
        id,
        result,
        performanceMetrics: {
          loadTime: 0,
          aiProcessingTime: 0,
          renderTime: 0,
          memoryUsage: 0,
          cacheHitRate: Date.now() - startTime
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'STORE_ERROR',
      message: error instanceof Error ? error.message : '数据存储失败',
      details: error,
      recoverable: true
    });
  }
}

// 数据加载处理
async function handleLoadData(id: string, operation: CacheOperation): Promise<void> {
  const startTime = Date.now();

  try {
    await ensureInitialized();
    const result = await dbManager.storeData(operation);

    const response: CacheWorkerResponse = {
      type: 'DATA_LOADED',
      payload: {
        id,
        result,
        performanceMetrics: {
          loadTime: Date.now() - startTime,
          aiProcessingTime: 0,
          renderTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'LOAD_ERROR',
      message: error instanceof Error ? error.message : '数据加载失败',
      details: error,
      recoverable: true
    });
  }
}

// 数据删除处理
async function handleDeleteData(id: string, operation: CacheOperation): Promise<void> {
  try {
    await ensureInitialized();
    const result = await dbManager.storeData(operation);

    const response: CacheWorkerResponse = {
      type: 'DATA_DELETED',
      payload: {
        id,
        result
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'DELETE_ERROR',
      message: error instanceof Error ? error.message : '数据删除失败',
      details: error,
      recoverable: true
    });
  }
}

// 缓存清理处理
async function handleClearCache(id: string, operation?: CacheOperation): Promise<void> {
  try {
    await ensureInitialized();

    if (operation) {
      await dbManager.storeData(operation);
    } else {
      // 清理所有存储
      for (const storeName of Object.values(STORES)) {
        await dbManager.storeData({
          store: storeName,
          action: 'clear'
        });
      }
    }

    const response: CacheWorkerResponse = {
      type: 'CACHE_CLEARED',
      payload: {
        id,
        result: true
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'CLEAR_ERROR',
      message: error instanceof Error ? error.message : '缓存清理失败',
      details: error,
      recoverable: true
    });
  }
}

// 数据同步处理
async function handleSyncData(id: string, syncConfig: SyncConfig): Promise<void> {
  try {
    await ensureInitialized();

    // 这里应该实现实际的同步逻辑
    // 目前只是模拟同步过程
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response: CacheWorkerResponse = {
      type: 'SYNC_COMPLETE',
      payload: {
        id,
        result: {
          synced: true,
          strategy: syncConfig.strategy,
          timestamp: new Date()
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'SYNC_ERROR',
      message: error instanceof Error ? error.message : '数据同步失败',
      details: error,
      recoverable: true,
      retryAfter: 5000 // 5秒后重试
    });
  }
}

// 获取统计信息处理
async function handleGetStats(id: string): Promise<void> {
  try {
    await ensureInitialized();
    const stats = await dbManager.getStats();

    const response: CacheWorkerResponse = {
      type: 'STATS_RETRIEVED',
      payload: {
        id,
        stats
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'STATS_ERROR',
      message: error instanceof Error ? error.message : '获取统计信息失败',
      details: error,
      recoverable: true
    });
  }
}

// 缓存优化处理
async function handleOptimizeCache(id: string): Promise<void> {
  try {
    await ensureInitialized();
    await dbManager.optimizeCache();

    const response: CacheWorkerResponse = {
      type: 'CACHE_OPTIMIZED',
      payload: {
        id,
        result: {
          optimized: true,
          timestamp: new Date()
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'OPTIMIZE_ERROR',
      message: error instanceof Error ? error.message : '缓存优化失败',
      details: error,
      recoverable: true
    });
  }
}

// 消息处理器
self.onmessage = async (event: MessageEvent<CacheWorkerMessage>) => {
  const { type, payload } = event.data;
  const { id } = payload;

  try {
    switch (type) {
      case 'STORE_DATA':
        if (payload.operation) {
          await handleStoreData(id, payload.operation, payload.metadata);
        } else {
          throw new Error('缺少存储操作参数');
        }
        break;

      case 'LOAD_DATA':
        if (payload.operation) {
          await handleLoadData(id, payload.operation);
        } else {
          throw new Error('缺少加载操作参数');
        }
        break;

      case 'DELETE_DATA':
        if (payload.operation) {
          await handleDeleteData(id, payload.operation);
        } else {
          throw new Error('缺少删除操作参数');
        }
        break;

      case 'CLEAR_CACHE':
        await handleClearCache(id, payload.operation);
        break;

      case 'SYNC_DATA':
        if (payload.syncConfig) {
          await handleSyncData(id, payload.syncConfig);
        } else {
          throw new Error('缺少同步配置参数');
        }
        break;

      case 'GET_STATS':
        await handleGetStats(id);
        break;

      case 'OPTIMIZE_CACHE':
        await handleOptimizeCache(id);
        break;

      default:
        throw new Error(`未知的消息类型: ${type}`);
    }
  } catch (error) {
    sendError(id, {
      code: 'WORKER_ERROR',
      message: error instanceof Error ? error.message : 'Cache Worker处理失败',
      details: error,
      recoverable: false
    });
  }
};

// 清理资源
self.onbeforeunload = () => {
  dbManager.close();
};

// 导出类型供主线程使用
export type {
  CacheWorkerMessage as CacheMessage,
  CacheWorkerResponse as CacheResponse,
  CacheOperation as CacheOp,
  CacheMetadata as CacheMeta,
  SyncConfig as SyncConf,
  CacheStats as CacheStatistics,
  CacheError as CacheErr
};