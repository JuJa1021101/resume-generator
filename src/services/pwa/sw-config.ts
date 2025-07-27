/**
 * Service Worker配置和缓存策略
 */

export interface CacheConfig {
  name: string;
  version: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export interface CacheStrategy {
  urlPattern: RegExp;
  handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
  options?: {
    cacheName: string;
    expiration?: {
      maxEntries: number;
      maxAgeSeconds: number;
    };
    cacheKeyWillBeUsed?: (request: Request) => string;
  };
}

export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  STATIC_ASSETS: {
    name: 'static-assets-v1',
    version: '1.0.0',
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
  },
  API_RESPONSES: {
    name: 'api-responses-v1',
    version: '1.0.0',
    maxEntries: 50,
    maxAgeSeconds: 60 * 60 * 24 // 24 hours
  },
  AI_MODELS: {
    name: 'ai-models-v1',
    version: '1.0.0',
    maxEntries: 10,
    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
  },
  USER_DATA: {
    name: 'user-data-v1',
    version: '1.0.0',
    maxEntries: 1000,
    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
  }
};

export const CACHE_STRATEGIES: CacheStrategy[] = [
  // Static assets - Cache First
  {
    urlPattern: /\.(?:js|css|html|ico|png|jpg|jpeg|svg|woff|woff2)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: CACHE_CONFIGS.STATIC_ASSETS.name,
      expiration: {
        maxEntries: CACHE_CONFIGS.STATIC_ASSETS.maxEntries!,
        maxAgeSeconds: CACHE_CONFIGS.STATIC_ASSETS.maxAgeSeconds!
      }
    }
  },

  // OpenAI API - Network First with fallback
  {
    urlPattern: /^https:\/\/api\.openai\.com\/.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: CACHE_CONFIGS.API_RESPONSES.name,
      expiration: {
        maxEntries: CACHE_CONFIGS.API_RESPONSES.maxEntries!,
        maxAgeSeconds: CACHE_CONFIGS.API_RESPONSES.maxAgeSeconds!
      }
    }
  },

  // Transformers.js models - Cache First
  {
    urlPattern: /^https:\/\/huggingface\.co\/.*\/resolve\/main\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: CACHE_CONFIGS.AI_MODELS.name,
      expiration: {
        maxEntries: CACHE_CONFIGS.AI_MODELS.maxEntries!,
        maxAgeSeconds: CACHE_CONFIGS.AI_MODELS.maxAgeSeconds!
      }
    }
  },

  // App shell - Stale While Revalidate
  {
    urlPattern: /^https?:\/\/localhost:\d+\/$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'app-shell-v1'
    }
  }
];

export const SW_CONFIG = {
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  offlineFallback: '/offline.html',
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
};