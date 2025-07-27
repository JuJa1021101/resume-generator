import { GPT4oClient, APIError } from '../gpt4o-client';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('GPT4oClient', () => {
  let client: GPT4oClient;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    client = new GPT4oClient({
      apiKey: 'sk-test-key',
      maxTokens: 1000,
      temperature: 0.3,
    });
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new GPT4oClient({ apiKey: 'sk-test' });
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
        timeout: 30000,
      });
    });

    it('should create client with custom config', () => {
      const customClient = new GPT4oClient({
        apiKey: 'sk-custom',
        baseURL: 'https://custom.api.com',
        timeout: 60000,
      });

      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'sk-custom',
        baseURL: 'https://custom.api.com',
        timeout: 60000,
      });
    });
  });

  describe('analyzeJobDescription', () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            keywords: [
              { text: 'React', importance: 0.9, category: 'technical', frequency: 3 },
              { text: 'JavaScript', importance: 0.8, category: 'technical', frequency: 2 },
            ],
            skills: [
              { name: 'React', category: 'frontend', importance: 0.9, matched: false, requiredLevel: 4 },
            ],
            matchScore: 0.75,
            suggestions: ['学习React框架'],
            confidence: 0.85,
          }),
        },
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);
    });

    it('should analyze job description successfully', async () => {
      const request = {
        content: 'Looking for a React developer with JavaScript experience',
        type: 'jd-analysis' as const,
      };

      const result = await client.analyzeJobDescription(request);

      expect(result.result.keywords).toHaveLength(2);
      expect(result.result.skills).toHaveLength(1);
      expect(result.result.matchScore).toBe(0.75);
      expect(result.usage.totalTokens).toBe(300);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle keyword extraction request', async () => {
      const request = {
        content: 'React developer position',
        type: 'keyword-extraction' as const,
      };

      await client.analyzeJobDescription(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('提取岗位描述中的关键技能词汇'),
          },
          {
            role: 'user',
            content: expect.stringContaining('React developer position'),
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
    });

    it('should handle skill matching request', async () => {
      const request = {
        content: 'React developer position',
        type: 'skill-matching' as const,
        userSkills: ['React', 'JavaScript'],
      };

      await client.analyzeJobDescription(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('分析用户技能与岗位要求的匹配度'),
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('React, JavaScript'),
            }),
          ],
        })
      );
    });

    it('should enforce rate limiting', async () => {
      const request = {
        content: 'Test content',
        type: 'jd-analysis' as const,
      };

      const startTime = Date.now();

      // Make two requests quickly
      await client.analyzeJobDescription(request);
      await client.analyzeJobDescription(request);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it('should validate request content', async () => {
      const emptyRequest = {
        content: '',
        type: 'jd-analysis' as const,
      };

      await expect(client.analyzeJobDescription(emptyRequest))
        .rejects
        .toThrow(APIError);

      const longRequest = {
        content: 'a'.repeat(10001),
        type: 'jd-analysis' as const,
      };

      await expect(client.analyzeJobDescription(longRequest))
        .rejects
        .toThrow(APIError);
    });

    it('should handle API errors', async () => {
      const apiError = new OpenAI.APIError(
        'Rate limit exceeded',
        { status: 429, headers: { 'retry-after': '60' } },
        'rate_limit_exceeded',
        429
      );

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const request = {
        content: 'Test content',
        type: 'jd-analysis' as const,
      };

      await expect(client.analyzeJobDescription(request))
        .rejects
        .toMatchObject({
          code: 'rate_limit_exceeded',
          type: 'rate_limit',
          retryable: true,
          retryAfter: 60000,
        });
    });

    it('should handle invalid JSON response', async () => {
      const invalidResponse = {
        ...mockResponse,
        choices: [{
          message: { content: 'invalid json' },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(invalidResponse as any);

      const request = {
        content: 'Test content',
        type: 'jd-analysis' as const,
      };

      await expect(client.analyzeJobDescription(request))
        .rejects
        .toMatchObject({
          code: 'INVALID_RESPONSE',
          type: 'server',
          retryable: false,
        });
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              keywords: [
                { text: 'React', importance: 0.9, category: 'technical', frequency: 3 },
              ],
              skills: [],
              matchScore: 0,
              suggestions: [],
              confidence: 0.85,
            }),
          },
        }],
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const keywords = await client.extractKeywords('React developer position');

      expect(keywords).toHaveLength(1);
      expect(keywords[0].text).toBe('React');
      expect(keywords[0].importance).toBe(0.9);
    });
  });

  describe('matchSkills', () => {
    it('should match user skills against job requirements', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              keywords: [],
              skills: [
                { name: 'React', category: 'frontend', importance: 0.9, matched: true, userLevel: 4, requiredLevel: 4 },
              ],
              matchScore: 0.8,
              suggestions: ['继续提升React技能'],
              confidence: 0.9,
            }),
          },
        }],
        usage: { prompt_tokens: 80, completion_tokens: 120, total_tokens: 200 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await client.matchSkills('React developer', ['React', 'JavaScript']);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].matched).toBe(true);
      expect(result.matchScore).toBe(0.8);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', () => {
      const stats = client.getUsageStats();

      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('lastRequestTime');
      expect(typeof stats.requestCount).toBe('number');
      expect(typeof stats.lastRequestTime).toBe('number');
    });
  });

  describe('resetUsageStats', () => {
    it('should reset usage statistics', () => {
      client.resetUsageStats();
      const stats = client.getUsageStats();

      expect(stats.requestCount).toBe(0);
      expect(stats.lastRequestTime).toBe(0);
    });
  });
});