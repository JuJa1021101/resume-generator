// Main service exports
export { GPT4oService, createGPT4oService, getGPT4oService } from './gpt4o-service';
export type { GPT4oServiceConfig, ServiceStats } from './gpt4o-service';

// Client exports
export { GPT4oClient, APIError } from './gpt4o-client';
export type { GPT4oConfig, GPT4oRequest, GPT4oResponse } from './gpt4o-client';

// Retry strategy exports
export { RetryStrategy, CircuitBreaker, RateLimiter, CostController } from './retry-strategy';
export type { RetryConfig, RetryContext, RetryCallback, FallbackCallback } from './retry-strategy';

// Cache exports
export { ResponseCache, PersistentResponseCache } from './response-cache';
export type { CacheEntry, CacheConfig, CacheStats } from './response-cache';

// Utility functions
export const createDefaultConfig = (apiKey: string) => ({
  apiKey,
  maxTokens: 2000,
  temperature: 0.3,
  timeout: 30000,
  enableCache: true,
  enableRetry: true,
  enableCircuitBreaker: true,
  enableRateLimit: true,
  enableCostControl: true,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
  },
  rateLimitConfig: {
    maxRequests: 60,
    windowMs: 60000,
  },
  costConfig: {
    dailyLimit: 10.0,
    costPerToken: 0.00003,
  },
  cacheConfig: {
    maxSize: 100,
    defaultTTL: 3600000,
  },
});

export const validateApiKey = (apiKey: string): boolean => {
  return typeof apiKey === 'string' &&
    apiKey.length > 0 &&
    apiKey.startsWith('sk-');
};

export const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English, 2-3 for Chinese
  const avgCharsPerToken = /[\u4e00-\u9fff]/.test(text) ? 2.5 : 4;
  return Math.ceil(text.length / avgCharsPerToken);
};

export const formatCost = (cost: number): string => {
  return `$${cost.toFixed(4)}`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};