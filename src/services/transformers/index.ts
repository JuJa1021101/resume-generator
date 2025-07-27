/**
 * Transformers.js本地AI引擎服务入口
 * 统一导出所有相关服务和类型
 */

// 主服务导出
export {
  TransformersService,
  createTransformersService,
  getTransformersService
} from './transformers-service';

export type {
  TransformersConfig,
  ModelMetadata,
  ModelPerformance,
  AnalysisOptions,
  LocalAnalysisResult
} from './transformers-service';

// 模型缓存管理导出
export {
  ModelCacheManager,
  createModelCacheManager,
  getModelCacheManager
} from './model-cache';

export type {
  CacheConfig,
  CacheItem,
  CacheStats,
  ModelVersion
} from './model-cache';

// 性能优化器导出
export {
  PerformanceOptimizer,
  createPerformanceOptimizer,
  getPerformanceOptimizer
} from './performance-optimizer';

export type {
  PerformanceConfig,
  InferenceTask,
  BatchTask,
  PerformanceMetrics as OptimizerPerformanceMetrics,
  ResourceMonitor
} from './performance-optimizer';

// 结果融合服务导出
export {
  ResultFusionService,
  createResultFusionService,
  getResultFusionService
} from './result-fusion';

export type {
  FusionConfig,
  FusedResult,
  FusionMetadata,
  QualityAssessment
} from './result-fusion';

// 统一的Transformers.js引擎接口
export interface TransformersEngine {
  service: TransformersService;
  cacheManager: ModelCacheManager;
  optimizer: PerformanceOptimizer;
  fusionService: ResultFusionService;
}

// 引擎配置
export interface EngineConfig {
  transformers?: Partial<TransformersConfig>;
  cache?: Partial<CacheConfig>;
  performance?: Partial<PerformanceConfig>;
  fusion?: Partial<FusionConfig>;
}

/**
 * 创建完整的Transformers.js引擎实例
 */
export const createTransformersEngine = (config: EngineConfig = {}): TransformersEngine => {
  const service = createTransformersService(config.transformers);
  const cacheManager = createModelCacheManager(config.cache);
  const optimizer = createPerformanceOptimizer(config.performance);
  const fusionService = createResultFusionService(config.fusion);

  return {
    service,
    cacheManager,
    optimizer,
    fusionService
  };
};

// 单例引擎实例
let engineInstance: TransformersEngine | null = null;

/**
 * 获取单例Transformers.js引擎实例
 */
export const getTransformersEngine = (): TransformersEngine => {
  if (!engineInstance) {
    engineInstance = createTransformersEngine();
  }
  return engineInstance;
};

// 便捷函数导出
export const initializeTransformersEngine = async (config: EngineConfig = {}): Promise<TransformersEngine> => {
  const engine = createTransformersEngine(config);

  // 预热常用模型
  const commonModels = [
    { name: 'Xenova/distilbert-base-uncased', task: 'feature-extraction' },
    { name: 'Xenova/distilbert-base-multilingual-cased', task: 'feature-extraction' },
    { name: 'Xenova/bert-base-NER', task: 'token-classification' }
  ];

  try {
    await engine.cacheManager.warmupCache(commonModels);
    console.log('Transformers.js engine initialized successfully');
  } catch (error) {
    console.warn('Engine warmup failed:', error);
  }

  return engine;
};

// 清理函数
export const cleanupTransformersEngine = (): void => {
  if (engineInstance) {
    engineInstance.cacheManager.clearCache();
    engineInstance.optimizer.cleanup();
    engineInstance.fusionService.clearHistory();
    engineInstance = null;
    console.log('Transformers.js engine cleaned up');
  }
};

// 工具函数
export const getEngineStatus = (): {
  initialized: boolean;
  cacheStats: CacheStats | null;
  performanceMetrics: OptimizerPerformanceMetrics | null;
} => {
  if (!engineInstance) {
    return {
      initialized: false,
      cacheStats: null,
      performanceMetrics: null
    };
  }

  return {
    initialized: true,
    cacheStats: engineInstance.cacheManager.getCacheStats(),
    performanceMetrics: engineInstance.optimizer.getPerformanceMetrics()
  };
};

// 默认配置
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  transformers: {
    modelName: 'Xenova/distilbert-base-multilingual-cased',
    task: 'feature-extraction',
    device: 'cpu',
    quantized: true,
    maxLength: 512,
    temperature: 0.3
  },
  cache: {
    maxModels: 5,
    maxMemoryMB: 1024,
    ttlMinutes: 60,
    persistToIndexedDB: true,
    compressionEnabled: true
  },
  performance: {
    maxConcurrentInferences: 3,
    batchSize: 8,
    memoryThresholdMB: 512,
    enableQuantization: true,
    enableBatching: true,
    inferenceTimeout: 30000,
    warmupIterations: 3
  },
  fusion: {
    localWeight: 0.4,
    cloudWeight: 0.6,
    confidenceThreshold: 0.7,
    enableFallback: true,
    fusionStrategy: 'weighted',
    qualityThreshold: 0.6
  }
};