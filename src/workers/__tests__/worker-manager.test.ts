/**
 * WorkerManager单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { WorkerManager, getWorkerManager, terminateWorkerManager } from '../worker-manager';
import type { AIEngineConfig, CacheOperation, CacheMetadata } from '../index';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;

  constructor(public url: string | URL, public options?: WorkerOptions) { }

  postMessage(message: any, transfer?: Transferable[]): void {
    // 模拟异步消息处理
    setTimeout(() => {
      if (this.onmessage) {
        const response = this.createMockResponse(message);
        this.onmessage(new MessageEvent('message', { data: response }));
      }
    }, 10);
  }

  terminate(): void {
    // Mock terminate
  }

  private createMockResponse(message: any) {
    const { type, payload } = message;

    switch (type) {
      case 'ANALYZE_JD':
        return {
          type: 'ANALYSIS_COMPLETE',
          payload: {
            id: payload.id,
            result: {
              keywords: [{ text: 'React', importance: 0.9, category: 'technical', frequency: 5 }],
              skills: [{ name: 'React', category: 'frontend', importance: 0.9, matched: true, requiredLevel: 4 }],
              matchScore: 0.85,
              suggestions: ['加强React高级特性的掌握'],
              processingTime: 100,
              confidence: 0.92
            },
            performanceMetrics: {
              loadTime: 0,
              aiProcessingTime: 100,
              renderTime: 0,
              memoryUsage: 0,
              cacheHitRate: 0
            }
          }
        };

      case 'GENERATE_KEYWORDS':
        return {
          type: 'KEYWORDS_GENERATED',
          payload: {
            id: payload.id,
            result: ['React', 'TypeScript', 'Node.js'],
            performanceMetrics: {
              loadTime: 0,
              aiProcessingTime: 50,
              renderTime: 0,
              memoryUsage: 0,
              cacheHitRate: 0
            }
          }
        };

      case 'MATCH_SKILLS':
        return {
          type: 'SKILLS_MATCHED',
          payload: {
            id: payload.id,
            result: {
              overallScore: 0.82,
              categoryScores: [
                { category: 'frontend', score: 85, maxScore: 100, skillCount: 5, matchedSkills: 4 }
              ],
              gaps: [],
              strengths: ['React开发经验丰富'],
              recommendations: ['学习GraphQL提升后端技能']
            }
          }
        };

      case 'STORE_DATA':
      case 'LOAD_DATA':
      case 'DELETE_DATA':
        return {
          type: type.replace('_DATA', '_') + (type === 'STORE_DATA' ? 'STORED' : type === 'LOAD_DATA' ? 'LOADED' : 'DELETED'),
          payload: {
            id: payload.id,
            result: type === 'LOAD_DATA' ? { mockData: true } : true
          }
        };

      case 'GET_STATS':
        return {
          type: 'STATS_RETRIEVED',
          payload: {
            id: payload.id,
            stats: {
              totalSize: 1024,
              itemCount: 10,
              hitRate: 0.8,
              missRate: 0.2,
              stores: [],
              memoryUsage: 512,
              lastOptimized: new Date()
            }
          }
        };

      default:
        return {
          type: 'ERROR',
          payload: {
            id: payload.id,
            error: {
              code: 'UNKNOWN_TYPE',
              message: `未知的消息类型: ${type}`,
              recoverable: false
            }
          }
        };
    }
  }
}

// Mock global Worker
global.Worker = MockWorker as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('WorkerManager', () => {
  let workerManager: WorkerManager;

  beforeEach(() => {
    workerManager = new WorkerManager({
      maxRetries: 2,
      requestTimeout: 5000,
      enablePerformanceMonitoring: true
    });
  });

  afterEach(() => {
    workerManager.terminate();
    terminateWorkerManager();
  });

  describe('初始化', () => {
    it('应该成功创建WorkerManager实例', () => {
      expect(workerManager).toBeInstanceOf(WorkerManager);
    });

    it('应该正确初始化Worker状态', () => {
      expect(workerManager.isWorkerReady('ai')).toBe(true);
      expect(workerManager.isWorkerReady('cache')).toBe(true);
    });

    it('应该初始化性能监控', () => {
      const metrics = workerManager.getPerformanceMetrics();
      expect(metrics).toBeInstanceOf(Map);
      expect(metrics.has('ai')).toBe(true);
      expect(metrics.has('cache')).toBe(true);
    });
  });

  describe('AI Worker操作', () => {
    const mockConfig: AIEngineConfig = {
      provider: 'transformers',
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 10000
    };

    it('应该成功分析JD', async () => {
      const result = await workerManager.analyzeJD('测试JD内容', mockConfig);

      expect(result).toBeDefined();
      expect((result as any).keywords).toBeInstanceOf(Array);
      expect((result as any).matchScore).toBeTypeOf('number');
    });

    it('应该成功生成关键词', async () => {
      const keywords = await workerManager.generateKeywords('测试内容', mockConfig);

      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('React');
    });

    it('应该成功匹配技能', async () => {
      const mockJob = { id: 'job1', title: '前端开发' };
      const mockSkills = [{ name: 'React', level: 4, category: 'frontend', yearsOfExperience: 2, certifications: [] }];

      const result = await workerManager.matchSkills(mockJob, mockSkills);

      expect(result).toBeDefined();
      expect((result as any).overallScore).toBeTypeOf('number');
      expect((result as any).categoryScores).toBeInstanceOf(Array);
    });
  });

  describe('Cache Worker操作', () => {
    it('应该成功存储数据', async () => {
      const operation: CacheOperation = {
        store: 'users',
        action: 'put',
        key: 'user1',
        data: { name: '测试用户' }
      };

      const metadata: CacheMetadata = {
        version: '1.0',
        size: 100,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        priority: 'high'
      };

      const result = await workerManager.storeData(operation, metadata);
      expect(result).toBe(true);
    });

    it('应该成功加载数据', async () => {
      const operation: CacheOperation = {
        store: 'users',
        action: 'get',
        key: 'user1'
      };

      const result = await workerManager.loadData(operation);
      expect(result).toBeDefined();
      expect((result as any).mockData).toBe(true);
    });

    it('应该成功获取缓存统计', async () => {
      const stats = await workerManager.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.totalSize).toBeTypeOf('number');
      expect(stats.itemCount).toBeTypeOf('number');
      expect(stats.hitRate).toBeTypeOf('number');
    });
  });

  describe('性能监控', () => {
    it('应该记录性能指标', async () => {
      await workerManager.generateKeywords('测试', {
        provider: 'transformers',
        maxTokens: 1024,
        temperature: 0.7,
        timeout: 10000
      });

      const metrics = workerManager.getPerformanceMetrics('ai') as any;
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.successfulRequests).toBeGreaterThan(0);
    });

    it('应该跟踪活跃请求数量', () => {
      const initialCount = workerManager.getActiveRequestCount();
      expect(initialCount).toBeTypeOf('number');
    });
  });

  describe('错误处理', () => {
    it('应该记录错误日志', () => {
      const initialErrors = workerManager.getErrorLog();
      expect(initialErrors).toBeInstanceOf(Array);
    });

    it('应该能够清理错误日志', () => {
      workerManager.clearErrorLog();
      const errors = workerManager.getErrorLog();
      expect(errors.length).toBe(0);
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = getWorkerManager();
      const instance2 = getWorkerManager();
      expect(instance1).toBe(instance2);
    });

    it('应该能够终止单例实例', () => {
      const instance = getWorkerManager();
      terminateWorkerManager();

      const newInstance = getWorkerManager();
      expect(newInstance).not.toBe(instance);
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      const initialMetrics = workerManager.getPerformanceMetrics();
      expect(initialMetrics.size).toBeGreaterThan(0);

      workerManager.terminate();

      // 验证资源已清理
      expect(() => workerManager.isWorkerReady('ai')).not.toThrow();
    });
  });
});

describe('WorkerManager集成测试', () => {
  let workerManager: WorkerManager;

  beforeEach(() => {
    workerManager = getWorkerManager();
  });

  afterEach(() => {
    terminateWorkerManager();
  });

  it('应该支持并发请求', async () => {
    const config: AIEngineConfig = {
      provider: 'transformers',
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 10000
    };

    const promises = [
      workerManager.generateKeywords('内容1', config),
      workerManager.generateKeywords('内容2', config),
      workerManager.generateKeywords('内容3', config)
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toBeInstanceOf(Array);
    });
  });

  it('应该正确处理混合操作', async () => {
    const aiConfig: AIEngineConfig = {
      provider: 'transformers',
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 10000
    };

    // 同时执行AI和缓存操作
    const [keywords, cacheStats] = await Promise.all([
      workerManager.generateKeywords('测试内容', aiConfig),
      workerManager.getCacheStats()
    ]);

    expect(keywords).toBeInstanceOf(Array);
    expect(cacheStats).toBeDefined();
    expect(cacheStats.totalSize).toBeTypeOf('number');
  });
});