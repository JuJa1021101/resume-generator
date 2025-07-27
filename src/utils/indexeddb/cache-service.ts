import { dbConnection } from './connection';
import { UserRepository } from './repositories/user-repository';
import { JobRepository } from './repositories/job-repository';
import { AnalysisRepository } from './repositories/analysis-repository';
import { AIModelRepository } from './repositories/ai-model-repository';
import { LRUCache, type LRUCacheConfig } from './lru-cache';
import { SyncManager, type SyncConfig } from './sync-manager';
import type {
  User,
  JobDescription,
  AnalysisResult,
  PerformanceMetrics
} from '../../types';
import type { AIModelCache } from './schema';

export interface CacheServiceConfig {
  lru: Partial<LRUCacheConfig>;
  sync: Partial<SyncConfig>;
  enableSync: boolean;
  enableLRU: boolean;
}

export class CacheService {
  private userRepo: UserRepository;
  private jobRepo: JobRepository;
  private analysisRepo: AnalysisRepository;
  private aiModelRepo: AIModelRepository;
  private lruCache?: LRUCache;
  private syncManager?: SyncManager;
  private isInitialized = false;

  constructor(private config: Partial<CacheServiceConfig> = {}) {
    this.userRepo = new UserRepository();
    this.jobRepo = new JobRepository();
    this.analysisRepo = new AnalysisRepository();
    this.aiModelRepo = new AIModelRepository();

    // Initialize LRU cache if enabled
    if (config.enableLRU !== false) {
      this.lruCache = new LRUCache({
        maxSize: 100 * 1024 * 1024, // 100MB default
        maxItems: 50,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        ...config.lru,
      });
    }

    // Initialize sync manager if enabled
    if (config.enableSync !== false) {
      this.syncManager = new SyncManager({
        maxRetries: 3,
        retryDelay: 5000,
        batchSize: 10,
        syncInterval: 30000,
        ...config.sync,
      });
    }
  }

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await dbConnection.initialize();
      this.isInitialized = true;
      console.log('Cache service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Cache service not initialized. Call initialize() first.');
    }
  }

  // User operations
  async createUser(user: User): Promise<User> {
    this.ensureInitialized();
    const result = await this.userRepo.create(user);
    this.syncManager?.queueUserOperation('create', result);
    return result;
  }

  async getUser(id: string): Promise<User | null> {
    this.ensureInitialized();
    return this.userRepo.getById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.ensureInitialized();
    return this.userRepo.findByEmail(email);
  }

  async updateUser(user: User): Promise<User> {
    this.ensureInitialized();
    const result = await this.userRepo.update(user);
    this.syncManager?.queueUserOperation('update', result);
    return result;
  }

  async deleteUser(id: string): Promise<void> {
    this.ensureInitialized();
    const user = await this.userRepo.getById(id);
    if (user) {
      await this.userRepo.delete(id);
      this.syncManager?.queueUserOperation('delete', user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    this.ensureInitialized();
    return this.userRepo.getAll();
  }

  // Job operations
  async createJob(job: JobDescription): Promise<JobDescription> {
    this.ensureInitialized();
    const result = await this.jobRepo.create(job);
    this.syncManager?.queueJobOperation('create', result);
    return result;
  }

  async getJob(id: string): Promise<JobDescription | null> {
    this.ensureInitialized();
    return this.jobRepo.getById(id);
  }

  async updateJob(job: JobDescription): Promise<JobDescription> {
    this.ensureInitialized();
    const result = await this.jobRepo.update(job);
    this.syncManager?.queueJobOperation('update', result);
    return result;
  }

  async deleteJob(id: string): Promise<void> {
    this.ensureInitialized();
    const job = await this.jobRepo.getById(id);
    if (job) {
      await this.jobRepo.delete(id);
      this.syncManager?.queueJobOperation('delete', job);
    }
  }

  async getRecentJobs(limit: number = 10): Promise<JobDescription[]> {
    this.ensureInitialized();
    return this.jobRepo.getRecentlyAnalyzed(limit);
  }

  async searchJobs(keywords: string[]): Promise<JobDescription[]> {
    this.ensureInitialized();
    return this.jobRepo.searchByKeywords(keywords);
  }

  // Analysis operations
  async createAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
    this.ensureInitialized();
    const result = await this.analysisRepo.create(analysis);
    this.syncManager?.queueAnalysisOperation('create', result);
    return result;
  }

  async getAnalysis(id: string): Promise<AnalysisResult | null> {
    this.ensureInitialized();
    return this.analysisRepo.getById(id);
  }

  async getUserAnalyses(userId: string): Promise<AnalysisResult[]> {
    this.ensureInitialized();
    return this.analysisRepo.getByUserId(userId);
  }

  async getJobAnalyses(jobId: string): Promise<AnalysisResult[]> {
    this.ensureInitialized();
    return this.analysisRepo.getByJobId(jobId);
  }

  async getRecentAnalyses(limit: number = 10): Promise<AnalysisResult[]> {
    this.ensureInitialized();
    return this.analysisRepo.getRecent(limit);
  }

  // AI Model operations
  async storeAIModel(model: AIModelCache): Promise<AIModelCache> {
    this.ensureInitialized();
    const result = await this.aiModelRepo.create(model);

    // Add to LRU cache metadata
    await this.lruCache?.addToCache(
      model.id,
      'aiModels',
      model.size,
      2 // High priority for AI models
    );

    return result;
  }

  async getAIModel(id: string): Promise<AIModelCache | null> {
    this.ensureInitialized();

    // Try LRU cache first
    const cached = await this.lruCache?.get(id);
    if (cached) {
      return cached;
    }

    // Get from repository
    const model = await this.aiModelRepo.getById(id);
    if (model) {
      // Update access count
      await this.aiModelRepo.updateAccess(id);
    }

    return model;
  }

  async getAIModelByVersion(version: string): Promise<AIModelCache | null> {
    this.ensureInitialized();
    return this.aiModelRepo.getByVersion(version);
  }

  async deleteAIModel(id: string): Promise<void> {
    this.ensureInitialized();
    await this.aiModelRepo.delete(id);
  }

  async getAIModelStats(): Promise<any> {
    this.ensureInitialized();
    return this.aiModelRepo.getCacheStatistics();
  }

  // Cache management operations
  async getCacheStats(): Promise<{
    database: any;
    lru?: any;
    sync?: any;
  }> {
    this.ensureInitialized();

    const [userCount, jobCount, analysisCount, modelCount] = await Promise.all([
      this.userRepo.count(),
      this.jobRepo.count(),
      this.analysisRepo.count(),
      this.aiModelRepo.count(),
    ]);

    const storageEstimate = await dbConnection.getStorageEstimate();

    const stats = {
      database: {
        users: userCount,
        jobs: jobCount,
        analyses: analysisCount,
        models: modelCount,
        storage: storageEstimate,
      },
    };

    if (this.lruCache) {
      stats.lru = await this.lruCache.getCacheStats();
    }

    if (this.syncManager) {
      stats.sync = this.syncManager.getSyncStatus();
    }

    return stats;
  }

  async clearCache(): Promise<void> {
    this.ensureInitialized();

    await Promise.all([
      this.userRepo.clear(),
      this.jobRepo.clear(),
      this.analysisRepo.clear(),
      this.aiModelRepo.clear(),
    ]);

    await this.lruCache?.clear();
    this.syncManager?.clearSyncQueue();
  }

  async optimizeCache(): Promise<{
    expired: number;
    evicted: number;
    cleaned: number;
  }> {
    this.ensureInitialized();

    const results = {
      expired: 0,
      evicted: 0,
      cleaned: 0,
    };

    // LRU cache cleanup
    if (this.lruCache) {
      const lruResults = await this.lruCache.cleanup();
      results.expired = lruResults.expired;
      results.evicted = lruResults.evicted;
    }

    // Clean up invalid AI models
    results.cleaned = await this.aiModelRepo.cleanupInvalidModels();

    // Clean up old analysis results (older than 90 days)
    const oldAnalyses = await this.analysisRepo.deleteOlderThan(90);
    results.cleaned += oldAnalyses;

    return results;
  }

  // Sync operations
  async syncNow(): Promise<{ success: number; failed: number } | null> {
    if (!this.syncManager) return null;
    return this.syncManager.forcSync();
  }

  async retryFailedSync(): Promise<{ success: number; failed: number } | null> {
    if (!this.syncManager) return null;
    return this.syncManager.retryFailedItems();
  }

  getSyncStatus(): any {
    return this.syncManager?.getSyncStatus() || null;
  }

  // Performance tracking
  async recordPerformanceMetrics(
    operation: string,
    metrics: PerformanceMetrics
  ): Promise<void> {
    this.ensureInitialized();

    const record = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      timestamp: new Date(),
      ...metrics,
    };

    await dbConnection.executeTransaction(
      'performanceMetrics',
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, 'performanceMetrics');

        return new Promise<void>((resolve, reject) => {
          const request = store.add(record);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to record metrics: ${request.error?.message}`));
        });
      }
    );
  }

  async getPerformanceMetrics(
    operation?: string,
    limit: number = 100
  ): Promise<any[]> {
    this.ensureInitialized();

    return dbConnection.executeTransaction(
      'performanceMetrics',
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, 'performanceMetrics');

        return new Promise<any[]>((resolve, reject) => {
          const results: any[] = [];
          let request: IDBRequest;

          if (operation) {
            const index = store.index('operation');
            request = index.openCursor(operation, 'prev');
          } else {
            const index = store.index('timestamp');
            request = index.openCursor(null, 'prev');
          }

          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor && results.length < limit) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };

          request.onerror = () => {
            reject(new Error(`Failed to get performance metrics: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Destroy the cache service and cleanup resources
   */
  destroy(): void {
    this.lruCache?.destroy();
    this.syncManager?.destroy();
    dbConnection.close();
    this.isInitialized = false;
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return dbConnection.constructor.isSupported();
  }
}

// Export singleton instance
export const cacheService = new CacheService();