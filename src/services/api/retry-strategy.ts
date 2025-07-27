import { APIError } from './gpt4o-client';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError: APIError;
  elapsedTime: number;
}

export type RetryCallback<T> = () => Promise<T>;
export type FallbackCallback<T> = (error: APIError, context: RetryContext) => Promise<T>;

export class RetryStrategy {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...config,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    callback: RetryCallback<T>,
    fallback?: FallbackCallback<T>
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: APIError;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await callback();
      } catch (error) {
        lastError = error instanceof APIError ? error : this.wrapError(error);

        // Don't retry if error is not retryable
        if (!lastError.retryable) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        const delay = this.calculateDelay(attempt, lastError);
        await this.sleep(delay);
      }
    }

    // Try fallback if available
    if (fallback) {
      const context: RetryContext = {
        attempt: this.config.maxRetries + 1,
        totalAttempts: this.config.maxRetries + 1,
        lastError: lastError!,
        elapsedTime: Date.now() - startTime,
      };

      try {
        return await fallback(lastError!, context);
      } catch (fallbackError) {
        // If fallback also fails, throw the original error
        throw lastError!;
      }
    }

    throw lastError!;
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, error: APIError): number {
    // Use retry-after header if available
    if (error.retryAfter) {
      return Math.min(error.retryAfter, this.config.maxDelay);
    }

    // Calculate exponential backoff
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap unknown errors in APIError
   */
  private wrapError(error: unknown): APIError {
    if (error instanceof APIError) {
      return error;
    }

    return new APIError({
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      type: 'server',
      retryable: false,
    });
  }
}

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) { }

  async execute<T>(callback: RetryCallback<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new APIError({
          code: 'CIRCUIT_BREAKER_OPEN',
          message: 'Circuit breaker is open, service temporarily unavailable',
          type: 'server',
          retryable: true,
          retryAfter: this.recoveryTimeout - (Date.now() - this.lastFailureTime),
        });
      }
    }

    try {
      const result = await callback();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Rate limiter to control request frequency
 */
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number = 60,
    private windowMs: number = 60000 // 1 minute
  ) { }

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      throw new APIError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`,
        type: 'rate_limit',
        retryable: true,
        retryAfter: waitTime,
      });
    }

    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Cost controller to manage API usage costs
 */
export class CostController {
  private totalCost: number = 0;
  private dailyCost: number = 0;
  private lastResetDate: string = '';

  constructor(
    private dailyLimit: number = 10.0, // $10 daily limit
    private costPerToken: number = 0.00003 // GPT-4o pricing
  ) {
    this.resetDailyIfNeeded();
  }

  checkCost(estimatedTokens: number): void {
    this.resetDailyIfNeeded();

    const estimatedCost = estimatedTokens * this.costPerToken;

    if (this.dailyCost + estimatedCost > this.dailyLimit) {
      throw new APIError({
        code: 'DAILY_COST_LIMIT_EXCEEDED',
        message: `Daily cost limit of $${this.dailyLimit} would be exceeded`,
        type: 'quota',
        retryable: false,
      });
    }
  }

  recordUsage(tokens: number): void {
    const cost = tokens * this.costPerToken;
    this.totalCost += cost;
    this.dailyCost += cost;
  }

  private resetDailyIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyCost = 0;
      this.lastResetDate = today;
    }
  }

  getUsageStats() {
    this.resetDailyIfNeeded();
    return {
      totalCost: this.totalCost,
      dailyCost: this.dailyCost,
      remainingDailyBudget: this.dailyLimit - this.dailyCost,
      dailyLimit: this.dailyLimit,
    };
  }

  reset(): void {
    this.totalCost = 0;
    this.dailyCost = 0;
    this.lastResetDate = '';
  }
}