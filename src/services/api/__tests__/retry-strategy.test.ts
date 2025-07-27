import { RetryStrategy, CircuitBreaker, RateLimiter, CostController } from '../retry-strategy';
import { APIError } from '../gpt4o-client';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false,
    });
  });

  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      const callback = jest.fn().mockResolvedValue('success');

      const result = await retryStrategy.execute(callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new APIError({
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        type: 'rate_limit',
        retryable: true,
      });

      const callback = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await retryStrategy.execute(callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new APIError({
        code: 'AUTH_ERROR',
        message: 'Invalid API key',
        type: 'auth',
        retryable: false,
      });

      const callback = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(retryStrategy.execute(callback))
        .rejects
        .toThrow(nonRetryableError);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when all retries fail', async () => {
      const error = new APIError({
        code: 'SERVER_ERROR',
        message: 'Server error',
        type: 'server',
        retryable: true,
      });

      const callback = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn().mockResolvedValue('fallback-result');

      const result = await retryStrategy.execute(callback, fallback);

      expect(result).toBe('fallback-result');
      expect(callback).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should respect retry-after header', async () => {
      const errorWithRetryAfter = new APIError({
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        type: 'rate_limit',
        retryable: true,
        retryAfter: 200,
      });

      const callback = jest.fn()
        .mockRejectedValueOnce(errorWithRetryAfter)
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await retryStrategy.execute(callback);
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
    });

    it('should calculate exponential backoff correctly', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 2,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false,
      });

      const error = new APIError({
        code: 'SERVER_ERROR',
        message: 'Server error',
        type: 'server',
        retryable: true,
      });

      const callback = jest.fn().mockRejectedValue(error);
      const startTime = Date.now();

      await expect(strategy.execute(callback)).rejects.toThrow();

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should wait 100ms + 200ms = 300ms total
      expect(totalTime).toBeGreaterThanOrEqual(300);
      expect(totalTime).toBeLessThan(400);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second recovery
  });

  describe('execute', () => {
    it('should execute successfully when circuit is closed', async () => {
      const callback = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(callback);

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Service error'));

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(callback)).rejects.toThrow();
      }

      // Circuit should now be open
      await expect(circuitBreaker.execute(callback))
        .rejects
        .toMatchObject({
          code: 'CIRCUIT_BREAKER_OPEN',
        });

      expect(callback).toHaveBeenCalledTimes(3); // Should not call callback when circuit is open
    });

    it('should transition to half-open after recovery timeout', async () => {
      const callback = jest.fn()
        .mockRejectedValue(new Error('Service error'))
        .mockResolvedValue('recovered');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(callback)).rejects.toThrow();
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now allow one request (half-open state)
      const result = await circuitBreaker.execute(callback);
      expect(result).toBe('recovered');
    });

    it('should reset on successful execution', async () => {
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      // One failure
      await expect(circuitBreaker.execute(callback)).rejects.toThrow();

      // Success should reset failure count
      const result = await circuitBreaker.execute(callback);
      expect(result).toBe('success');

      const state = circuitBreaker.getState();
      expect(state.failures).toBe(0);
      expect(state.state).toBe('closed');
    });
  });

  describe('getState', () => {
    it('should return current circuit breaker state', () => {
      const state = circuitBreaker.getState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('lastFailureTime');
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker state', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Error'));

      // Cause some failures
      await expect(circuitBreaker.execute(callback)).rejects.toThrow();
      await expect(circuitBreaker.execute(callback)).rejects.toThrow();

      circuitBreaker.reset();

      const state = circuitBreaker.getState();
      expect(state.failures).toBe(0);
      expect(state.state).toBe('closed');
      expect(state.lastFailureTime).toBe(0);
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
      await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
      await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    });

    it('should throw error when limit exceeded', async () => {
      // Use up the limit
      await rateLimiter.checkLimit();
      await rateLimiter.checkLimit();
      await rateLimiter.checkLimit();

      // Fourth request should fail
      await expect(rateLimiter.checkLimit())
        .rejects
        .toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          type: 'rate_limit',
          retryable: true,
        });
    });

    it('should reset after time window', async () => {
      // Use up the limit
      await rateLimiter.checkLimit();
      await rateLimiter.checkLimit();
      await rateLimiter.checkLimit();

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should allow requests again
      await expect(rateLimiter.checkLimit()).resolves.toBeUndefined();
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', async () => {
      expect(rateLimiter.getRemainingRequests()).toBe(3);

      await rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(2);

      await rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(1);

      await rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset rate limiter', async () => {
      await rateLimiter.checkLimit();
      await rateLimiter.checkLimit();

      rateLimiter.reset();

      expect(rateLimiter.getRemainingRequests()).toBe(3);
    });
  });
});

describe('CostController', () => {
  let costController: CostController;

  beforeEach(() => {
    costController = new CostController(1.0, 0.001); // $1 daily limit, $0.001 per token
  });

  describe('checkCost', () => {
    it('should allow requests within budget', () => {
      expect(() => costController.checkCost(500)).not.toThrow(); // $0.50
      expect(() => costController.checkCost(400)).not.toThrow(); // $0.40
    });

    it('should throw error when daily limit would be exceeded', () => {
      expect(() => costController.checkCost(1200)) // $1.20
        .toThrow(expect.objectContaining({
          code: 'DAILY_COST_LIMIT_EXCEEDED',
          type: 'quota',
        }));
    });

    it('should account for previous usage', () => {
      costController.recordUsage(800); // $0.80 used

      expect(() => costController.checkCost(300)) // Would total $1.10
        .toThrow(expect.objectContaining({
          code: 'DAILY_COST_LIMIT_EXCEEDED',
        }));
    });
  });

  describe('recordUsage', () => {
    it('should record token usage and calculate cost', () => {
      costController.recordUsage(1000); // $1.00

      const stats = costController.getUsageStats();
      expect(stats.totalCost).toBe(1.0);
      expect(stats.dailyCost).toBe(1.0);
      expect(stats.remainingDailyBudget).toBe(0.0);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', () => {
      const stats = costController.getUsageStats();

      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('dailyCost');
      expect(stats).toHaveProperty('remainingDailyBudget');
      expect(stats).toHaveProperty('dailyLimit');
      expect(stats.dailyLimit).toBe(1.0);
    });
  });

  describe('reset', () => {
    it('should reset all usage statistics', () => {
      costController.recordUsage(500);
      costController.reset();

      const stats = costController.getUsageStats();
      expect(stats.totalCost).toBe(0);
      expect(stats.dailyCost).toBe(0);
      expect(stats.remainingDailyBudget).toBe(1.0);
    });
  });
});