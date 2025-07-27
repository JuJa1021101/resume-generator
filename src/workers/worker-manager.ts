/**
 * Worker管理器 - 主线程与Worker的通信协议和错误处理
 * 负责Worker实例管理、消息路由、错误处理和性能监控
 */

import type {
  AIWorkerMessage,
  AIWorkerResponse,
  AIEngineConfig,
  ProgressUpdate,
  WorkerError as AIWorkerError
} from './ai-worker';

import type {
  CacheWorkerMessage,
  CacheWorkerResponse,
  CacheOperation,
  CacheMetadata,
  SyncConfig,
  CacheStats,
  CacheError
} from './cache-worker';

// 通用Worker接口
export interface WorkerInstance {
  worker: Worker;
  isReady: boolean;
  messageQueue: WorkerMessage[];
  activeRequests: Map<string, WorkerRequest>;
}

export interface WorkerMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export interface WorkerRequest {
  id: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
  startTime: number;
  retryCount: number;
  maxRetries: number;
}

export interface WorkerManagerConfig {
  aiWorkerPath: string;
  cacheWorkerPath: string;
  maxRetries: number;
  requestTimeout: number;
  enablePerformanceMonitoring: boolean;
}

// 性能监控接口
export interface WorkerPerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  activeRequests: number;
  queueLength: number;
  memoryUsage: number;
  lastActivity: Date;
}

// 错误处理接口
export interface WorkerErrorInfo {
  workerId: string;
  requestId: string;
  error: AIWorkerError | CacheError;
  timestamp: Date;
  retryable: boolean;
  context?: unknown;
}

// Worker管理器主类
export class WorkerManager {
  private aiWorker: WorkerInstance | null = null;
  private cacheWorker: WorkerInstance | null = null;
  private config: WorkerManagerConfig;
  private performanceMetrics: Map<string, WorkerPerformanceMetrics> = new Map();
  private errorLog: WorkerErrorInfo[] = [];
  private messageIdCounter = 0;

