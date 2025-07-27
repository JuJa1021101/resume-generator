// Main cache service
export { CacheService, cacheService } from './cache-service';

// Database connection and schema
export { DatabaseConnection, dbConnection } from './connection';
export * from './schema';

// Repositories
export { BaseRepository } from './base-repository';
export { UserRepository } from './repositories/user-repository';
export { JobRepository } from './repositories/job-repository';
export { AnalysisRepository } from './repositories/analysis-repository';
export { AIModelRepository } from './repositories/ai-model-repository';

// Cache management
export { LRUCache } from './lru-cache';
export { SyncManager } from './sync-manager';

// Types
export type { QueryOptions, IndexQuery } from './base-repository';
export type { LRUCacheConfig } from './lru-cache';
export type { SyncQueueItem, SyncConfig } from './sync-manager';
export type { CacheServiceConfig } from './cache-service';