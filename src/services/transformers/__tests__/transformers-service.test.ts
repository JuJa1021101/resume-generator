/**
 * Transformers.js服务测试
 */

import { TransformersService, createTransformersService } from '../transformers-service';
import type { TransformersConfig, AnalysisOptions } from '../transformers-service';

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
  env: {
    allowRemoteModels: true,
    allowLocalModels: true
  }
}));

describe('TransformersService', () => {
  let service: TransformersService;
  let mockPipeline: jest.Mock;

  beforeEach(() => {
    const { pipeline } = require('@xenova/transformers');
    mockPipeline = pipeline as jest.Mock;

    // Mock pipeline返回值
    mockPipeline.mockResolvedValue(jest.fn().mockResolvedValue({
      result: 'mocked inference result'
    }));

    const config: Partial<TransformersConfig> = {
      modelName: 'Xenova/distilbert-base-uncased',
      task: 'feature-extraction',
      device: 'cpu',
      quantized: true,
      maxLength: 512,
      temperature: 0.3
    };

    service = createTransformersService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建服务', () => {
      const defaultService = createTransformersService();
      expect(defaultService).toBeInstanceOf(TransformersService);
    });

    it('应该使用自定义配置创建服务', () => {
      const customConfig: Partial<TransformersConfig> = {
        modelName: 'custom-model',
        maxLength: 256
      };
      const customService = createTransformersService(customConfig);
      expect(customService).toBeInstanceOf(TransformersService);
    });
  });

  describe('loadModel', () => {
    it('应该成功加载模型', async () => {
      const modelName = 'Xenova/distilbert-base-uncased';
      const task = 'feature-extraction';

      const model = await service.loadModel(modelName, task);

      expect(mockPipeline).toHaveBeenCalledWith(
        task,
        modelName,
        expect.objectContaining({
          quantized: true,
          device: 'cpu'
        })
      );
      expect(model).toBeDefined();
    });

    it('应该缓存已加载的模型', async () => {
      const modelName = 'Xenova/distilbert-base-uncased';
      const task = 'feature-extraction';

      // 第一次加载
      await service.loadModel(modelName, task);
      // 第二次加载（应该从缓存获取）
      await service.loadModel(modelName, task);

      // pipeline应该只被调用一次
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('应该处理模型加载失败', async () => {
      mockPipeline.mockRejectedValueOnce(new Error('Model load failed'));

      await expect(service.loadModel('invalid-model', 'invalid-task'))
        .rejects.toThrow('模型加载失败');
    });
  });

  describe('analyzeJobDescription', () => {
    const mockJobContent = `
      我们正在寻找一名经验丰富的前端开发工程师，要求：
      - 熟练掌握React、Vue.js等前端框架
      - 具备TypeScript开发经验
      - 了解Node.js后端开发
      - 良好的团队协作能力
    `;

    it('应该成功分析JD内容', async () => {
      const result = await service.analyzeJobDescription(mockJobContent);

      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('matchScore');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('localProcessing', true);
      expect(result).toHaveProperty('modelUsed');
      expect(result).toHaveProperty('modelMetadata');

      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(typeof result.matchScore).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });

    it('应该支持自定义分析选项', async () => {
      const options: Partial<AnalysisOptions> = {
        extractKeywords: true,
        analyzeSkills: false,
        language: 'en',
        confidenceThreshold: 0.8
      };

      const result = await service.analyzeJobDescription(mockJobContent, options);
      expect(result.keywords.length).toBeGreaterThan(0);
      // 由于analyzeSkills为false，技能数组应该为空
      expect(result.skills.length).toBe(0);
    });

    it('应该处理空内容', async () => {
      const result = await service.analyzeJobDescription('');
      expect(result.keywords.length).toBe(0);
      expect(result.skills.length).toBe(0);
      expect(result.matchScore).toBe(0);
    });

    it('应该处理分析错误', async () => {
      // Mock模型加载失败
      mockPipeline.mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(service.analyzeJobDescription(mockJobContent))
        .rejects.toThrow('JD分析失败');
    });
  });

  describe('extractKeywords', () => {
    it('应该提取中文关键词', async () => {
      const text = 'React开发工程师，需要熟练掌握TypeScript和Node.js';
      const keywords = await service.extractKeywords(text, 'zh');

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);

      keywords.forEach(keyword => {
        expect(keyword).toHaveProperty('text');
        expect(keyword).toHaveProperty('importance');
        expect(keyword).toHaveProperty('category');
        expect(keyword).toHaveProperty('frequency');
        expect(typeof keyword.importance).toBe('number');
        expect(keyword.importance).toBeGreaterThanOrEqual(0);
        expect(keyword.importance).toBeLessThanOrEqual(1);
      });
    });

    it('应该提取英文关键词', async () => {
      const text = 'Frontend developer with React and TypeScript experience';
      const keywords = await service.extractKeywords(text, 'en');

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('应该处理关键词提取失败', async () => {
      // Mock模型失败，应该使用fallback
      mockPipeline.mockRejectedValueOnce(new Error('Extraction failed'));

      const text = 'React TypeScript';
      const keywords = await service.extractKeywords(text);

      // 应该返回fallback结果
      expect(Array.isArray(keywords)).toBe(true);
    });
  });

  describe('analyzeSkills', () => {
    it('应该分析技能要求', async () => {
      const text = '需要熟练掌握React、Vue.js、TypeScript等技术';
      const skills = await service.analyzeSkills(text, 'zh');

      expect(Array.isArray(skills)).toBe(true);

      skills.forEach(skill => {
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('category');
        expect(skill).toHaveProperty('importance');
        expect(skill).toHaveProperty('matched');
        expect(skill).toHaveProperty('requiredLevel');
        expect(typeof skill.importance).toBe('number');
        expect(typeof skill.requiredLevel).toBe('number');
        expect(typeof skill.matched).toBe('boolean');
      });
    });

    it('应该处理技能分析失败', async () => {
      mockPipeline.mockRejectedValueOnce(new Error('Skill analysis failed'));

      const text = 'React TypeScript';
      const skills = await service.analyzeSkills(text);

      // 应该返回fallback结果
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('matchSkills', () => {
    const mockJobDescription = {
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

    const mockUserSkills = [
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

    it('应该匹配用户技能与岗位要求', async () => {
      const result = await service.matchSkills(mockJobDescription, mockUserSkills);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.overallScore).toBe('number');
      expect(Array.isArray(result.categoryScores)).toBe(true);
      expect(Array.isArray(result.gaps)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('应该处理技能匹配失败', async () => {
      mockPipeline.mockRejectedValueOnce(new Error('Skill matching failed'));

      await expect(service.matchSkills(mockJobDescription, mockUserSkills))
        .rejects.toThrow('技能匹配失败');
    });
  });

  describe('batchAnalyze', () => {
    const mockJobDescriptions = [
      'Frontend developer position requiring React skills',
      'Backend engineer with Node.js experience needed',
      'Full-stack developer with React and Node.js'
    ];

    it('应该批量分析多个JD', async () => {
      const results = await service.batchAnalyze(mockJobDescriptions);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(mockJobDescriptions.length);

      results.forEach(result => {
        expect(result).toHaveProperty('keywords');
        expect(result).toHaveProperty('skills');
        expect(result).toHaveProperty('localProcessing', true);
      });
    });

    it('应该处理批量分析中的单个失败', async () => {
      // Mock第二个分析失败
      let callCount = 0;
      mockPipeline.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Analysis failed');
        }
        return Promise.resolve(jest.fn().mockResolvedValue({ result: 'success' }));
      });

      const results = await service.batchAnalyze(mockJobDescriptions);

      // 应该返回成功的结果，跳过失败的
      expect(results.length).toBeLessThan(mockJobDescriptions.length);
    });
  });

  describe('getModelInfo', () => {
    it('应该返回所有模型信息', async () => {
      // 先加载一个模型
      await service.loadModel('Xenova/distilbert-base-uncased', 'feature-extraction');

      const modelInfo = service.getModelInfo();
      expect(Array.isArray(modelInfo)).toBe(true);
      expect(modelInfo.length).toBeGreaterThan(0);

      modelInfo.forEach(info => {
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('size');
        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('task');
        expect(info).toHaveProperty('language');
        expect(info).toHaveProperty('loadedAt');
        expect(info).toHaveProperty('performance');
      });
    });

    it('应该返回指定模型信息', async () => {
      const modelName = 'Xenova/distilbert-base-uncased';
      await service.loadModel(modelName, 'feature-extraction');

      const modelInfo = service.getModelInfo(modelName);
      expect(Array.isArray(modelInfo)).toBe(true);
      expect(modelInfo.length).toBeGreaterThan(0);
      expect(modelInfo[0].name).toBe(modelName);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('应该返回性能指标', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('loadTime');
      expect(metrics).toHaveProperty('aiProcessingTime');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cacheHitRate');

      expect(typeof metrics.loadTime).toBe('number');
      expect(typeof metrics.aiProcessingTime).toBe('number');
      expect(typeof metrics.renderTime).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
    });
  });

  describe('clearModelCache', () => {
    it('应该清理模型缓存', async () => {
      // 先加载一个模型
      await service.loadModel('Xenova/distilbert-base-uncased', 'feature-extraction');

      // 验证模型已加载
      let modelInfo = service.getModelInfo();
      expect(modelInfo.length).toBeGreaterThan(0);

      // 清理缓存
      service.clearModelCache();

      // 验证缓存已清理
      modelInfo = service.getModelInfo();
      expect(modelInfo.length).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的模型配置', async () => {
      const invalidConfig: Partial<TransformersConfig> = {
        modelName: '',
        maxLength: -1
      };

      expect(() => createTransformersService(invalidConfig)).not.toThrow();
    });

    it('应该处理网络错误', async () => {
      mockPipeline.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.loadModel('invalid-model', 'invalid-task'))
        .rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成分析', async () => {
      const startTime = Date.now();
      const content = 'React developer with TypeScript experience';

      await service.analyzeJobDescription(content);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在5秒内完成（考虑到模型加载时间）
      expect(duration).toBeLessThan(5000);
    });

    it('应该处理大量文本', async () => {
      const longContent = 'React developer '.repeat(1000);

      const result = await service.analyzeJobDescription(longContent);
      expect(result).toBeDefined();
      expect(result.keywords.length).toBeGreaterThan(0);
    });
  });
});