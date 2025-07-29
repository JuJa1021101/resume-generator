import 'openai/shims/node';
import OpenAI from 'openai';
import { AIAnalysisResult, Keyword } from '../../types';

export interface GPT4oConfig {
  apiKey: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface GPT4oRequest {
  content: string;
  type: 'jd-analysis' | 'keyword-extraction' | 'skill-matching';
  userSkills?: string[];
  context?: Record<string, unknown>;
}

export interface GPT4oResponse {
  result: AIAnalysisResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

export interface APIErrorInfo {
  code: string;
  message: string;
  type: 'auth' | 'rate_limit' | 'quota' | 'network' | 'server' | 'validation';
  retryable: boolean;
  retryAfter?: number;
}

export class GPT4oClient {
  private client: OpenAI;
  private config: Required<GPT4oConfig>;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  constructor(config: GPT4oConfig) {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      maxTokens: 2000,
      temperature: 0.3,
      timeout: 30000,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
    });
  }

  /**
   * Analyze job description and extract key information
   */
  async analyzeJobDescription(request: GPT4oRequest): Promise<GPT4oResponse> {
    this.validateRequest(request);
    await this.enforceRateLimit();

    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(request);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.type),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      });

      const processingTime = Date.now() - startTime;
      const result = this.parseResponse(completion.choices[0].message.content || '{}');

      return {
        result: {
          ...result,
          processingTime,
        },
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        processingTime,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Extract keywords from job description
   */
  async extractKeywords(content: string): Promise<Keyword[]> {
    const request: GPT4oRequest = {
      content,
      type: 'keyword-extraction',
    };

    const response = await this.analyzeJobDescription(request);
    return response.result.keywords;
  }

  /**
   * Match user skills against job requirements
   */
  async matchSkills(jobContent: string, userSkills: string[]): Promise<AIAnalysisResult> {
    const request: GPT4oRequest = {
      content: jobContent,
      type: 'skill-matching',
      userSkills,
    };

    const response = await this.analyzeJobDescription(request);
    return response.result;
  }

  private validateRequest(request: GPT4oRequest): void {
    if (!request.content || request.content.trim().length === 0) {
      throw new APIError({
        code: 'INVALID_REQUEST',
        message: 'Content cannot be empty',
        type: 'validation',
        retryable: false,
      });
    }

    if (request.content.length > 10000) {
      throw new APIError({
        code: 'CONTENT_TOO_LONG',
        message: 'Content exceeds maximum length of 10,000 characters',
        type: 'validation',
        retryable: false,
      });
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private buildPrompt(request: GPT4oRequest): string {
    switch (request.type) {
      case 'jd-analysis':
        return `请分析以下岗位描述，提取关键信息：\n\n${request.content}`;

      case 'keyword-extraction':
        return `请从以下岗位描述中提取关键技能词汇：\n\n${request.content}`;

      case 'skill-matching':
        return `请分析以下岗位要求与用户技能的匹配度：\n\n岗位要求：\n${request.content}\n\n用户技能：\n${request.userSkills?.join(', ') || ''}`;

      default:
        throw new Error(`Unsupported request type: ${request.type}`);
    }
  }

  private getSystemPrompt(type: GPT4oRequest['type']): string {
    const basePrompt = `你是一个专业的简历分析AI助手，专门帮助求职者分析岗位要求并优化简历。请以JSON格式返回结果。`;

    switch (type) {
      case 'jd-analysis':
        return `${basePrompt}

请分析岗位描述并返回以下JSON格式：
{
  "keywords": [
    {
      "text": "关键词",
      "importance": 0.9,
      "category": "technical|soft|domain",
      "frequency": 3
    }
  ],
  "skills": [
    {
      "name": "技能名称",
      "category": "frontend|backend|database|devops|mobile|design|soft-skills|tools|languages",
      "importance": 0.8,
      "matched": false,
      "requiredLevel": 4
    }
  ],
  "matchScore": 0,
  "suggestions": ["建议1", "建议2"],
  "confidence": 0.85
}`;

      case 'keyword-extraction':
        return `${basePrompt}

请提取岗位描述中的关键技能词汇，返回JSON格式：
{
  "keywords": [
    {
      "text": "关键词",
      "importance": 0.9,
      "category": "technical|soft|domain",
      "frequency": 3
    }
  ],
  "skills": [],
  "matchScore": 0,
  "suggestions": [],
  "confidence": 0.85
}`;

      case 'skill-matching':
        return `${basePrompt}

请分析用户技能与岗位要求的匹配度，返回JSON格式：
{
  "keywords": [],
  "skills": [
    {
      "name": "技能名称",
      "category": "frontend|backend|database|devops|mobile|design|soft-skills|tools|languages",
      "importance": 0.8,
      "matched": true,
      "userLevel": 4,
      "requiredLevel": 4
    }
  ],
  "matchScore": 0.75,
  "suggestions": ["基于匹配结果的建议"],
  "confidence": 0.85
}`;

      default:
        return basePrompt;
    }
  }

  private parseResponse(content: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(content);

      return {
        keywords: parsed.keywords || [],
        skills: parsed.skills || [],
        matchScore: parsed.matchScore || 0,
        suggestions: parsed.suggestions || [],
        processingTime: 0, // Will be set by caller
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      throw new APIError({
        code: 'INVALID_RESPONSE',
        message: 'Failed to parse API response',
        type: 'server',
        retryable: false,
      });
    }
  }

  private handleError(error: unknown): APIError {
    if (error instanceof APIError) {
      return error;
    }

    if (error && typeof error === 'object' && 'status' in error) {
      const openAIError = error as any;
      return new APIError({
        code: openAIError.code || 'OPENAI_ERROR',
        message: openAIError.message || 'OpenAI API error',
        type: this.mapOpenAIErrorType(openAIError),
        retryable: this.isRetryableError(openAIError),
        retryAfter: this.getRetryAfter(openAIError),
      });
    }

    if (error instanceof Error) {
      return new APIError({
        code: 'UNKNOWN_ERROR',
        message: error.message,
        type: 'server',
        retryable: false,
      });
    }

    return new APIError({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      type: 'server',
      retryable: false,
    });
  }

  private mapOpenAIErrorType(error: any): APIErrorInfo['type'] {
    if (error.status === 401) return 'auth';
    if (error.status === 429) return 'rate_limit';
    if (error.status === 402) return 'quota';
    if (error.status >= 400 && error.status < 500) return 'validation';
    if (error.status >= 500) return 'server';
    return 'network';
  }

  private isRetryableError(error: any): boolean {
    return error.status === 429 || error.status >= 500;
  }

  private getRetryAfter(error: any): number | undefined {
    const retryAfter = error.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
    }
    return undefined;
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

// Custom APIError class
export class APIError extends Error {
  public readonly code: string;
  public readonly type: APIErrorInfo['type'];
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(params: APIErrorInfo) {
    super(params.message);
    this.name = 'APIError';
    this.code = params.code;
    this.type = params.type;
    this.retryable = params.retryable;
    this.retryAfter = params.retryAfter;
  }
}