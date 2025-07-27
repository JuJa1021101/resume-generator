/**
 * 结果融合服务测试
 */

import { ResultFusionService, createResultFusionService } from '../result-fusion';
import type { FusionConfig, FusedResult } from '../result-fusion';
import type { LocalAnalysisResult } from '../transformers-service';
import type { AIAnalysisResult } from '../../../types';

describe('ResultFusionService', () => {
  let fusionService: ResultFusionService;
  let mockLocalResult: LocalAnalysisResult;
  let mockCloudResult: AIAnalysisResult;

  beforeEach(() => {
    const config: Partial<FusionConfig> = {
      localWeight: 0.4,
      cloudWeight: 0.6,
      confidenceThreshold: 0.7,
      enableFallback: true,
      fusionStrategy: 'weighted',
      qualityThreshold: 0.6
    };

    fusionService = createResultFusionService(config);

    // Mock本地分析结果
    mockLocalResult = {
      keywords: [
        { text: 'React', importance: 0.9, category: 'technical', frequency: 5 },
        { text: 'JavaScript', importance: 0.8, category: 'technical', frequency: 4 },
        { text: '团队协作', importance: 0.6, category: 'soft', frequency: 2 }
      ],
      skills: [
        { name: 'React', category: 'frontend', importance: 0.9, matched: true, requiredLevel: 4 },
        { name: 'JavaScript', category: 'frontend', importance: 0.8, matched: true, requiredLevel: 3 }
      ],
      matchScore: 0.82,
      suggestions: ['加强React高级特性', '提升JavaScript性能优化'],
      processingTime: 1500,
      confidence: 0.85,
      modelUsed: 'Xenova/distilbert-base-multilingual-cased',
      localProcessing: true,
      modelMetadata: {
        name: 'test-model',
        size: 100,
        version: '1.0.0',
        task: 'feature-extraction',
        language: 'multilingual',
        loadedAt: new Date(),
        performance: {
          loadTime: 1000,
          inferenceTime: 500,
          memoryUsage: 50,
          accuracy: 0.85
        }
      }
    };

    // Mock云端分析结果
    mockCloudResult = {
      keywords: [
        { text: 'React', importance: 0.95, category: 'technical', frequency: 6 },
        { text: 'TypeScript', importance: 0.85, category: 'technical', frequency: 4 },
        { text: '沟通能力', importance: 0.7, category: 'soft', frequency: 3 }
      ],
      skills: [
        { name: 'React', category: 'frontend', importance: 0.95, matched: true, requiredLevel: 5 },
        { name: 'TypeScript', category: 'frontend', importance: 0.85, matched: false, requiredLevel: 4 }
      ],
      matchScore: 0.88,
      suggestions: ['深入学习React生态系统', '掌握TypeScript高级类型'],
      processingTime: 2000,
      confidence: 0.92
    };
  });

  afterEach(() => {
    fusionService.clearHistory();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建融合服务', () => {
      const defaultService = createResultFusionService();
      expect(defaultService).toBeInstanceOf(ResultFusionService);
    });

    it('应该使用自定义配置创建融合服务', () => {
      const customConfig: Partial<FusionConfig> = {
        localWeight: 0.3,
        cloudWeight: 0.7,
        fusionStrategy: 'ensemble'
      };
      const customService = createResultFusionService(customConfig);
      expect(customService).toBeInstanceOf(ResultFusionService);
    });
  });

  describe('fuseResults', () => {
    it('应该成功融合本地和云端结果', async () => {
      const fusedResult = await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      expect(fusedResult).toHaveProperty('keywords');
      expect(fusedResult).toHaveProperty('skills');
      expect(fusedResult).toHaveProperty('matchScore');
      expect(fusedResult).toHaveProperty('suggestions');
      expect(fusedResult).toHaveProperty('confidence');
      expect(fusedResult).toHaveProperty('fusionMetadata');
      expect(fusedResult).toHaveProperty('localResult');
      expect(fusedResult).toHaveProperty('cloudResult');

      expect(Array.isArray(fusedResult.keywords)).toBe(true);
      expect(Array.isArray(fusedResult.skills)).toBe(true);
      expect(Array.isArray(fusedResult.suggestions)).toBe(true);
      expect(typeof fusedResult.matchScore).toBe('number');
      expect(typeof fusedResult.confidence).toBe('number');

      // 验证融合元数据
      expect(fusedResult.fusionMetadata.strategy).toBe('weighted');
      expect(fusedResult.fusionMetadata.localWeight).toBe(0.4);
      expect(fusedResult.fusionMetadata.cloudWeight).toBe(0.6);
      expect(fusedResult.fusionMetadata.fallbackUsed).toBe(false);
    });

    it('应该处理只有本地结果的情况', async () => {
      const fusedResult = await fusionService.fuseResults(mockLocalResult, null);

      expect(fusedResult.fusionMetadata.strategy).toBe('local-only');
      expect(fusedResult.fusionMetadata.fallbackUsed).toBe(true);
      expect(fusedResult.localResult).toBe(mockLocalResult);
      expect(fusedResult.cloudResult).toBeUndefined();
    });

    it('应该处理只有云端结果的情况', async () => {
      const fusedResult = await fusionService.fuseResults(null, mockCloudResult);

      expect(fusedResult.fusionMetadata.strategy).toBe('cloud-only');
      expect(fusedResult.fusionMetadata.fallbackUsed).toBe(true);
      expect(fusedResult.localResult).toBeUndefined();
      expect(fusedResult.cloudResult).toBe(mockCloudResult);
    });

    it('应该处理两个结果都为空的情况', async () => {
      await expect(fusionService.fuseResults(null, null))
        .rejects.toThrow('至少需要一个分析结果');
    });

    it('应该支持自定义融合策略', async () => {
      const fusedResult = await fusionService.fuseResults(
        mockLocalResult,
        mockCloudResult,
        { strategy: 'ensemble' }
      );

      expect(fusedResult.fusionMetadata.strategy).toBe('ensemble');
    });

    it('应该支持自定义权重', async () => {
      const customWeights = { local: 0.7, cloud: 0.3 };
      const fusedResult = await fusionService.fuseResults(
        mockLocalResult,
        mockCloudResult,
        { weights: customWeights }
      );

      expect(fusedResult.fusionMetadata.localWeight).toBe(0.7);
      expect(fusedResult.fusionMetadata.cloudWeight).toBe(0.3);
    });

    it('应该在质量不达标时使用降级策略', async () => {
      // 创建低质量的结果
      const lowQualityLocal = {
        ...mockLocalResult,
        confidence: 0.3,
        keywords: [],
        skills: []
      };

      const lowQualityCloud = {
        ...mockCloudResult,
        confidence: 0.3,
        keywords: [],
        skills: []
      };

      const fusedResult = await fusionService.fuseResults(
        lowQualityLocal,
        lowQualityCloud,
        { fallbackToSingle: true }
      );

      expect(fusedResult.fusionMetadata.strategy).toBe('quality-fallback');
      expect(fusedResult.fusionMetadata.fallbackUsed).toBe(true);
    });
  });

  describe('fuseBatchResults', () => {
    it('应该批量融合结果', async () => {
      const localResults = [mockLocalResult, mockLocalResult];
      const cloudResults = [mockCloudResult, mockCloudResult];

      const fusedResults = await fusionService.fuseBatchResults(localResults, cloudResults);

      expect(Array.isArray(fusedResults)).toBe(true);
      expect(fusedResults).toHaveLength(2);

      fusedResults.forEach(result => {
        expect(result).toHaveProperty('fusionMetadata');
        expect(result.fusionMetadata.strategy).toBe('weighted');
      });
    });

    it('应该处理数量不匹配的情况', async () => {
      const localResults = [mockLocalResult];
      const cloudResults = [mockCloudResult, mockCloudResult];

      await expect(fusionService.fuseBatchResults(localResults, cloudResults))
        .rejects.toThrow('本地和云端结果数量不匹配');
    });

    it('应该支持顺序处理', async () => {
      const localResults = [mockLocalResult, mockLocalResult];
      const cloudResults = [mockCloudResult, mockCloudResult];

      const fusedResults = await fusionService.fuseBatchResults(
        localResults,
        cloudResults,
        { parallelProcessing: false }
      );

      expect(fusedResults).toHaveLength(2);
    });
  });

  describe('smartFusion', () => {
    it('应该智能选择融合策略', async () => {
      const fusedResult = await fusionService.smartFusion(mockLocalResult, mockCloudResult);

      expect(fusedResult).toHaveProperty('fusionMetadata');
      expect(['weighted', 'ensemble', 'selective', 'hybrid'])
        .toContain(fusedResult.fusionMetadata.strategy);
    });

    it('应该处理单一结果的智能融合', async () => {
      const fusedResult = await fusionService.smartFusion(mockLocalResult, null);
      expect(fusedResult.fusionMetadata.fallbackUsed).toBe(true);
    });
  });

  describe('融合策略', () => {
    describe('加权平均策略', () => {
      it('应该正确计算加权平均', async () => {
        const fusedResult = await fusionService.fuseResults(
          mockLocalResult,
          mockCloudResult,
          { strategy: 'weighted' }
        );

        // 验证匹配度是加权平均
        const expectedScore = mockLocalResult.matchScore * 0.4 + mockCloudResult.matchScore * 0.6;
        expect(fusedResult.matchScore).toBeCloseTo(expectedScore, 2);

        // 验证关键词融合
        expect(fusedResult.keywords.length).toBeGreaterThan(0);

        // 应该包含两个结果中的关键词
        const keywordTexts = fusedResult.keywords.map(k => k.text);
        expect(keywordTexts).toContain('React');
      });
    });

    describe('集成策略', () => {
      it('应该使用投票机制融合结果', async () => {
        const fusedResult = await fusionService.fuseResults(
          mockLocalResult,
          mockCloudResult,
          { strategy: 'ensemble' }
        );

        expect(fusedResult.fusionMetadata.strategy).toBe('ensemble');
        expect(fusedResult.keywords.length).toBeGreaterThan(0);
        expect(fusedResult.skills.length).toBeGreaterThan(0);
      });
    });

    describe('选择性策略', () => {
      it('应该根据置信度选择最佳部分', async () => {
        const fusedResult = await fusionService.fuseResults(
          mockLocalResult,
          mockCloudResult,
          { strategy: 'selective' }
        );

        expect(fusedResult.fusionMetadata.strategy).toBe('selective');

        // 由于云端置信度更高，应该选择云端结果
        expect(fusedResult.confidence).toBe(mockCloudResult.confidence);
      });
    });

    describe('混合策略', () => {
      it('应该结合多种策略的优点', async () => {
        const fusedResult = await fusionService.fuseResults(
          mockLocalResult,
          mockCloudResult,
          { strategy: 'hybrid' }
        );

        expect(fusedResult.fusionMetadata.strategy).toBe('hybrid');
        expect(fusedResult.keywords.length).toBeGreaterThan(0);
        expect(fusedResult.skills.length).toBeGreaterThan(0);
      });
    });
  });

  describe('质量评估', () => {
    it('应该评估融合结果质量', async () => {
      const fusedResult = await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      expect(fusedResult.fusionMetadata.qualityScore).toBeGreaterThan(0);
      expect(fusedResult.fusionMetadata.qualityScore).toBeLessThanOrEqual(1);
    });

    it('应该识别低质量结果', async () => {
      const lowQualityLocal = {
        ...mockLocalResult,
        keywords: [],
        skills: [],
        confidence: 0.2
      };

      const lowQualityCloud = {
        ...mockCloudResult,
        keywords: [],
        skills: [],
        confidence: 0.2
      };

      const fusedResult = await fusionService.fuseResults(
        lowQualityLocal,
        lowQualityCloud,
        { fallbackToSingle: true }
      );

      expect(fusedResult.fusionMetadata.qualityScore).toBeLessThan(0.6);
    });
  });

  describe('一致性计算', () => {
    it('应该计算结果一致性', async () => {
      // 创建高一致性的结果
      const consistentCloud = {
        ...mockCloudResult,
        keywords: mockLocalResult.keywords, // 相同的关键词
        skills: mockLocalResult.skills, // 相同的技能
        matchScore: mockLocalResult.matchScore // 相同的匹配度
      };

      const fusedResult = await fusionService.fuseResults(mockLocalResult, consistentCloud);

      // 高一致性应该导致高融合置信度
      expect(fusedResult.fusionMetadata.fusionConfidence).toBeGreaterThan(0.8);
    });

    it('应该处理低一致性结果', async () => {
      // 创建低一致性的结果
      const inconsistentCloud = {
        ...mockCloudResult,
        keywords: [
          { text: 'Python', importance: 0.9, category: 'technical' as const, frequency: 5 },
          { text: 'Django', importance: 0.8, category: 'technical' as const, frequency: 4 }
        ],
        skills: [
          { name: 'Python', category: 'backend' as any, importance: 0.9, matched: false, requiredLevel: 4 }
        ],
        matchScore: 0.3
      };

      const fusedResult = await fusionService.fuseResults(mockLocalResult, inconsistentCloud);

      // 低一致性应该导致较低的融合置信度
      expect(fusedResult.fusionMetadata.fusionConfidence).toBeLessThan(0.7);
    });
  });

  describe('融合历史', () => {
    it('应该记录融合历史', async () => {
      await fusionService.fuseResults(mockLocalResult, mockCloudResult);
      await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      const history = fusionService.getFusionHistory();
      expect(history).toHaveLength(2);

      history.forEach(result => {
        expect(result).toHaveProperty('fusionMetadata');
        expect(result.fusionMetadata).toHaveProperty('processingTime');
      });
    });

    it('应该限制历史记录大小', async () => {
      // 生成大量融合记录
      for (let i = 0; i < 120; i++) {
        await fusionService.fuseResults(mockLocalResult, mockCloudResult);
      }

      const history = fusionService.getFusionHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('应该清理历史记录', async () => {
      await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      let history = fusionService.getFusionHistory();
      expect(history.length).toBeGreaterThan(0);

      fusionService.clearHistory();

      history = fusionService.getFusionHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('配置管理', () => {
    it('应该返回当前配置', () => {
      const config = fusionService.getConfig();

      expect(config).toHaveProperty('localWeight');
      expect(config).toHaveProperty('cloudWeight');
      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('enableFallback');
      expect(config).toHaveProperty('fusionStrategy');
      expect(config).toHaveProperty('qualityThreshold');
    });

    it('应该更新配置', () => {
      const newConfig = {
        localWeight: 0.7,
        cloudWeight: 0.3,
        fusionStrategy: 'ensemble' as const
      };

      fusionService.updateConfig(newConfig);

      const config = fusionService.getConfig();
      expect(config.localWeight).toBe(0.7);
      expect(config.cloudWeight).toBe(0.3);
      expect(config.fusionStrategy).toBe('ensemble');
    });
  });

  describe('性能指标', () => {
    it('应该跟踪性能指标', async () => {
      await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      const metrics = fusionService.getPerformanceMetrics();

      expect(metrics).toHaveProperty('loadTime');
      expect(metrics).toHaveProperty('aiProcessingTime');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cacheHitRate');

      expect(metrics.aiProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理融合错误', async () => {
      // 创建会导致错误的结果
      const invalidLocal = null;
      const invalidCloud = null;

      await expect(fusionService.fuseResults(invalidLocal, invalidCloud))
        .rejects.toThrow('至少需要一个分析结果');
    });

    it('应该在启用降级时处理错误', async () => {
      const fallbackService = createResultFusionService({ enableFallback: true });

      // 即使发生错误，如果有有效结果也应该返回降级结果
      const result = await fallbackService.fuseResults(mockLocalResult, null);
      expect(result.fusionMetadata.fallbackUsed).toBe(true);
    });

    it('应该处理未知融合策略', async () => {
      await expect(
        fusionService.fuseResults(mockLocalResult, mockCloudResult, { strategy: 'unknown' as any })
      ).rejects.toThrow('未知的融合策略');
    });
  });

  describe('性能测试', () => {
    it('应该快速完成融合', async () => {
      const startTime = Date.now();

      await fusionService.fuseResults(mockLocalResult, mockCloudResult);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该高效处理批量融合', async () => {
      const localResults = Array(10).fill(mockLocalResult);
      const cloudResults = Array(10).fill(mockCloudResult);

      const startTime = Date.now();
      await fusionService.fuseBatchResults(localResults, cloudResults);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('边界情况', () => {
    it('应该处理空关键词和技能', async () => {
      const emptyLocal = {
        ...mockLocalResult,
        keywords: [],
        skills: []
      };

      const emptyCloud = {
        ...mockCloudResult,
        keywords: [],
        skills: []
      };

      const fusedResult = await fusionService.fuseResults(emptyLocal, emptyCloud);

      expect(fusedResult.keywords).toHaveLength(0);
      expect(fusedResult.skills).toHaveLength(0);
      expect(fusedResult.matchScore).toBeGreaterThanOrEqual(0);
    });

    it('应该处理极端权重值', async () => {
      const extremeWeights = { local: 1.0, cloud: 0.0 };

      const fusedResult = await fusionService.fuseResults(
        mockLocalResult,
        mockCloudResult,
        { weights: extremeWeights }
      );

      // 应该主要反映本地结果
      expect(fusedResult.matchScore).toBeCloseTo(mockLocalResult.matchScore, 2);
    });

    it('应该处理相同的输入结果', async () => {
      const identicalResult = { ...mockLocalResult };

      const fusedResult = await fusionService.fuseResults(mockLocalResult, identicalResult as any);

      expect(fusedResult.matchScore).toBeCloseTo(mockLocalResult.matchScore, 2);
      expect(fusedResult.fusionMetadata.fusionConfidence).toBeGreaterThan(0.9);
    });
  });
});