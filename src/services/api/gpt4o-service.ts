import { GPT4oClient, GPT4oConfig, GPT4oRequest, GPT4oResponse, APIError } from './gpt4o-client';
import { RetryStrategy, CircuitBreaker, RateLimiter, CostController } from './retry-strategy';
import { PersistentResponseCache } from './response-cache';
import { AIAnalysisResult } from '../../types';

export interface GPT4oServiceConfig extends GPT4oConfig {
  enableCache?: boolean;
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  enableRateLimit?: boolean;
  enableCostControl?: boolean;
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  rateLimitConfig?: {
    maxRequests?: number;
    windowMs?: number;
  };
  costConfig?: {
    dailyLimit?: number;
    costPerToken?: number;
  };
  cacheConfig?: {
    maxSize?: number;
    defaultTTL?: number;
  };
}

export interface ServiceStats {
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  performance: {
    averageResponseTime: number;
    fastestResponse: number;
    slowestResponse: number;
  };
  cache: {
    hitRate: number;
    size: number;
    maxSize: number;
  };
  costs: {
    totalCost: number;
    dailyCost: number;
    remainingBudget: number;
  };
  circuitBreaker: {
    state: string;
    failures: number;
  };
  rateLimit: {
    remainingRequests: number;
  };
}

/**
 * Main GPT-4o service with comprehensive error handling, caching, and monitoring
 */
export class GPT4oService {
  private client: GPT4oClient;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private costController: CostController;
  private cache: PersistentResponseCache<AIAnalysisResult>;
  private config: Required<GPT4oServiceConfig>;

