/**
 * 环境配置管理
 * 统一管理不同环境的配置变量
 */

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';

  // API配置
  API_BASE_URL: string;
  OPENAI_API_URL: string;
  HUGGINGFACE_API_URL: string;

  // CDN配置
  CDN_ENABLED: boolean;
  CDN_BASE_URL: string;
  STATIC_CDN: string;
  IMAGES_CDN: string;
  FONTS_CDN: string;
  MODELS_CDN: string;

  // 性能配置
  ENABLE_ANALYTICS: boolean;
  ENABLE_ERROR_REPORTING: boolean;
  PERFORMANCE_MONITORING: boolean;

  // 功能开关
  ENABLE_PWA: boolean;
  ENABLE_OFFLINE_MODE: boolean;
  ENABLE_BACKGROUND_SYNC: boolean;
  ENABLE_PUSH_NOTIFICATIONS: boolean;

  // 安全配置
  ENABLE_CSP: boolean;
  ENABLE_HTTPS_ONLY: boolean;

  // 构建配置
  BUILD_ANALYZE: boolean;
  BUILD_SOURCEMAP: boolean;
  BUILD_MINIFY: boolean;
  BUILD_COMPRESSION: boolean;

  // 缓存配置
  CACHE_MAX_AGE: number;
  SW_CACHE_NAME: string;
  API_CACHE_TTL: number;

  // 版本信息
  APP_VERSION: string;
  BUILD_TIME: string;
  GIT_COMMIT: string;
}

// 环境变量解析函数
const parseEnvBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const parseEnvNumber = (value: string | undefined, defaultValue: number = 0): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 获取环境配置
export const getEnvConfig = (): EnvConfig => {
  return {
    NODE_ENV: (import.meta.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',

    // API配置
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    OPENAI_API_URL: import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1',
    HUGGINGFACE_API_URL: import.meta.env.VITE_HUGGINGFACE_API_URL || 'https://huggingface.co',

    // CDN配置
    CDN_ENABLED: parseEnvBoolean(import.meta.env.VITE_CDN_ENABLED, false),
    CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || '',
    STATIC_CDN: import.meta.env.VITE_STATIC_CDN || '',
    IMAGES_CDN: import.meta.env.VITE_IMAGES_CDN || '',
    FONTS_CDN: import.meta.env.VITE_FONTS_CDN || '',
    MODELS_CDN: import.meta.env.VITE_MODELS_CDN || '',

    // 性能配置
    ENABLE_ANALYTICS: parseEnvBoolean(import.meta.env.VITE_ENABLE_ANALYTICS, false),
    ENABLE_ERROR_REPORTING: parseEnvBoolean(import.meta.env.VITE_ENABLE_ERROR_REPORTING, false),
    PERFORMANCE_MONITORING: parseEnvBoolean(import.meta.env.VITE_PERFORMANCE_MONITORING, false),

    // 功能开关
    ENABLE_PWA: parseEnvBoolean(import.meta.env.VITE_ENABLE_PWA, true),
    ENABLE_OFFLINE_MODE: parseEnvBoolean(import.meta.env.VITE_ENABLE_OFFLINE_MODE, true),
    ENABLE_BACKGROUND_SYNC: parseEnvBoolean(import.meta.env.VITE_ENABLE_BACKGROUND_SYNC, true),
    ENABLE_PUSH_NOTIFICATIONS: parseEnvBoolean(import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS, false),

    // 安全配置
    ENABLE_CSP: parseEnvBoolean(import.meta.env.VITE_ENABLE_CSP, true),
    ENABLE_HTTPS_ONLY: parseEnvBoolean(import.meta.env.VITE_ENABLE_HTTPS_ONLY, false),

    // 构建配置
    BUILD_ANALYZE: parseEnvBoolean(import.meta.env.VITE_BUILD_ANALYZE, false),
    BUILD_SOURCEMAP: parseEnvBoolean(import.meta.env.VITE_BUILD_SOURCEMAP, false),
    BUILD_MINIFY: parseEnvBoolean(import.meta.env.VITE_BUILD_MINIFY, true),
    BUILD_COMPRESSION: parseEnvBoolean(import.meta.env.VITE_BUILD_COMPRESSION, true),

    // 缓存配置
    CACHE_MAX_AGE: parseEnvNumber(import.meta.env.VITE_CACHE_MAX_AGE, 86400),
    SW_CACHE_NAME: import.meta.env.VITE_SW_CACHE_NAME || 'ai-resume-v1',
    API_CACHE_TTL: parseEnvNumber(import.meta.env.VITE_API_CACHE_TTL, 3600),

    // 版本信息
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    BUILD_TIME: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
    GIT_COMMIT: import.meta.env.VITE_GIT_COMMIT || 'unknown'
  };
};

// 导出当前环境配置
export const envConfig = getEnvConfig();

// 环境检查工具
export const isDevelopment = () => envConfig.NODE_ENV === 'development';
export const isProduction = () => envConfig.NODE_ENV === 'production';
export const isTest = () => envConfig.NODE_ENV === 'test';

// 功能开关检查
export const isFeatureEnabled = (feature: keyof Pick<EnvConfig,
  'ENABLE_PWA' | 'ENABLE_OFFLINE_MODE' | 'ENABLE_BACKGROUND_SYNC' |
  'ENABLE_PUSH_NOTIFICATIONS' | 'ENABLE_ANALYTICS' | 'ENABLE_ERROR_REPORTING' |
  'PERFORMANCE_MONITORING' | 'ENABLE_CSP' | 'ENABLE_HTTPS_ONLY'
>): boolean => {
  return envConfig[feature];
};

// 构建信息
export const getBuildInfo = () => ({
  version: envConfig.APP_VERSION,
  buildTime: envConfig.BUILD_TIME,
  gitCommit: envConfig.GIT_COMMIT,
  environment: envConfig.NODE_ENV
});

// 调试信息（仅开发环境）
if (isDevelopment()) {
  console.group('🔧 Environment Configuration');
  console.log('Environment:', envConfig.NODE_ENV);
  console.log('API Base URL:', envConfig.API_BASE_URL);
  console.log('CDN Enabled:', envConfig.CDN_ENABLED);
  console.log('PWA Enabled:', envConfig.ENABLE_PWA);
  console.log('Performance Monitoring:', envConfig.PERFORMANCE_MONITORING);
  console.groupEnd();
}