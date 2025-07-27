import { GPT4oService, createGPT4oService, getGPT4oService } from '../gpt4o-service';
import { GPT4oClient, APIError } from '../gpt4o-client';
import { PersistentResponseCache } from '../response-cache';
import { AIAnalysisResult } from '../../../types';

// Mock dependencies
jest.mock('../gpt4o-client');
jest.mock('../response-cache');

const MockedGPT4oClient = GPT4oClient as jest.MockedClass<typeof GPT4oClient>;
const MockedPersistentResponseCache = PersistentResponseCache as jest.MockedClass<typeof PersistentResponseCache>;

describe('GPT4oService', () => {
  let service: GPT4oService;
  let mockClient: jest.Mocked<GPT4oClient>;
  let mockCache: jest.Mocked<PersistentResponseCache>;

  const mockAnalysisResult: AIAnalysisResult = {
    keywords: [
      { text: 'React', importance: 0.9, category: 'technical', frequency: 3 },
    ],
    skills: [
      { name: 'React', category: 'frontend', importance: 0.9, matched: false, requiredLevel: 4 },
    ],
    matchScore: 0.75,
    suggestions: ['Learn React'],
    processingTime: 1000,
    confidence: 0.85,
  };

  const mockGPT4oResponse = {
    result: mockAnalysisResult,
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
    },
    processingTime: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup client mock
    mockClient = {
      analyzeJobDescription: jest.fn().mockResolvedValue(mockGPT4oResponse),
      extractKeywords: jest.fn().mockResolvedValue(mockAnalysisResult.keywords),
      matchSkills: jest.fn().mockResolvedValue(mockAnalysisResult),
      getUsageStats: jest.fn().mockReturnValue({ requestCount: 0, lastRequestTime: 0 }),
      resetUsageStats: jest.fn(),
    } as any;

    MockedGPT4oClient.mockImplementation(() => mockClient);

    // Setup cache mock
    mockCache = {
      init: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(undefined),
      generateKey: jest.fn().mockReturnValue('cache-key'),
      getStats: jest.fn().mockReturnValue({
        size: 0,
        maxSize: 100,
        hitRate: 0,
        totalRequests: 0,
        totalHits: 0,
        totalMisses: 0,
        oldestEntry: 0,
        newestEntry: 0,
      }),
    } as any;

    MockedPersistentResponseCache.mockImplementation(() => mockCache);

    service = new GPT4oService({
      apiKey: 'sk-test-key',
      enableCache: true,
      enableRetry: true,
      enableCircuitBreaker: true,
      enableRateLimit: true,
      enableCostControl: true,
    });
  });

  describe('constructor', () => {
    it('should create service with default configuration', () => {
      const defaultService = new GPT4oService({ apiKey: 'sk-test' });

      expect(MockedGPT4oClient).toHaveBeenCalledWith({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 30000,
      });
    });

    it('should create service with custom configuration', () => {
      const customService = new GPT4oService({
        apiKey: 'sk-custom',
        maxTokens: 1000,
        temperature: 0.5,
        enableCache: false,
      });

      expect(MockedGPT4oClient).toHaveBeenCalledWith({
        apiKey: 'sk-custom',
        baseURL: 'https://api.openai.com/v1',
        maxTokens: 1000,
        temperature: 0.5,
        timeout: 30000,
      });
    });
  });

  describe('init', () => {
    it('should initialize cache when enabled', async () => {
      await service.init();

      expect(mockCache.init).toHaveBeenCalled();
    });

    it('should not initialize cache when disabled', async () => {
      const serviceWithoutCache = new GPT4oService({
        apiKey: 'sk-test',
        enableCache: false,
      });

      await serviceWithoutCache.init();

      expect(mockCache.init).not.toHaveBeenCalled();
    });
  });

  describe('analyzeJobDescription', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should return cached result when available', async () => {
      mockCache.get.mockResolvedValue(mockAnalysisResult);

      const result = await service.analyzeJobDescription('Test job description');

      expect(result).toEqual(mockAnalysisResult);
      expect(mockCache.get).toHaveBeenCalledWith('cache-key');
      expect(mockClient.analyzeJobDescription).not.toHaveBeenCalled();
    });

    it('should call API when cache miss', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.analyzeJobDescription('Test job description');

      expect(result).toEqual(mockAnalysisResult);
      expect(mockClient.analyzeJobDescription).toHaveBeenCalledWith({
        content: 'Test job description',
        type: 'jd-analysis',
        userSkills: undefined,
      });
      expect(mockCache.set).toHaveBeenCalledWith('cache-key', mockAnalysisResult);
    });

    it('should handle API errors with retry', async () => {
      mockCache.get.mockResolvedValue(null);

      const apiError = new APIError({
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        type: 'rate_limit',
        retryable: true,
      });

      mockClient.analyzeJobDescription
        .mockRejectedValueOnce(apiError)
        .mockResolvedValue(mockGPT4oResponse);

      const result = await service.analyzeJobDescription('Test job description');

      expect(result).toEqual(mockAnalysisResult);
      expect(mockClient.analyzeJobDescription).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when all retries fail', async () => {
      mockCache.get.mockResolvedValue(null);

      const apiError = new APIError({
        code: 'SERVER_ERROR',
        message: 'Server error',
        type: 'server',
        retryable: true,
      });

      mockClient.analyzeJobDescription.mockRejectedValue(apiError);

      const result = await service.analyzeJobDescription('Test job description');

      expect(result.suggestions).toContain('API服务暂时不可用，请稍后重试');
      expect(result.confidence).toBe(0);
    });

    it('should not cache results with low confidence', async () => {
      mockCache.get.mockResolvedValue(null);

      const lowConfidenceResult = {
        ...mockGPT4oResponse,
        result: {
          ...mockAnalysisResult,
          confidence: 0,
        },
      };

      mockClient.analyzeJobDescription.mockResolvedValue(lowConfidenceResult);

      await service.analyzeJobDescription('Test job description');

      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should handle different analysis types', async () => {
      mockCache.get.mockResolvedValue(null);

      await service.analyzeJobDescription('Test content', 'keyword-extraction', ['React']);

      expect(mockClient.analyzeJobDescription).toHaveBeenCalledWith({
        content: 'Test content',
        type: 'keyword-extraction',
        userSkills: ['React'],
      });
    });
  });

  describe('extractKeywords', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should call analyzeJobDescription with keyword-extraction type', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.extractKeywords('Test job description');

      expect(result).toEqual(mockAnalysisResult);
      expect(mockClient.analyzeJobDescription).toHaveBeenCalledWith({
        content: 'Test job description',
        type: 'keyword-extraction',
        userSkills: undefined,
      });
    });
  });

  describe('matchSkills', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should call analyzeJobDescription with skill-matching type', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.matchSkills('Test job description', ['React', 'JavaScript']);

      expect(result).toEqual(mockAnalysisResult);
      expect(mockClient.analyzeJobDescription).toHaveBeenCalledWith({
        content: 'Test job description',
        type: 'skill-matching',
        userSkills: ['React', 'JavaScript'],
      });
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should return comprehensive service statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('requests');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('costs');
      expect(stats).toHaveProperty('circuitBreaker');
      expect(stats).toHaveProperty('rateLimit');

      expect(stats.requests).toHaveProperty('total');
      expect(stats.requests).toHaveProperty('successful');
      expect(stats.requests).toHaveProperty('failed');
      expect(stats.requests).toHaveProperty('cached');
    });

    it('should calculate performance metrics correctly', async () => {
      mockCache.get.mockResolvedValue(null);

      // Make some requests to generate stats
      await service.analyzeJobDescription('Test 1');
      await service.analyzeJobDescription('Test 2');

      const stats = service.getStats();

      expect(stats.requests.total).toBe(2);
      expect(stats.requests.successful).toBe(2);
      expect(stats.performance.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset all statistics and states', () => {
      service.reset();

      const stats = service.getStats();
      expect(stats.requests.total).toBe(0);
      expect(stats.requests.successful).toBe(0);
      expect(stats.requests.failed).toBe(0);
      expect(stats.requests.cached).toBe(0);
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should clear cache when enabled', async () => {
      await service.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('should return healthy status when all systems are normal', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('circuitBreakerOpen', false);
      expect(health.details).toHaveProperty('highFailureRate', false);
      expect(health.details).toHaveProperty('rateLimitExhausted', false);
      expect(health.details).toHaveProperty('budgetExhausted', false);
    });

    it('should return degraded status with high failure rate', async () => {
      mockCache.get.mockResolvedValue(null);

      const apiError = new APIError({
        code: 'SERVER_ERROR',
        message: 'Server error',
        type: 'server',
        retryable: false,
      });

      mockClient.analyzeJobDescription.mockRejectedValue(apiError);

      // Generate failures
      try {
        await service.analyzeJobDescription('Test 1');
      } catch { }
      try {
        await service.analyzeJobDescription('Test 2');
      } catch { }

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details).toHaveProperty('highFailureRate', true);
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      service.destroy();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});

describe('Service Factory Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGPT4oService', () => {
    it('should create and return new service instance', () => {
      const service = createGPT4oService({ apiKey: 'sk-test' });

      expect(service).toBeInstanceOf(GPT4oService);
      expect(getGPT4oService()).toBe(service);
    });

    it('should destroy existing instance before creating new one', () => {
      const service1 = createGPT4oService({ apiKey: 'sk-test1' });
      const destroySpy = jest.spyOn(service1, 'destroy');

      const service2 = createGPT4oService({ apiKey: 'sk-test2' });

      expect(destroySpy).toHaveBeenCalled();
      expect(getGPT4oService()).toBe(service2);
      expect(getGPT4oService()).not.toBe(service1);
    });
  });

  describe('getGPT4oService', () => {
    it('should return null when no service exists', () => {
      expect(getGPT4oService()).toBeNull();
    });

    it('should return existing service instance', () => {
      const service = createGPT4oService({ apiKey: 'sk-test' });

      expect(getGPT4oService()).toBe(service);
    });
  });
});