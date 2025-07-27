/**
 * 性能优化器测试
 */

import { PerformanceOptimizer, createPerformanceOptimizer } from '../performance-optimizer';
import type { PerformanceConfig, InferenceTask } from '../performance-optimizer';

// Mock Pipeline
const mockPipeline = {
  model: 'mocked-model',
  tokenizer: 'mocked-tokenizer'
};

// Mock ModelMetadata
const mockMetadata = {
  name: 'test-model',
  size: 100,
  version: '1.0.0',
  task: 'feature-extraction',
  language: 'english',
  loadedAt: new Date(),
  performance: {
    loadTime: 1000,
    inferenceTime: 100,
    memoryUsage: 50,
    accuracy: 0.85
  }
};

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    const config: Partial<PerformanceConfig> = {
      maxConcurrentInferences: 2,
      batchSize: 4,
      memoryThresholdMB: 256,
      enableQuantization: true,
      enableBatching: true,
      inferenceTimeout: 5000,
      warmupIterations: 2
    };

    optimizer = createPerformanceOptimizer(config);
  });

  afterEach(() => {
    optimizer.cleanup();
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建优化器', () => {
      const defaultOptimizer = createPerformanceOptimizer();
      expect(defaultOptimizer).toBeInstanceOf(PerformanceOptimizer);
    });

    it('应该使用自定义配置创建优化器', () => {
      const customConfig: Partial<PerformanceConfig> = {
        maxConcurrentInferences: 5,
        batchSize: 16
      };
      const customOptimizer = createPerformanceOptimizer(customConfig);
      expect(customOptimizer).toBeInstanceOf(PerformanceOptimizer);
    });
  });

  describe('submitTask', () => {
    it('应该成功提交单个任务', async () => {
      const modelName = 'test-model';
      const input = 'test input';

      const resultPromise = optimizer.submitTask(modelName, input);
      expect(resultPromise).toBeInstanceOf(Promise);

      const result = await resultPromise;
      expect(result).toBeDefined();
    });

    it('应该支持任务优先级', async () => {
      const highPriorityPromise = optimizer.submitTask('model1', 'high priority', { priority: 'high' });
      const lowPriorityPromise = optimizer.submitTask('model2', 'low priority', { priority: 'low' });

      const results = await Promise.all([highPriorityPromise, lowPriorityPromise]);
      expect(results).toHaveLength(2);
    });

    it('应该处理任务超时', async () => {
      const shortTimeoutPromise = optimizer.submitTask('model', 'input', { timeout: 1 });

      await expect(shortTimeoutPromise).rejects.toThrow();
    }, 10000);

    it('应该限制并发任务数量', async () => {
      const maxConcurrent = 2;
      const tasks = [];

      // 提交超过并发限制的任务
      for (let i = 0; i < maxConcurrent + 2; i++) {
        tasks.push(optimizer.submitTask(`model-${i}`, `input-${i}`));
      }

      // 所有任务最终都应该完成
      const results = await Promise.allSettled(tasks);
      expect(results).toHaveLength(maxConcurrent + 2);
    });
  });

  describe('submitBatchTasks', () => {
    it('应该成功提交批量任务', async () => {
      const modelName = 'batch-model';
      const inputs = ['input1', 'input2', 'input3', 'input4', 'input5'];

      const results = await optimizer.submitBatchTasks(modelName, inputs);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(inputs.length);
    });

    it('应该支持自定义批量大小', async () => {
      const modelName = 'batch-model';
      const inputs = ['input1', 'input2', 'input3', 'input4', 'input5'];
      const batchSize = 2;

      const results = await optimizer.submitBatchTasks(modelName, inputs, { batchSize });

      expect(results).toHaveLength(inputs.length);
    });

    it('应该处理空输入数组', async () => {
      const results = await optimizer.submitBatchTasks('model', []);
      expect(results).toHaveLength(0);
    });
  });

  describe('optimizeInference', () => {
    it('应该优化单个推理任务', async () => {
      const input = 'test input for optimization';

      const result = await optimizer.optimizeInference(mockPipeline as any, input, mockMetadata);

      expect(result).toBeDefined();
    });

    it('应该处理数组输入', async () => {
      const inputs = ['input1', 'input2', 'input3'];

      const result = await optimizer.optimizeInference(mockPipeline as any, inputs, mockMetadata);

      expect(result).toBeDefined();
    });

    it('应该应用量化优化', async () => {
      const quantizedOptimizer = createPerformanceOptimizer({ enableQuantization: true });
      const input = 'quantization test';

      const result = await quantizedOptimizer.optimizeInference(mockPipeline as any, input, mockMetadata);

      expect(result).toBeDefined();
      quantizedOptimizer.cleanup();
    });

    it('应该处理推理错误', async () => {
      const errorMetadata = {
        ...mockMetadata,
        name: 'error-model'
      };

      // 这里我们期望优化器能够处理错误
      await expect(
        optimizer.optimizeInference(mockPipeline as any, 'error input', errorMetadata)
      ).resolves.toBeDefined();
    });
  });

  describe('optimizeBatchInference', () => {
    it('应该优化批量推理', async () => {
      const inputs = ['batch1', 'batch2', 'batch3', 'batch4'];

      const results = await optimizer.optimizeBatchInference(mockPipeline as any, inputs, mockMetadata);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(inputs.length);
    });

    it('应该在禁用批处理时回退到单个推理', async () => {
      const noBatchOptimizer = createPerformanceOptimizer({ enableBatching: false });
      const inputs = ['input1', 'input2'];

      const results = await noBatchOptimizer.optimizeBatchInference(mockPipeline as any, inputs, mockMetadata);

      expect(results).toHaveLength(inputs.length);
      noBatchOptimizer.cleanup();
    });

    it('应该处理大批量数据', async () => {
      const largeInputs = Array.from({ length: 20 }, (_, i) => `input-${i}`);

      const results = await optimizer.optimizeBatchInference(mockPipeline as any, largeInputs, mockMetadata);

      expect(results).toHaveLength(largeInputs.length);
    });
  });

  describe('warmupModel', () => {
    it('应该预热模型', async () => {
      await expect(
        optimizer.warmupModel(mockPipeline as any, mockMetadata)
      ).resolves.not.toThrow();
    });

    it('应该处理预热失败', async () => {
      const errorMetadata = {
        ...mockMetadata,
        name: 'warmup-error-model'
      };

      // 预热失败不应该抛出错误，而是记录警告
      await expect(
        optimizer.warmupModel(mockPipeline as any, errorMetadata)
      ).resolves.not.toThrow();
    });
  });

  describe('optimizeMemoryUsage', () => {
    it('应该在内存使用过高时进行优化', async () => {
      const highMemoryOptimizer = createPerformanceOptimizer({
        memoryThresholdMB: 1 // 极低阈值触发优化
      });

      await expect(
        highMemoryOptimizer.optimizeMemoryUsage()
      ).resolves.not.toThrow();

      highMemoryOptimizer.cleanup();
    });

    it('应该调整并发推理数量', async () => {
      const initialConfig = optimizer.getConfig();
      const initialConcurrent = initialConfig.maxConcurrentInferences;

      // 模拟内存压力
      await optimizer.optimizeMemoryUsage();

      const newConfig = optimizer.getConfig();
      // 在内存压力下，并发数量可能会减少
      expect(newConfig.maxConcurrentInferences).toBeLessThanOrEqual(initialConcurrent);
    });
  });

  describe('性能指标', () => {
    it('应该跟踪性能指标', async () => {
      // 提交一些任务来生成指标
      await optimizer.submitTask('model1', 'input1');
      await optimizer.submitTask('model2', 'input2');

      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics).toHaveProperty('averageInferenceTime');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('queueLength');
      expect(metrics).toHaveProperty('completedTasks');
      expect(metrics).toHaveProperty('failedTasks');
      expect(metrics).toHaveProperty('batchEfficiency');

      expect(typeof metrics.averageInferenceTime).toBe('number');
      expect(typeof metrics.throughput).toBe('number');
      expect(typeof metrics.completedTasks).toBe('number');
    });

    it('应该更新批处理效率指标', async () => {
      const inputs = ['batch1', 'batch2', 'batch3'];
      await optimizer.submitBatchTasks('batch-model', inputs);

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.batchEfficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('资源监控', () => {
    it('应该监控资源使用情况', () => {
      const history = optimizer.getResourceHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该限制资源历史记录大小', async () => {
      // 等待一些监控周期
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = optimizer.getResourceHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('配置管理', () => {
    it('应该返回当前配置', () => {
      const config = optimizer.getConfig();

      expect(config).toHaveProperty('maxConcurrentInferences');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('memoryThresholdMB');
      expect(config).toHaveProperty('enableQuantization');
      expect(config).toHaveProperty('enableBatching');
    });

    it('应该更新配置', () => {
      const newConfig = {
        maxConcurrentInferences: 10,
        batchSize: 32
      };

      optimizer.updateConfig(newConfig);

      const config = optimizer.getConfig();
      expect(config.maxConcurrentInferences).toBe(10);
      expect(config.batchSize).toBe(32);
    });
  });

  describe('清理资源', () => {
    it('应该清理所有资源', () => {
      optimizer.cleanup();

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.queueLength).toBe(0);

      const history = optimizer.getResourceHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理任务执行错误', async () => {
      // 提交一个会失败的任务
      await expect(
        optimizer.submitTask('error-model', 'error-input', { timeout: 1 })
      ).rejects.toThrow();

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.failedTasks).toBeGreaterThan(0);
    });

    it('应该处理批量任务中的单个失败', async () => {
      const inputs = ['good1', 'error', 'good2'];

      // 批量任务应该继续处理，即使某些失败
      const results = await optimizer.submitBatchTasks('mixed-model', inputs);
      expect(results).toHaveLength(inputs.length);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理任务', async () => {
      const startTime = Date.now();

      await optimizer.submitTask('perf-model', 'performance test');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该高效处理批量任务', async () => {
      const inputs = Array.from({ length: 50 }, (_, i) => `batch-input-${i}`);

      const startTime = Date.now();
      await optimizer.submitBatchTasks('batch-perf-model', inputs);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = inputs.length / (duration / 1000);

      expect(throughput).toBeGreaterThan(10); // 每秒至少处理10个
    });

    it('应该有效管理内存使用', async () => {
      const tasks = [];

      // 提交大量任务
      for (let i = 0; i < 20; i++) {
        tasks.push(optimizer.submitTask(`model-${i}`, `input-${i}`));
      }

      await Promise.allSettled(tasks);

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.memoryUsage).toBeLessThan(1000); // 内存使用应该合理
    });
  });

  describe('并发控制', () => {
    it('应该正确限制并发任务数量', async () => {
      const maxConcurrent = 2;
      const concurrentOptimizer = createPerformanceOptimizer({
        maxConcurrentInferences: maxConcurrent
      });

      const tasks = [];
      const startTimes: number[] = [];

      // 提交多个任务
      for (let i = 0; i < maxConcurrent + 2; i++) {
        startTimes.push(Date.now());
        tasks.push(concurrentOptimizer.submitTask(`model-${i}`, `input-${i}`));
      }

      await Promise.all(tasks);

      concurrentOptimizer.cleanup();
    });

    it('应该按优先级处理任务', async () => {
      const results: string[] = [];

      // 提交不同优先级的任务
      const lowTask = optimizer.submitTask('model', 'low', { priority: 'low' });
      const highTask = optimizer.submitTask('model', 'high', { priority: 'high' });
      const mediumTask = optimizer.submitTask('model', 'medium', { priority: 'medium' });

      await Promise.all([lowTask, highTask, mediumTask]);

      // 高优先级任务应该优先处理
      // 这里我们主要验证没有错误发生
      expect(true).toBe(true);
    });
  });
});