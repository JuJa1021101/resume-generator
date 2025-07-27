import type {
  User,
  JobDescription,
  AnalysisResult,
  PerformanceMetrics,
} from '../../types';

// Database configuration
export const DB_NAME = 'ResumeGeneratorDB';
export const DB_VERSION = 1;

// Object store names
export const STORES = {
  USERS: 'users',
  JOB_DESCRIPTIONS: 'jobDescriptions',
  ANALYSIS_RESULTS: 'analysisResults',
  AI_MODELS: 'aiModels',
  PERFORMANCE_METRICS: 'performanceMetrics',
  CACHE_METADATA: 'cacheMetadata',
} as const;

// AI Model cache interface
export interface AIModelCache {
  id: string;
  modelData: ArrayBuffer;
  metadata: ModelMetadata;
  version: string;
  size: number;
  lastAccessed: Date;
  accessCount: number;
}

export interface ModelMetadata {
  name: string;
  type: 'transformers' | 'gpt4o-cache';
  description: string;
  checksum: string;
  downloadUrl?: string;
}

// Cache metadata for LRU implementation
export interface CacheMetadata {
  key: string;
  store: string;
  size: number;
  lastAccessed: Date;
  accessCount: number;
  priority: number;
  expiresAt?: Date;
}

// Database schema definition
export interface DatabaseSchema {
  [STORES.USERS]: {
    key: string;
    value: User;
    indexes: {
      email: string;
      createdAt: Date;
      updatedAt: Date;
    };
  };

  [STORES.JOB_DESCRIPTIONS]: {
    key: string;
    value: JobDescription;
    indexes: {
      title: string;
      company: string;
      analyzedAt: Date;
    };
  };

  [STORES.ANALYSIS_RESULTS]: {
    key: string;
    value: AnalysisResult;
    indexes: {
      userId: string;
      jobId: string;
      matchScore: number;
      createdAt: Date;
    };
  };

  [STORES.AI_MODELS]: {
    key: string;
    value: AIModelCache;
    indexes: {
      version: string;
      size: number;
      lastAccessed: Date;
      accessCount: number;
    };
  };

  [STORES.PERFORMANCE_METRICS]: {
    key: string;
    value: PerformanceMetrics & { id: string; timestamp: Date; operation: string };
    indexes: {
      timestamp: Date;
      operation: string;
    };
  };

  [STORES.CACHE_METADATA]: {
    key: string;
    value: CacheMetadata;
    indexes: {
      store: string;
      lastAccessed: Date;
      priority: number;
      expiresAt: Date;
    };
  };
}

// Index definitions for each store
export const INDEX_DEFINITIONS = {
  [STORES.USERS]: [
    { name: 'email', keyPath: 'profile.email', unique: true },
    { name: 'createdAt', keyPath: 'createdAt', unique: false },
    { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
  ],

  [STORES.JOB_DESCRIPTIONS]: [
    { name: 'title', keyPath: 'title', unique: false },
    { name: 'company', keyPath: 'company', unique: false },
    { name: 'analyzedAt', keyPath: 'analyzedAt', unique: false },
  ],

  [STORES.ANALYSIS_RESULTS]: [
    { name: 'userId', keyPath: 'userId', unique: false },
    { name: 'jobId', keyPath: 'jobId', unique: false },
    { name: 'matchScore', keyPath: 'matchScore', unique: false },
    { name: 'createdAt', keyPath: 'createdAt', unique: false },
  ],

  [STORES.AI_MODELS]: [
    { name: 'version', keyPath: 'version', unique: false },
    { name: 'size', keyPath: 'size', unique: false },
    { name: 'lastAccessed', keyPath: 'lastAccessed', unique: false },
    { name: 'accessCount', keyPath: 'accessCount', unique: false },
  ],

  [STORES.PERFORMANCE_METRICS]: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'operation', keyPath: 'operation', unique: false },
  ],

  [STORES.CACHE_METADATA]: [
    { name: 'store', keyPath: 'store', unique: false },
    { name: 'lastAccessed', keyPath: 'lastAccessed', unique: false },
    { name: 'priority', keyPath: 'priority', unique: false },
    { name: 'expiresAt', keyPath: 'expiresAt', unique: false },
  ],
} as const;