  // Statistics tracking
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    responseTimes: [] as number[],
  };

  constructor(config: GPT4oServiceConfig) {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      maxTokens: 2000,
      temperature: 0.3,
      timeout: 30000,
      enableCache: true,
      enableRetry: true,
      enableCircuitBreaker: true,
      enableRateLimit: true,
      enableCostControl: true,
      retryConfig: {},
      rateLimitConfig: {},
      costConfig: {},
      cacheConfig: {},
      ...config,
    };

    this.client = new GPT4oClient({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      timeout: this.config.timeout,
    });

    this.retryStrategy = new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      ...this.config.retryConfig,
    });

    this.circuitBreaker = new CircuitBreaker(5, 60000);

    this.rateLimiter = new RateLimiter(
      this.config.rateLimitConfig.maxRequests || 60,
      this.config.rateLimitConfig.windowMs || 60000
    );

    this.costController = new CostController(
      this.config.costConfig.dailyLimit || 10.0,
      this.config.costConfig.costPerToken || 0.00003
    );

    this.cache = new PersistentResponseCache<AIAnalysisResult>(
      'gpt4o-cache',
      'responses',
      {
        maxSize: this.config.cacheConfig.maxSize || 100,
        defaultTTL: this.config.cacheConfig.defaultTTL || 3600000,
        ...this.config.cacheConfig,
      }
    );
  }

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    if (this.config.enableCache) {
      await this.cache.init();
    }
  }

  /**
   * Analyze job description with full error handling and caching
   */
  async analyzeJobDescription(
    content: string,
    type: 'jd-analysis' | 'keyword-extraction' | 'skill-matching' = 'jd-analysis',
    userSkills?: string[]
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Check cache first
      if (this.config.enableCache) {
        const cacheKey = this.cache.generateKey(content, type, userSkills);
        const cachedResult = await this.cache.get(cacheKey);

        if (cachedResult) {
          this.stats.cachedRequests++;
          return cachedResult;
        }
      }

      // Check rate limit
      if (this.config.enableRateLimit) {
        await this.rateLimiter.checkLimit();
      }

      // Estimate cost
      if (this.config.enableCostControl) {
        const estimatedTokens = Math.ceil(content.length / 4) + this.config.maxTokens;
        this.costController.checkCost(estimatedTokens);
      }

      const request: GPT4oRequest = {
        content,
        type,
        userSkills,
      };

      // Execute with retry and circuit breaker
      const executeRequest = async (): Promise<GPT4oResponse> => {
        if (this.config.enableCircuitBreaker) {
          return await this.circuitBreaker.execute(() => this.client.analyzeJobDescription(request));
        } else {
          return await this.client.analyzeJobDescription(request);
        }
      };

      const fallback = async (error: APIError): Promise<GPT4oResponse> => {
        // Fallback to local processing or simplified response
        console.warn('GPT-4o API failed, using fallback:', error.message);

        return {
          result: {
            keywords: [],
            skills: [],
            matchScore: 0,
            suggestions: ['API服务暂时不可用，请稍后重试'],
            processingTime: Date.now() - startTime,
            confidence: 0,
          },
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          processingTime: Date.now() - startTime,
        };
      };

      let response: GPT4oResponse;

      if (this.config.enableRetry) {
        response = await this.retryStrategy.execute(executeRequest, fallback);
      } else {
        try {
          response = await executeRequest();
        } catch (error) {
          response = await fallback(error as APIError);
        }
      }

      // Record usage for cost tracking
      if (this.config.enableCostControl && response.usage.totalTokens > 0) {
        this.costController.recordUsage(response.usage.totalTokens);
      }

      // Cache the result
      if (this.config.enableCache && response.result.confidence > 0) {
        const cacheKey = this.cache.generateKey(content, type, userSkills);
        await this.cache.set(cacheKey, response.result);
      }

      // Update statistics
      this.stats.successfulRequests++;
      this.stats.responseTimes.push(response.processingTime);

      return response.result;

    } catch (error) {
      this.stats.failedRequests++;

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown service error',
        type: 'server',
        retryable: false,
      });
    }
  }

  /**
   * Extract keywords from job description
   */
  async extractKeywords(content: string): Promise<AIAnalysisResult> {
    return this.analyzeJobDescription(content, 'keyword-extraction');
  }

  /**
   * Match user skills against job requirements
   */
  async matchSkills(jobContent: string, userSkills: string[]): Promise<AIAnalysisResult> {
    return this.analyzeJobDescription(jobContent, 'skill-matching', userSkills);
  }

  /**
   * Get comprehensive service statistics
   */
  getStats(): ServiceStats {
    const responseTimes = this.stats.responseTimes;
    const cacheStats = this.cache.getStats();
    const costStats = this.costController.getUsageStats();
    const circuitBreakerState = this.circuitBreaker.getState();

    return {
      requests: {
        total: this.stats.totalRequests,
        successful: this.stats.successfulRequests,
        failed: this.stats.failedRequests,
        cached: this.stats.cachedRequests,
      },
      performance: {
        averageResponseTime: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
        fastestResponse: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        slowestResponse: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      },
      cache: {
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
      },
      costs: {
        totalCost: costStats.totalCost,
        dailyCost: costStats.dailyCost,
        remainingBudget: costStats.remainingDailyBudget,
      },
      circuitBreaker: {
        state: circuitBreakerState.state,
        failures: circuitBreakerState.failures,
      },
      rateLimit: {
        remainingRequests: this.rateLimiter.getRemainingRequests(),
      },
    };
  }

  /**
   * Reset all statistics and states
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      responseTimes: [],
    };

    this.circuitBreaker.reset();
    this.rateLimiter.reset();
    this.costController.reset();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (this.config.enableCache) {
      await this.cache.clear();
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  }> {
    const stats = this.getStats();
    const circuitBreakerOpen = stats.circuitBreaker.state === 'open';
    const highFailureRate = stats.requests.total > 0 &&
      (stats.requests.failed / stats.requests.total) > 0.5;
    const rateLimitExhausted = stats.rateLimit.remainingRequests === 0;
    const budgetExhausted = stats.costs.remainingBudget <= 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (circuitBreakerOpen || budgetExhausted) {
      status = 'unhealthy';
    } else if (highFailureRate || rateLimitExhausted) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        circuitBreakerOpen,
        highFailureRate,
        rateLimitExhausted,
        budgetExhausted,
        stats,
      },
    };
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy(): void {
    // Cleanup cache resources
    if (this.cache) {
      this.cache.clear();
    }
  }
}

// Export singleton instance factory
let serviceInstance: GPT4oService | null = null;

export function createGPT4oService(config: GPT4oServiceConfig): GPT4oService {
  if (serviceInstance) {
    serviceInstance.destroy();
  }

  serviceInstance = new GPT4oService(config);
  return serviceInstance;
}

export function getGPT4oService(): GPT4oService | null {
  return serviceInstance;
}