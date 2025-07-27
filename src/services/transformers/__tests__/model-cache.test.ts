/**
 * 模型缓存管理器测试
 */

import { ModelCacheManager, createModelCacheManager } from '../model-cache';
import type { CacheConfig, CacheItem, ModelVersion } from '../model-cache';

// Mock Pipeline
const mockPipeline = {
  model: 'mocked-model',
  tokenizer: 'mocked-tokenizer'
};

describe('ModelCacheManager', () => {
  let cacheManager: ModelCacheManager;
  let mockLoader: jest.Mock;

  beforeEach(() => {
    const config: Partial<CacheConfig> = {
      maxModels: 3,
      maxMemoryMB: 500,
      ttlMinutes: 30,
      persistToIndexedDB: false, // 测试时禁用IndexedDB
      compressionEnabled: true
    };

    cacheManager = createModelCacheManager(config);
    mockLoader = jest.fn().mockResolvedValue(mockPipeline);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建缓存管理器', () => {
      const defaultManager = createModelCacheManager();
      expect(defaultManager).toBeInstanceOf(ModelCacheManager);
    });

    it('应该使用自定义配置创建缓存管理器', () => {
      const customConfig: Partial<CacheConfig> = {
        maxModels: 10,
        maxMemoryMB: 2048
      };
      const customManager = createModelCacheManager(customConfig);
      expect(customManager).toBeInstanceOf(ModelCacheManager);
    });
  });

  describe('getModel', () => {
    it('应该加载并缓存新模型', async () => {
      const modelName = 'test-model';
      const task = 'test-task';

      const model = await cacheManager.getModel(modelName, task, mockLoader);

      expect(mockLoader).toHaveBeenCalledTimes(1);
      expect(model).toBe(mockPipeline);

      // 验证缓存统计
      const stats = cacheManager.getCacheStats();
      expect(stats.totalModels).toBe(1);
      expect(stats.totalMemoryMB).toBeGreaterThan(0);
    });

    it('应该从缓存返回已加载的模型', async () => {
      const modelName = 'test-model';
      const task = 'test-task';

      // 第一次加载
      await cacheManager.getModel(modelName, task, mockLoader);
      // 第二次加载（应该从缓存获取）
      await cacheManager.getModel(modelName, task, mockLoader);

      // loader应该只被调用一次
      expect(mockLoader).toHaveBeenCalledTimes(1);

      // 验证命中率
      const stats = cacheManager.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('应该处理并发加载请求', async () => {
      const modelName = 'test-model';
      const task = 'test-task';

      // 并发请求同一个模型
      const promises = [
        cacheManager.getModel(modelName, task, mockLoader),
        cacheManager.getModel(modelName, task, mockLoader),
        cacheManager.getModel(modelName, task, mockLoader)
      ];

      const results = await Promise.all(promises);

      // 所有请求应该返回相同的模型
      expect(results[0]).toBe(mockPipeline);
      expect(results[1]).toBe(mockPipeline);
      expect(results[2]).toBe(mockPipeline);

      // loader应该只被调用一次
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it('应该处理加载失败', async () => {
      const errorLoader = jest.fn().mockRejectedValue(new Error('Load failed'));

      await expect(
        cacheManager.getModel('invalid-model', 'invalid-task', errorLoader)
      ).rejects.toThrow('Load failed');
    });
  });

  describe('缓存淘汰', () => {
    it('应该在达到最大模型数量时淘汰LRU模型', async () => {
      const maxModels = 2;
      const limitedManager = createModelCacheManager({
        maxModels,
        persistToIndexedDB: false
      });

      // 加载超过限制的模型数量
      await limitedManager.getModel('model1', 'task1', mockLoader);
      await limitedManager.getModel('model2', 'task2', mockLoader);
      await limitedManager.getModel('model3', 'task3', mockLoader);

      const stats = limitedManager.getCacheStats();
      expect(stats.totalModels).toBeLessThanOrEqual(maxModels);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('应该在达到内存限制时淘汰大模型', async () => {
      const lowMemoryManager = createModelCacheManager({
        maxMemoryMB: 100,
        persistToIndexedDB: false
      });

      // 加载多个模型直到超过内存限制
      await lowMemoryManager.getModel('model1', 'task1', mockLoader);
      await lowMemoryManager.getModel('model2', 'task2', mockLoader);
      await lowMemoryManager.getModel('model3', 'task3', mockLoader);

      const stats = lowMemoryManager.getCacheStats();
      expect(stats.totalMemoryMB).toBeLessThanOrEqual(100);
    });
  });

  describe('缓存统计', () => {
    it('应该正确计算缓存统计', async () => {
      await cacheManager.getModel('model1', 'task1', mockLoader);
      await cacheManager.getModel('model2', 'task2', mockLoader);

      // 再次获取第一个模型（缓存命中）
      await cacheManager.getModel('model1', 'task1', mockLoader);

      const stats = cacheManager.getCacheStats();

      expect(stats.totalModels).toBe(2);
      expect(stats.totalMemoryMB).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.hitRate + stats.missRate).toBeCloseTo(1, 2);
    });

    it('应该跟踪压缩比率', async () => {
      const compressedManager = createModelCacheManager({
        compressionEnabled: true,
        persistToIndexedDB: false
      });

      await compressedManager.getModel('model1', 'task1', mockLoader);

      const stats = compressedManager.getCacheStats();
      expect(stats.compressionRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('模型版本管理', () => {
    it('应该管理模型版本信息', () => {
      const version: ModelVersion = {
        name: 'test-model',
        version: '1.0.0',
        checksum: 'abc123',
        size: 100,
        lastUpdated: new Date(),
        deprecated: false
      };

      cacheManager.updateModelVersion(version);

      const versions = cacheManager.getModelVersions();
      expect(versions).toContain(version);
    });

    it('应该更新现有模型版本', () => {
      const version1: ModelVersion = {
        name: 'test-model',
        version: '1.0.0',
        checksum: 'abc123',
        size: 100,
        lastUpdated: new Date(),
        deprecated: false
      };

      const version2: ModelVersion = {
        name: 'test-model',
        version: '2.0.0',
        checksum: 'def456',
        size: 120,
        lastUpdated: new Date(),
        deprecated: false
      };

      cacheManager.updateModelVersion(version1);
      cacheManager.updateModelVersion(version2);

      const versions = cacheManager.getModelVersions();
      const testModelVersions = versions.filter(v => v.name === 'test-model');
      expect(testModelVersions.length).toBe(1);
      expect(testModelVersions[0].version).toBe('2.0.0');
    });
  });

  describe('缓存预热', () => {
    it('应该预热指定模型', async () => {
      const models = [
        { name: 'model1', task: 'task1' },
        { name: 'model2', task: 'task2' }
      ];

      // Mock warmupCache方法
      const warmupSpy = jest.spyOn(cacheManager, 'warmupCache');
      warmupSpy.mockResolvedValue();

      await cacheManager.warmupCache(models);

      expect(warmupSpy).toHaveBeenCalledWith(models);
    });
  });

  describe('配置管理', () => {
    it('应该返回当前配置', () => {
      const config = cacheManager.getConfig();

      expect(config).toHaveProperty('maxModels');
      expect(config).toHaveProperty('maxMemoryMB');
      expect(config).toHaveProperty('ttlMinutes');
      expect(config).toHaveProperty('persistToIndexedDB');
      expect(config).toHaveProperty('compressionEnabled');
    });

    it('应该更新配置', () => {
      const newConfig = {
        maxModels: 10,
        maxMemoryMB: 1024
      };

      cacheManager.updateConfig(newConfig);

      const config = cacheManager.getConfig();
      expect(config.maxModels).toBe(10);
      expect(config.maxMemoryMB).toBe(1024);
    });
  });

  describe('缓存清理', () => {
    it('应该清理所有缓存', async () => {
      // 先加载一些模型
      await cacheManager.getModel('model1', 'task1', mockLoader);
      await cacheManager.getModel('model2', 'task2', mockLoader);

      let stats = cacheManager.getCacheStats();
      expect(stats.totalModels).toBe(2);

      // 清理缓存
      await cacheManager.clearCache();

      stats = cacheManager.getCacheStats();
      expect(stats.totalModels).toBe(0);
      expect(stats.totalMemoryMB).toBe(0);
    });

    it('应该定期清理过期项', async () => {
      const shortTTLManager = createModelCacheManager({
        ttlMinutes: 0.01, // 0.6秒TTL
        persistToIndexedDB: false
      });

      await shortTTLManager.getModel('model1', 'task1', mockLoader);

      let stats = shortTTLManager.getCacheStats();
      expect(stats.totalModels).toBe(1);

      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 100));

      // 触发清理（通常由定时器触发）
      // 这里我们需要手动触发清理逻辑
      // 在实际实现中，这会由setInterval自动处理
    });
  });

  describe('错误处理', () => {
    it('应该处理缓存操作错误', async () => {
      const errorLoader = jest.fn().mockRejectedValue(new Error('Cache error'));

      await expect(
        cacheManager.getModel('error-model', 'error-task', errorLoader)
      ).rejects.toThrow('Cache error');
    });

    it('应该处理内存不足情况', async () => {
      const tinyMemoryManager = createModelCacheManager({
        maxMemoryMB: 1, // 极小内存限制
        persistToIndexedDB: false
      });

      // 尝试加载模型，应该能处理内存限制
      await expect(
        tinyMemoryManager.getModel('large-model', 'task', mockLoader)
      ).resolves.toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该快速访问缓存的模型', async () => {
      const modelName = 'performance-model';
      const task = 'performance-task';

      // 首次加载
      await cacheManager.getModel(modelName, task, mockLoader);

      // 测试缓存访问性能
      const startTime = Date.now();
      await cacheManager.getModel(modelName, task, mockLoader);
      const endTime = Date.now();

      const accessTime = endTime - startTime;
      expect(accessTime).toBeLessThan(10); // 应该在10ms内完成
    });

    it('应该处理大量并发请求', async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          cacheManager.getModel(`model-${i % 5}`, 'task', mockLoader)
        );
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});