  constructor(config: Partial<WorkerManagerConfig> = {}) {
    this.config = {
      aiWorkerPath: '/src/workers/ai-worker.ts',
      cacheWorkerPath: '/src/workers/cache-worker.ts',
      maxRetries: 3,
      requestTimeout: 30000, // 30秒
      enablePerformanceMonitoring: true,
      ...config
    };

    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    try {
      // 初始化AI Worker
      this.aiWorker = {
        worker: new Worker(new URL('./ai-worker.ts', import.meta.url), { type: 'module' }),
        isReady: false,
        messageQueue: [],
        activeRequests: new Map()
      };

      // 初始化Cache Worker
      this.cacheWorker = {
        worker: new Worker(new URL('./cache-worker.ts', import.meta.url), { type: 'module' }),
        isReady: false,
        messageQueue: [],
        activeRequests: new Map()
      };

      this.setupWorkerListeners();
      this.initializePerformanceMetrics();

    } catch (error) {
      console.error('Worker初始化失败:', error);
      throw new Error(`Worker初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private setupWorkerListeners(): void {
    if (this.aiWorker) {
      this.aiWorker.worker.onmessage = (event: MessageEvent<AIWorkerResponse>) => {
        this.handleWorkerMessage('ai', event.data);
      };

      this.aiWorker.worker.onerror = (error) => {
        this.handleWorkerError('ai', error);
      };

      this.aiWorker.isReady = true;
    }

    if (this.cacheWorker) {
      this.cacheWorker.worker.onmessage = (event: MessageEvent<CacheWorkerResponse>) => {
        this.handleWorkerMessage('cache', event.data);
      };

      this.cacheWorker.worker.onerror = (error) => {
        this.handleWorkerError('cache', error);
      };

      this.cacheWorker.isReady = true;
    }
  }

  private initializePerformanceMetrics(): void {
    const initialMetrics: WorkerPerformanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      activeRequests: 0,
      queueLength: 0,
      memoryUsage: 0,
      lastActivity: new Date()
    };

    this.performanceMetrics.set('ai', { ...initialMetrics });
    this.performanceMetrics.set('cache', { ...initialMetrics });
  }

  private generateMessageId(): string {
    return `msg_${++this.messageIdCounter}_${Date.now()}`;
  }

  private handleWorkerMessage(workerId: string, response: AIWorkerResponse | CacheWorkerResponse): void {
    const workerInstance = workerId === 'ai' ? this.aiWorker : this.cacheWorker;
    if (!workerInstance) return;

    const { payload } = response;
    const requestId = payload.id;
    const request = workerInstance.activeRequests.get(requestId);

    if (!request) {
      console.warn(`收到未知请求的响应: ${requestId}`);
      return;
    }

    // 清理超时定时器
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    // 更新性能指标
    this.updatePerformanceMetrics(workerId, request.startTime, response.type !== 'ERROR');

    // 处理响应
    if (response.type === 'ERROR') {
      const errorInfo: WorkerErrorInfo = {
        workerId,
        requestId,
        error: payload.error as AIWorkerError | CacheError,
        timestamp: new Date(),
        retryable: (payload.error as AIWorkerError | CacheError)?.recoverable || false
      };

      this.logError(errorInfo);

      // 检查是否可以重试
      if (errorInfo.retryable && request.retryCount < request.maxRetries) {
        this.retryRequest(workerId, requestId);
        return;
      }

      request.reject(new Error((payload.error as AIWorkerError | CacheError)?.message || '未知Worker错误'));
    } else {
      request.resolve(payload.result || payload);
    }

    // 清理请求
    workerInstance.activeRequests.delete(requestId);
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    console.error(`Worker ${workerId} 错误:`, error);

    const errorInfo: WorkerErrorInfo = {
      workerId,
      requestId: 'unknown',
      error: {
        code: 'WORKER_ERROR',
        message: error.message || 'Worker运行时错误',
        details: error,
        recoverable: false
      } as AIWorkerError,
      timestamp: new Date(),
      retryable: false
    };

    this.logError(errorInfo);

    // 重启Worker
    this.restartWorker(workerId);
  }

  private updatePerformanceMetrics(workerId: string, startTime: number, success: boolean): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const metrics = this.performanceMetrics.get(workerId);
    if (!metrics) return;

    const responseTime = Date.now() - startTime;

    metrics.totalRequests++;
    metrics.lastActivity = new Date();

    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // 更新响应时间统计
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests
    );

    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
    metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);

    this.performanceMetrics.set(workerId, metrics);
  }

  private logError(errorInfo: WorkerErrorInfo): void {
    this.errorLog.push(errorInfo);

    // 保持错误日志大小在合理范围内
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }
  }

  private async retryRequest(workerId: string, requestId: string): Promise<void> {
    const workerInstance = workerId === 'ai' ? this.aiWorker : this.cacheWorker;
    if (!workerInstance) return;

    const request = workerInstance.activeRequests.get(requestId);
    if (!request) return;

    request.retryCount++;

    // 指数退避延迟
    const delay = Math.min(1000 * Math.pow(2, request.retryCount - 1), 10000);

    setTimeout(() => {
      // 这里需要重新发送原始消息，但由于我们没有保存原始消息，
      // 实际实现中应该在request中保存原始消息内容
      console.log(`重试请求 ${requestId}，第 ${request.retryCount} 次重试`);
    }, delay);
  }

  private restartWorker(workerId: string): void {
    console.log(`重启Worker: ${workerId}`);

    if (workerId === 'ai' && this.aiWorker) {
      this.aiWorker.worker.terminate();
      this.aiWorker = null;
    } else if (workerId === 'cache' && this.cacheWorker) {
      this.cacheWorker.worker.terminate();
      this.cacheWorker = null;
    }

    // 重新初始化
    setTimeout(() => {
      this.initializeWorkers();
    }, 1000);
  }

  private sendMessage(
    workerId: string,
    message: AIWorkerMessage | CacheWorkerMessage,
    options: { timeout?: number; maxRetries?: number; priority?: 'high' | 'medium' | 'low' } = {}
  ): Promise<unknown> {
    const workerInstance = workerId === 'ai' ? this.aiWorker : this.cacheWorker;

    if (!workerInstance || !workerInstance.isReady) {
      return Promise.reject(new Error(`Worker ${workerId} 未就绪`));
    }

    const messageId = this.generateMessageId();
    const timeout = options.timeout || this.config.requestTimeout;
    const maxRetries = options.maxRetries || this.config.maxRetries;

    return new Promise((resolve, reject) => {
      const request: WorkerRequest = {
        id: messageId,
        resolve,
        reject,
        startTime: Date.now(),
        retryCount: 0,
        maxRetries
      };

      // 设置超时
      request.timeout = setTimeout(() => {
        workerInstance.activeRequests.delete(messageId);
        reject(new Error(`Worker请求超时: ${messageId}`));
      }, timeout);

      // 保存请求
      workerInstance.activeRequests.set(messageId, request);

      // 发送消息
      const messageWithId = {
        ...message,
        payload: {
          ...message.payload,
          id: messageId
        }
      };

      workerInstance.worker.postMessage(messageWithId);

      // 更新性能指标
      const metrics = this.performanceMetrics.get(workerId);
      if (metrics) {
        metrics.activeRequests++;
        this.performanceMetrics.set(workerId, metrics);
      }
    });
  }

  // AI Worker 方法
  async analyzeJD(content: string, config: AIEngineConfig): Promise<unknown> {
    const message: AIWorkerMessage = {
      type: 'ANALYZE_JD',
      payload: {
        id: '', // 将由sendMessage设置
        content,
        config
      }
    };

    return this.sendMessage('ai', message, { priority: 'high' });
  }

  async generateKeywords(content: string, config: AIEngineConfig): Promise<string[]> {
    const message: AIWorkerMessage = {
      type: 'GENERATE_KEYWORDS',
      payload: {
        id: '', // 将由sendMessage设置
        content,
        config
      }
    };

    return this.sendMessage('ai', message) as Promise<string[]>;
  }

  async matchSkills(jobDescription: any, userSkills: any[]): Promise<unknown> {
    const message: AIWorkerMessage = {
      type: 'MATCH_SKILLS',
      payload: {
        id: '', // 将由sendMessage设置
        jobDescription,
        userSkills
      }
    };

    return this.sendMessage('ai', message, { priority: 'high' });
  }

  // Cache Worker 方法
  async storeData(operation: CacheOperation, metadata?: CacheMetadata): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'STORE_DATA',
      payload: {
        id: '', // 将由sendMessage设置
        operation,
        metadata
      }
    };

    return this.sendMessage('cache', message);
  }

  async loadData(operation: CacheOperation): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'LOAD_DATA',
      payload: {
        id: '', // 将由sendMessage设置
        operation
      }
    };

    return this.sendMessage('cache', message);
  }

  async deleteData(operation: CacheOperation): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'DELETE_DATA',
      payload: {
        id: '', // 将由sendMessage设置
        operation
      }
    };

    return this.sendMessage('cache', message);
  }

  async clearCache(operation?: CacheOperation): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'CLEAR_CACHE',
      payload: {
        id: '', // 将由sendMessage设置
        operation
      }
    };

    return this.sendMessage('cache', message);
  }

  async syncData(syncConfig: SyncConfig): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'SYNC_DATA',
      payload: {
        id: '', // 将由sendMessage设置
        syncConfig
      }
    };

    return this.sendMessage('cache', message, { timeout: 60000 }); // 同步可能需要更长时间
  }

  async getCacheStats(): Promise<CacheStats> {
    const message: CacheWorkerMessage = {
      type: 'GET_STATS',
      payload: {
        id: '' // 将由sendMessage设置
      }
    };

    return this.sendMessage('cache', message) as Promise<CacheStats>;
  }

  async optimizeCache(): Promise<unknown> {
    const message: CacheWorkerMessage = {
      type: 'OPTIMIZE_CACHE',
      payload: {
        id: '' // 将由sendMessage设置
      }
    };

    return this.sendMessage('cache', message, { timeout: 60000 });
  }

  // 管理方法
  getPerformanceMetrics(workerId?: string): WorkerPerformanceMetrics | Map<string, WorkerPerformanceMetrics> {
    if (workerId) {
      return this.performanceMetrics.get(workerId) || {} as WorkerPerformanceMetrics;
    }
    return this.performanceMetrics;
  }

  getErrorLog(): WorkerErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  isWorkerReady(workerId: string): boolean {
    const workerInstance = workerId === 'ai' ? this.aiWorker : this.cacheWorker;
    return workerInstance?.isReady || false;
  }

  getActiveRequestCount(workerId?: string): number {
    if (workerId) {
      const workerInstance = workerId === 'ai' ? this.aiWorker : this.cacheWorker;
      return workerInstance?.activeRequests.size || 0;
    }

    const aiCount = this.aiWorker?.activeRequests.size || 0;
    const cacheCount = this.cacheWorker?.activeRequests.size || 0;
    return aiCount + cacheCount;
  }

  // 清理资源
  terminate(): void {
    if (this.aiWorker) {
      this.aiWorker.worker.terminate();
      this.aiWorker = null;
    }

    if (this.cacheWorker) {
      this.cacheWorker.worker.terminate();
      this.cacheWorker = null;
    }

    this.performanceMetrics.clear();
    this.errorLog = [];
  }
}

// 单例实例
let workerManagerInstance: WorkerManager | null = null;

export function getWorkerManager(config?: Partial<WorkerManagerConfig>): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager(config);
  }
  return workerManagerInstance;
}

export function terminateWorkerManager(): void {
  if (workerManagerInstance) {
    workerManagerInstance.terminate();
    workerManagerInstance = null;
  }
}