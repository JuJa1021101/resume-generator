/**
 * Worker模块入口文件
 * 导出所有Worker相关的类型、工具和管理器
 */

import { getWorkerManager, type WorkerManager } from './worker-manager';
import type { AIEngineConfig } from './ai-worker';

// Worker管理器
export {
  WorkerManager,
  getWorkerManager,
  terminateWorkerManager
} from './worker-manager';

// AI Worker类型和接口
export type {
  AIWorkerMessage,
  AIWorkerResponse,
  ProgressUpdate,
  WorkerError as AIWorkerError,
  BatchProcessData,
  BatchProcessResult
} from './ai-worker';

export type { AIEngineConfig } from './ai-worker';

// Cache Worker类型和接口
export type {
  CacheMessage as CacheWorkerMessage,
  CacheResponse as CacheWorkerResponse,
  CacheOp as CacheOperation,
  CacheMeta as CacheMetadata,
  SyncConf as SyncConfig,
  CacheStatistics as CacheStats,
  CacheErr as CacheError
} from './cache-worker';

// Worker管理器类型
export type {
  WorkerInstance,
  WorkerMessage,
  WorkerRequest,
  WorkerManagerConfig,
  WorkerPerformanceMetrics,
  WorkerErrorInfo
} from './worker-manager';

// 工具类和函数
export {
  DataSerializer,
  ChunkManager,
  PerformanceMonitor,
  ErrorHandler,
  chunkManager,
  performanceMonitor,
  errorHandler,
  isTransferableSupported,
  estimateDataSize,
  shouldUseChunking
} from './worker-utils';

// 工具类型
export type {
  TransferOptions,
  ChunkedData,
  CompressionResult
} from './worker-utils';

// 便捷的Worker操作封装
export class WorkerService {
  private static instance: WorkerService | null = null;
  private workerManager: WorkerManager;

  private constructor() {
    this.workerManager = getWorkerManager();
  }

  static getInstance(): WorkerService {
    if (!WorkerService.instance) {
      WorkerService.instance = new WorkerService();
    }
    return WorkerService.instance;
  }

  // AI相关操作
  async analyzeJobDescription(content: string, config?: Partial<AIEngineConfig>) {
    const defaultConfig: AIEngineConfig = {
      provider: 'transformers',
      maxTokens: 2048,
      temperature: 0.7,
      timeout: 30000,
      ...config
    };

    return this.workerManager.analyzeJD(content, defaultConfig);
  }

  async extractKeywords(content: string, config?: Partial<AIEngineConfig>) {
    const defaultConfig: AIEngineConfig = {
      provider: 'transformers',
      maxTokens: 1024,
      temperature: 0.5,
      timeout: 15000,
      ...config
    };

    return this.workerManager.generateKeywords(content, defaultConfig);
  }

  async calculateSkillMatch(jobDescription: any, userSkills: any[]) {
    return this.workerManager.matchSkills(jobDescription, userSkills);
  }

  // 缓存相关操作
  async saveUserData(userId: string, userData: any) {
    return this.workerManager.storeData({
      store: 'users',
      action: 'put',
      key: userId,
      data: userData
    }, {
      version: '1.0',
      size: JSON.stringify(userData).length,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      priority: 'high'
    });
  }

  async loadUserData(userId: string) {
    return this.workerManager.loadData({
      store: 'users',
      action: 'get',
      key: userId
    });
  }

  async saveAnalysisResult(resultId: string, result: any) {
    return this.workerManager.storeData({
      store: 'analysisResults',
      action: 'put',
      key: resultId,
      data: result
    }, {
      version: '1.0',
      size: JSON.stringify(result).length,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      priority: 'medium'
    });
  }

  async loadAnalysisHistory(userId: string) {
    return this.workerManager.loadData({
      store: 'analysisResults',
      action: 'getAll',
      index: 'userId',
      range: IDBKeyRange.only(userId)
    });
  }

  async cacheAIModel(modelId: string, modelData: ArrayBuffer) {
    return this.workerManager.storeData({
      store: 'aiModels',
      action: 'put',
      key: modelId,
      data: {
        id: modelId,
        modelData,
        metadata: {
          version: '1.0',
          size: modelData.byteLength,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1
        }
      }
    });
  }

  async loadCachedModel(modelId: string) {
    return this.workerManager.loadData({
      store: 'aiModels',
      action: 'get',
      key: modelId
    });
  }

  // 性能和统计
  async getPerformanceStats() {
    const workerStats = this.workerManager.getPerformanceMetrics();
    const cacheStats = await this.workerManager.getCacheStats();

    return {
      workers: workerStats,
      cache: cacheStats,
      activeRequests: this.workerManager.getActiveRequestCount(),
      errors: this.workerManager.getErrorLog()
    };
  }

  async optimizeSystem() {
    // 优化缓存
    await this.workerManager.optimizeCache();

    // 清理错误日志
    this.workerManager.clearErrorLog();

    // 清理性能监控数据
    const { performanceMonitor } = await import('./worker-utils');
    performanceMonitor.clear();

    return { optimized: true, timestamp: new Date() };
  }

  // 健康检查
  getSystemHealth() {
    const aiWorkerReady = this.workerManager.isWorkerReady('ai');
    const cacheWorkerReady = this.workerManager.isWorkerReady('cache');
    const activeRequests = this.workerManager.getActiveRequestCount();
    const errorCount = this.workerManager.getErrorLog().length;

    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      workers: {
        ai: aiWorkerReady,
        cache: cacheWorkerReady
      },
      activeRequests,
      errorCount,
      timestamp: new Date()
    };

    // 判断系统健康状态
    if (!aiWorkerReady || !cacheWorkerReady) {
      health.status = 'unhealthy';
    } else if (errorCount > 10 || activeRequests > 50) {
      health.status = 'degraded';
    }

    return health;
  }

  // 清理资源
  terminate() {
    this.workerManager.terminate();
    WorkerService.instance = null;
  }
}

// 导出便捷的全局实例
export const workerService = WorkerService.getInstance();

// 导出类型守卫函数
export function isAIWorkerResponse(response: any): response is import('./ai-worker').AIWorkerResponse {
  return response &&
    typeof response === 'object' &&
    'type' in response &&
    'payload' in response &&
    ['ANALYSIS_COMPLETE', 'KEYWORDS_GENERATED', 'SKILLS_MATCHED', 'PROGRESS_UPDATE', 'ERROR', 'BATCH_COMPLETE'].includes(response.type);
}

export function isCacheWorkerResponse(response: any): response is import('./cache-worker').CacheWorkerResponse {
  return response &&
    typeof response === 'object' &&
    'type' in response &&
    'payload' in response &&
    ['DATA_STORED', 'DATA_LOADED', 'DATA_DELETED', 'CACHE_CLEARED', 'SYNC_COMPLETE', 'STATS_RETRIEVED', 'CACHE_OPTIMIZED', 'ERROR'].includes(response.type);
}

// 导出常量
export const WORKER_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_CHUNK_SIZE: 64 * 1024, // 64KB
  CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5分钟
  PERFORMANCE_MONITOR_INTERVAL: 60 * 1000, // 1分钟
} as const;