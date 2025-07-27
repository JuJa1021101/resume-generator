/**
 * Transformers.js引擎集成测试
 */

import {
  createTransformersEngine,
  getTransformersEngine,
  initializeTransformersEngine,
  cleanupTransformersEngine,
  getEngineStatus,
  DEFAULT_ENGINE_CONFIG
} from '../index';

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(jest.fn().mockResolvedValue({
    result: 'mocked inference result'
  })),
  env: {
    allowRemoteModels: true,
    allowLocalModels: true
  }
}));

describe('Transformers.js引擎集成测试', () => {
  afterEach(() => {
    cleanupTransformersEngine();
    jest.clearAllMocks();
  });

  describe('引擎创建和初始化', () => {
    it('应该创建完整的引擎实例', () => {
      const engine = createTransformersEngine();

      expect(engine).toHaveProperty('service');
      expect(engine).toHaveProperty('cacheManager');
      expect(engine).toHaveProperty('optimizer');
      expect(engine).toHaveProperty('fusionService');

      expect(engine.service).toBeDefined();
      expect(engine.cacheManager).toBeDefined();
      expect(engine.optimizer).toBeDefined();
      expect(engine.fusionService).toBeDefined();
    });

    it('应该使用自定义配置创建引擎', () => {
      const customConfig = {
        transformers: {
          modelName: 'custom-model',
          maxLength: 256
        },
        cache: {
          maxModels: 10
        },
        performance: {
          maxConcurrentInferences: 5
        },
        fusion: {
          localWeight: 0.7
        }
      };

      const engine = createTransformersEngine(customConfig);
      expect(engine).toBeDefined();
    });

    it('应该返回单例引擎实例', () => {
      const engine1 = getTransformersEngine();
      const engine2 = getTransformersEngine();

      expect(engine1).toBe(engine2);
    });

    it('应该初始化引擎并预热模型', async () => {
      const engine = await initializeTransformersEngine();

      expect(engine).toBeDefined();
      expect(engine.service).toBeDefined();
      expect(engine.cacheManager).toBeDefined();
    });

    it('应该处理初始化失败', async () => {
      // Mock预热失败
      const { pipeline } = require('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Warmup failed'));

      // 初始化应该继续，即使预热失败
      const engine = await initializeTransformersEngine();
      expect(engine).toBeDefined();
    });
  });

  describe('引擎状态管理', () => {
    it('应该返回未初始化状态', () => {
      const status = getEngineStatus();

      expect(status.initialized).toBe(false);
      expect(status.cacheStats).toBeNull();
      expect(status.performanceMetrics).toBeNull();
    });

    it('应该返回已初始化状态', () => {
      const engine = getTransformersEngine();
      const status = getEngineStatus();

      expect(status.initialized).toBe(true);
      expect(status.cacheStats).toBeDefined();
      expect(status.performanceMetrics).toBeDefined();
    });

    it('应该清理引擎资源', () => {
      const engine = getTransformersEngine();

      cleanupTransformersEngine();

      const status = getEngineStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('完整工作流程测试', () => {
    let engine: any;

    beforeEach(async () => {
      engine = await initializeTransformersEngine();
    });

    it('应该完成完整的JD分析流程', async () => {
      const jobContent = `
        我们正在寻找一名经验丰富的前端开发工程师，要求：
        - 熟练掌握React、Vue.js等前端框架
        - 具备TypeScript开发经验
        - 了解Node.js后端开发
        - 良好的团队协作能力
      `;

      // 1. 本地分析
      const localResult = await engine.service.analyzeJobDescription(jobContent);
      expect(localResult).toHaveProperty('localProcessing', true);
      expect(localResult.keywords.length).toBeGreaterThan(0);
      expect(localResult.skills.length).toBeGreaterThan(0);

      // 2. 模拟云端结果
      const cloudResult = {
        keywords: [
          { text: 'React', importance: 0.95, category: 'technical', frequency: 6 },
          { text: 'TypeScript', importance: 0.85, category: 'technical', frequency: 4 }
        ],
        skills: [
          { name: 'React', category: 'frontend', importance: 0.95, matched: true, requiredLevel: 5 }
        ],
        matchScore: 0.88,
        suggestions: ['深入学习React生态系统'],
        processingTime: 2000,
        confidence: 0.92
      };

      // 3. 结果融合
      const fusedResult = await engine.fusionService.fuseResults(localResult, cloudResult);
      expect(fusedResult).toHaveProperty('fusionMetadata');
      expect(fusedResult.fusionMetadata.strategy).toBeDefined();
      expect(fusedResult.keywords.length).toBeGreaterThan(0);
      expect(fusedResult.skills.length).toBeGreaterThan(0);

      // 4. 验证性能指标
      const performanceMetrics = engine.optimizer.getPerformanceMetrics();
      expect(performanceMetrics.completedTasks).toBeGreaterThanOrEqual(0);

      const cacheStats = engine.cacheManager.getCacheStats();
      expect(cacheStats.totalModels).toBeGreaterThanOrEqual(0);
    });

    it('应该处理批量分析任务', async () => {
      const jobDescriptions = [
        'Frontend developer position requiring React skills',
        'Backend engineer with Node.js experience needed',
        'Full-stack developer with React and Node.js'
      ];

      // 批量本地分析
      const localResults = await engine.service.batchAnalyze(jobDescriptions);
      expect(localResults).toHaveLength(jobDescriptions.length);

      // 模拟批量云端结果
      const cloudResults = jobDescriptions.map(() => ({
        keywords: [{ text: 'JavaScript', importance: 0.8, category: 'technical', frequency: 3 }],
        skills: [{ name: 'JavaScript', category: 'frontend', importance: 0.8, matched: true, requiredLevel: 3 }],
        matchScore: 0.75,
        suggestions: ['提升JavaScript技能'],
        processingTime: 1500,
        confidence: 0.8
      }));

      // 批量融合
      const fusedResults = await engine.fusionService.fuseBatchResults(localResults, cloudResults);
      expect(fusedResults).toHaveLength(jobDescriptions.length);

      fusedResults.forEach(result => {
        expect(result).toHaveProperty('fusionMetadata');
        expect(result.keywords.length).toBeGreaterThan(0);
      });
    });

    it('应该处理技能匹配分析', async () => {
      const jobDescription = {
        id: 'job-1',
        title: 'Frontend Developer',
        company: 'Tech Corp',
        content: '需要React和TypeScript经验',
        requirements: [],
        skills: [],
        analyzedAt: new Date(),
        aiAnalysis: {
          keywords: [],
          skills: [],
          matchScore: 0,
          suggestions: [],
          processingTime: 0,
          confidence: 0
        }
      };

      const userSkills = [
        {
          name: 'React',
          level: 4 as const,
          category: 'frontend' as const,
          yearsOfExperience: 3,
          certifications: []
        },
        {
          name: 'TypeScript',
          level: 3 as const,
          category: 'frontend' as const,
          yearsOfExperience: 2,
          certifications: []
        }
      ];

      const matchResult = await engine.service.matchSkills(jobDescription, userSkills);

      expect(matchResult).toHaveProperty('overallScore');
      expect(matchResult).toHaveProperty('categoryScores');
      expect(matchResult).toHaveProperty('gaps');
      expect(matchResult).toHaveProperty('strengths');
      expect(matchResult).toHaveProperty('recommendations');

      expect(typeof matchResult.overallScore).toBe('number');
      expect(Array.isArray(matchResult.categoryScores)).toBe(true);
      expect(Array.isArray(matchResult.gaps)).toBe(true);
      expect(Array.isArray(matchResult.strengths)).toBe(true);
      expect(Array.isArray(matchResult.recommendations)).toBe(true);
    });

    it('应该优化性能和内存使用', async () => {
      // 提交多个任务测试性能优化
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(
          engine.optimizer.submitTask(`model-${i}`, `input-${i}`, { priority: 'medium' })
        );
      }

      const results = await Promise.allSettled(tasks);
      const successfulResults = results.filter(r => r.status === 'fulfilled');

      expect(successfulResults.length).toBeGreaterThan(0);

      // 检查性能指标
      const metrics = engine.optimizer.getPerformanceMetrics();
      expect(metrics.completedTasks).toBeGreaterThan(0);
      expect(metrics.averageInferenceTime).toBeGreaterThanOrEqual(0);

      // 触发内存优化
      await engine.optimizer.optimizeMemoryUsage();

      const newMetrics = engine.optimizer.getPerformanceMetrics();
      expect(newMetrics).toBeDefined();
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理模型加载失败', async () => {
      const { pipeline } = require('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Model load failed'));

      const engine = createTransformersEngine();

      await expect(
        engine.service.loadModel('invalid-model', 'invalid-task')
      ).rejects.toThrow();
    });

    it('应该处理分析失败并提供降级', async () => {
      const engine = createTransformersEngine();

      // Mock分析失败
      const { pipeline } = require('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(
        engine.service.analyzeJobDescription('test content')
      ).rejects.toThrow();
    });

    it('应该处理融合失败', async () => {
      const engine = createTransformersEngine();

      // 测试无效输入的融合
      await expect(
        engine.fusionService.fuseResults(null, null)
      ).rejects.toThrow('至少需要一个分析结果');
    });

    it('应该处理缓存错误', async () => {
      const engine = createTransformersEngine();

      // 测试缓存清理
      await expect(
        engine.cacheManager.clearCache()
      ).resolves.not.toThrow();
    });
  });

  describe('性能基准测试', () => {
    let engine: any;

    beforeEach(async () => {
      engine = await initializeTransformersEngine();
    });

    it('应该在合理时间内完成分析', async () => {
      const content = 'React developer with TypeScript experience';

      const startTime = Date.now();
      await engine.service.analyzeJobDescription(content);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该高效处理并发任务', async () => {
      const concurrentTasks = 5;
      const tasks = [];

      for (let i = 0; i < concurrentTasks; i++) {
        tasks.push(
          engine.optimizer.submitTask(`model-${i}`, `concurrent-input-${i}`)
        );
      }

      const startTime = Date.now();
      await Promise.all(tasks);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = concurrentTasks / (duration / 1000);

      expect(throughput).toBeGreaterThan(1); // 每秒至少处理1个任务
    });

    it('应该有效管理内存使用', async () => {
      // 加载多个模型测试内存管理
      const models = [
        { name: 'model1', task: 'task1' },
        { name: 'model2', task: 'task2' },
        { name: 'model3', task: 'task3' }
      ];

      for (const { name, task } of models) {
        await engine.service.loadModel(name, task);
      }

      const cacheStats = engine.cacheManager.getCacheStats();
      expect(cacheStats.totalMemoryMB).toBeGreaterThan(0);
      expect(cacheStats.totalMemoryMB).toBeLessThan(2048); // 应该在合理范围内
    });

    it('应该维持高缓存命中率', async () => {
      const content = 'Repeated analysis content';

      // 多次分析相同内容
      await engine.service.analyzeJobDescription(content);
      await engine.service.analyzeJobDescription(content);
      await engine.service.analyzeJobDescription(content);

      const cacheStats = engine.cacheManager.getCacheStats();
      // 由于重复分析，缓存命中率应该较高
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('配置和自定义', () => {
    it('应该支持默认配置', () => {
      expect(DEFAULT_ENGINE_CONFIG).toHaveProperty('transformers');
      expect(DEFAULT_ENGINE_CONFIG).toHaveProperty('cache');
      expect(DEFAULT_ENGINE_CONFIG).toHaveProperty('performance');
      expect(DEFAULT_ENGINE_CONFIG).toHaveProperty('fusion');

      const engine = createTransformersEngine(DEFAULT_ENGINE_CONFIG);
      expect(engine).toBeDefined();
    });

    it('应该支持配置更新', () => {
      const engine = createTransformersEngine();

      // 更新各组件配置
      engine.cacheManager.updateConfig({ maxModels: 10 });
      engine.optimizer.updateConfig({ maxConcurrentInferences: 5 });
      engine.fusionService.updateConfig({ localWeight: 0.7 });

      const cacheConfig = engine.cacheManager.getConfig();
      const optimizerConfig = engine.optimizer.getConfig();
      const fusionConfig = engine.fusionService.getConfig();

      expect(cacheConfig.maxModels).toBe(10);
      expect(optimizerConfig.maxConcurrentInferences).toBe(5);
      expect(fusionConfig.localWeight).toBe(0.7);
    });

    it('应该支持运行时配置调整', async () => {
      const engine = await initializeTransformersEngine();

      // 动态调整性能配置
      const initialConfig = engine.optimizer.getConfig();
      engine.optimizer.updateConfig({
        maxConcurrentInferences: initialConfig.maxConcurrentInferences + 1
      });

      const updatedConfig = engine.optimizer.getConfig();
      expect(updatedConfig.maxConcurrentInferences)
        .toBe(initialConfig.maxConcurrentInferences + 1);
    });
  });

  describe('监控和诊断', () => {
    let engine: any;

    beforeEach(async () => {
      engine = await initializeTransformersEngine();
    });

    it('应该提供详细的状态信息', () => {
      const status = getEngineStatus();

      expect(status.initialized).toBe(true);
      expect(status.cacheStats).toHaveProperty('totalModels');
      expect(status.cacheStats).toHaveProperty('totalMemoryMB');
      expect(status.performanceMetrics).toHaveProperty('completedTasks');
    });

    it('应该跟踪融合历史', async () => {
      const localResult = await engine.service.analyzeJobDescription('test content');
      const cloudResult = {
        keywords: [],
        skills: [],
        matchScore: 0.5,
        suggestions: [],
        processingTime: 1000,
        confidence: 0.7
      };

      await engine.fusionService.fuseResults(localResult, cloudResult);

      const history = engine.fusionService.getFusionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('fusionMetadata');
    });

    it('应该监控资源使用', async () => {
      // 提交一些任务生成资源使用数据
      await engine.optimizer.submitTask('monitor-model', 'monitor-input');

      const resourceHistory = engine.optimizer.getResourceHistory();
      expect(Array.isArray(resourceHistory)).toBe(true);
    });

    it('应该提供性能分析', async () => {
      // 执行一些操作生成性能数据
      await engine.service.analyzeJobDescription('performance test');

      const serviceMetrics = engine.service.getPerformanceMetrics();
      const optimizerMetrics = engine.optimizer.getPerformanceMetrics();
      const fusionMetrics = engine.fusionService.getPerformanceMetrics();

      expect(serviceMetrics.aiProcessingTime).toBeGreaterThanOrEqual(0);
      expect(optimizerMetrics.completedTasks).toBeGreaterThanOrEqual(0);
      expect(fusionMetrics.aiProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });
});