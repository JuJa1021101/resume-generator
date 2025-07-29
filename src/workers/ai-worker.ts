/**
 * AI处理专用Web Worker
 * 负责处理AI分析任务，包括JD解析、关键词提取、技能匹配等
 * 集成Transformers.js本地AI引擎
 */

import type {
  AIAnalysisResult,
  JobDescription,
  UserSkill,
  MatchResult,
  PerformanceMetrics
} from '../types';

import {
  TransformersService
} from '../services/transformers';

// Worker消息类型定义
export interface AIWorkerMessage {
  type: 'ANALYZE_JD' | 'GENERATE_KEYWORDS' | 'MATCH_SKILLS' | 'BATCH_PROCESS';
  payload: {
    id: string;
    content?: string;
    jobDescription?: JobDescription;
    userSkills?: UserSkill[];
    config?: AIEngineConfig;
    batchData?: BatchProcessData[];
  };
}

export interface AIWorkerResponse {
  type: 'ANALYSIS_COMPLETE' | 'KEYWORDS_GENERATED' | 'SKILLS_MATCHED' | 'PROGRESS_UPDATE' | 'ERROR' | 'BATCH_COMPLETE';
  payload: {
    id: string;
    result?: AIAnalysisResult | string[] | MatchResult | BatchProcessResult[];
    progress?: ProgressUpdate;
    error?: WorkerError;
    performanceMetrics?: PerformanceMetrics;
  };
}

export interface AIEngineConfig {
  provider: 'gpt4o' | 'transformers';
  apiKey?: string;
  modelPath?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface ProgressUpdate {
  stage: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

export interface WorkerError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

export interface BatchProcessData {
  id: string;
  type: 'analyze' | 'match';
  data: unknown;
}

export interface BatchProcessResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: WorkerError;
}

// LRU缓存实现
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 100, ttl = 30 * 60 * 1000) { // 30分钟默认TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问时间（LRU策略）
    this.cache.delete(key);
    this.cache.set(key, { ...item, timestamp: Date.now() });
    return item.value;
  }

  set(key: string, value: T): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 清理过期项
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Worker内部状态管理
class AIWorkerState {
  private cache = new LRUCache<AIAnalysisResult>(50);
  private keywordCache = new LRUCache<string[]>(100);
  private matchCache = new LRUCache<MatchResult>(50);
  private processingQueue: string[] = [];
  private isProcessing = false;

  constructor() {
    // 定期清理过期缓存
    setInterval(() => {
      this.cache.cleanup();
      this.keywordCache.cleanup();
      this.matchCache.cleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  getCachedAnalysis(key: string): AIAnalysisResult | null {
    return this.cache.get(key);
  }

  setCachedAnalysis(key: string, result: AIAnalysisResult): void {
    this.cache.set(key, result);
  }

  getCachedKeywords(key: string): string[] | null {
    return this.keywordCache.get(key);
  }

  setCachedKeywords(key: string, keywords: string[]): void {
    this.keywordCache.set(key, keywords);
  }

  getCachedMatch(key: string): MatchResult | null {
    return this.matchCache.get(key);
  }

  setCachedMatch(key: string, result: MatchResult): void {
    this.matchCache.set(key, result);
  }

  addToQueue(id: string): void {
    this.processingQueue.push(id);
  }

  removeFromQueue(id: string): void {
    const index = this.processingQueue.indexOf(id);
    if (index > -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  getQueuePosition(id: string): number {
    return this.processingQueue.indexOf(id);
  }

  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }

  getProcessingStatus(): boolean {
    return this.isProcessing;
  }

  getCacheStats() {
    return {
      analysisCache: this.cache.size(),
      keywordCache: this.keywordCache.size(),
      matchCache: this.matchCache.size(),
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Worker实例
const workerState = new AIWorkerState();

// Transformers.js服务实例
let transformersService: TransformersService | null = null;

// 初始化Transformers.js服务
async function initializeTransformersService(): Promise<TransformersService> {
  if (!transformersService) {
    transformersService = new TransformersService();
    await transformersService.initialize();
    console.log('Transformers.js service initialized in worker');
  }
  return transformersService;
}

// 生成缓存键
function generateCacheKey(type: string, data: unknown): string {
  const dataStr = JSON.stringify(data);
  return `${type}_${btoa(dataStr).slice(0, 32)}`;
}

// 发送进度更新
function sendProgress(id: string, stage: string, progress: number, message: string): void {
  const response: AIWorkerResponse = {
    type: 'PROGRESS_UPDATE',
    payload: {
      id,
      progress: {
        stage,
        progress,
        message,
        estimatedTimeRemaining: calculateETA(progress)
      }
    }
  };
  self.postMessage(response);
}

// 计算预估剩余时间
function calculateETA(progress: number): number {
  if (progress <= 0) return 0;
  const elapsed = Date.now() - (self as any).startTime;
  return Math.round((elapsed / progress) * (100 - progress));
}

// 发送错误信息
function sendError(id: string, error: WorkerError): void {
  const response: AIWorkerResponse = {
    type: 'ERROR',
    payload: {
      id,
      error
    }
  };
  self.postMessage(response);
}

// JD分析处理
async function analyzeJD(id: string, content: string, config: AIEngineConfig): Promise<void> {
  const startTime = Date.now();
  (self as any).startTime = startTime;

  try {
    workerState.setProcessing(true);
    workerState.addToQueue(id);

    const cacheKey = generateCacheKey('analyze', { content, config });
    const cached = workerState.getCachedAnalysis(cacheKey);

    if (cached) {
      sendProgress(id, 'cache-hit', 100, '从缓存获取分析结果');
      const response: AIWorkerResponse = {
        type: 'ANALYSIS_COMPLETE',
        payload: {
          id,
          result: cached,
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: Date.now() - startTime,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 1
          }
        }
      };
      self.postMessage(response);
      return;
    }

    // 使用Transformers.js进行本地分析
    if (config.provider === 'transformers') {
      sendProgress(id, 'initializing', 5, '初始化本地AI模型');

      const service = await initializeTransformersService();

      sendProgress(id, 'preprocessing', 15, '预处理JD内容');

      // 使用Transformers.js分析JD
      const localResult = await service.analyzeJobDescription(content, {
        extractKeywords: true,
        analyzeSkills: true,
        generateSuggestions: true,
        language: 'zh-CN'
      });

      sendProgress(id, 'analyzing', 60, '本地AI分析中');
      sendProgress(id, 'finalizing', 90, '生成分析报告');

      // 转换为标准格式
      const result: AIAnalysisResult = {
        keywords: localResult.keywords,
        skills: localResult.skills,
        matchScore: localResult.matchScore,
        suggestions: localResult.suggestions,
        processingTime: localResult.processingTime,
        confidence: localResult.confidence
      };

      // 缓存结果
      workerState.setCachedAnalysis(cacheKey, result);

      const response: AIWorkerResponse = {
        type: 'ANALYSIS_COMPLETE',
        payload: {
          id,
          result,
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: Date.now() - startTime,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0
          }
        }
      };

      self.postMessage(response);
    } else {
      // GPT-4o处理逻辑（保持原有模拟实现）
      sendProgress(id, 'preprocessing', 10, '预处理JD内容');
      await new Promise(resolve => setTimeout(resolve, 500));

      sendProgress(id, 'analyzing', 30, '分析岗位要求');
      await new Promise(resolve => setTimeout(resolve, 1000));

      sendProgress(id, 'extracting', 60, '提取关键技能');
      await new Promise(resolve => setTimeout(resolve, 800));

      sendProgress(id, 'scoring', 80, '计算匹配度');
      await new Promise(resolve => setTimeout(resolve, 500));

      sendProgress(id, 'finalizing', 95, '生成分析报告');

      // 生成模拟结果
      const result: AIAnalysisResult = {
        keywords: [
          { text: 'React', importance: 0.9, category: 'technical', frequency: 5 },
          { text: 'TypeScript', importance: 0.8, category: 'technical', frequency: 3 },
          { text: '团队协作', importance: 0.7, category: 'soft', frequency: 2 }
        ],
        skills: [
          { name: 'React', category: 'frontend', importance: 0.9, matched: true, requiredLevel: 4 },
          { name: 'TypeScript', category: 'frontend', importance: 0.8, matched: true, requiredLevel: 3 }
        ],
        matchScore: 0.85,
        suggestions: ['加强React高级特性的掌握', '提升TypeScript类型系统理解'],
        processingTime: Date.now() - startTime,
        confidence: 0.92
      };

      // 缓存结果
      workerState.setCachedAnalysis(cacheKey, result);

      const response: AIWorkerResponse = {
        type: 'ANALYSIS_COMPLETE',
        payload: {
          id,
          result,
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: Date.now() - startTime,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0
          }
        }
      };

      self.postMessage(response);
    }

  } catch (error) {
    sendError(id, {
      code: 'ANALYSIS_ERROR',
      message: error instanceof Error ? error.message : '分析过程中发生未知错误',
      details: error,
      recoverable: true
    });
  } finally {
    workerState.removeFromQueue(id);
    workerState.setProcessing(false);
  }
}

// 关键词生成处理
async function generateKeywords(id: string, content: string, config: AIEngineConfig): Promise<void> {
  const startTime = Date.now();

  try {
    const cacheKey = generateCacheKey('keywords', { content, config });
    const cached = workerState.getCachedKeywords(cacheKey);

    if (cached) {
      const response: AIWorkerResponse = {
        type: 'KEYWORDS_GENERATED',
        payload: {
          id,
          result: cached,
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: Date.now() - startTime,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 1
          }
        }
      };
      self.postMessage(response);
      return;
    }

    sendProgress(id, 'extracting', 50, '提取关键词');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const keywords = ['React', 'TypeScript', 'Node.js', 'MongoDB', 'AWS'];
    workerState.setCachedKeywords(cacheKey, keywords);

    const response: AIWorkerResponse = {
      type: 'KEYWORDS_GENERATED',
      payload: {
        id,
        result: keywords,
        performanceMetrics: {
          loadTime: 0,
          aiProcessingTime: Date.now() - startTime,
          renderTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'KEYWORD_ERROR',
      message: error instanceof Error ? error.message : '关键词生成失败',
      details: error,
      recoverable: true
    });
  }
}

// 技能匹配处理
async function matchSkills(id: string, jobDescription: JobDescription, userSkills: UserSkill[]): Promise<void> {
  const startTime = Date.now();

  try {
    const cacheKey = generateCacheKey('match', { jobDescription: jobDescription.id, userSkills });
    const cached = workerState.getCachedMatch(cacheKey);

    if (cached) {
      const response: AIWorkerResponse = {
        type: 'SKILLS_MATCHED',
        payload: {
          id,
          result: cached,
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: Date.now() - startTime,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 1
          }
        }
      };
      self.postMessage(response);
      return;
    }

    sendProgress(id, 'matching', 50, '匹配技能要求');
    await new Promise(resolve => setTimeout(resolve, 800));

    // 生成模拟匹配结果
    const result: MatchResult = {
      overallScore: 0.82,
      categoryScores: [
        { category: 'frontend', score: 85, maxScore: 100, skillCount: 5, matchedSkills: 4 },
        { category: 'backend', score: 70, maxScore: 100, skillCount: 3, matchedSkills: 2 }
      ],
      gaps: [
        { skill: 'GraphQL', category: 'backend', requiredLevel: 3, currentLevel: 0, importance: 0.7, priority: 'medium' }
      ],
      strengths: ['React开发经验丰富', 'TypeScript使用熟练'],
      recommendations: ['学习GraphQL提升后端技能', '加强数据库设计能力']
    };

    workerState.setCachedMatch(cacheKey, result);

    const response: AIWorkerResponse = {
      type: 'SKILLS_MATCHED',
      payload: {
        id,
        result,
        performanceMetrics: {
          loadTime: 0,
          aiProcessingTime: Date.now() - startTime,
          renderTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'MATCH_ERROR',
      message: error instanceof Error ? error.message : '技能匹配失败',
      details: error,
      recoverable: true
    });
  }
}

// 批量处理
async function batchProcess(id: string, batchData: BatchProcessData[]): Promise<void> {
  const startTime = Date.now();
  const results: BatchProcessResult[] = [];

  try {
    for (let i = 0; i < batchData.length; i++) {
      const item = batchData[i];
      const progress = Math.round(((i + 1) / batchData.length) * 100);

      sendProgress(id, 'batch-processing', progress, `处理第 ${i + 1}/${batchData.length} 项`);

      try {
        // 根据类型处理不同的任务
        let result: unknown;
        if (item.type === 'analyze') {
          // 这里应该调用实际的分析逻辑
          result = { analyzed: true, data: item.data };
        } else if (item.type === 'match') {
          // 这里应该调用实际的匹配逻辑
          result = { matched: true, data: item.data };
        }

        results.push({
          id: item.id,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          id: item.id,
          success: false,
          error: {
            code: 'BATCH_ITEM_ERROR',
            message: error instanceof Error ? error.message : '批量处理项失败',
            details: error,
            recoverable: true
          }
        });
      }

      // 添加小延迟避免阻塞
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const response: AIWorkerResponse = {
      type: 'BATCH_COMPLETE',
      payload: {
        id,
        result: results,
        performanceMetrics: {
          loadTime: 0,
          aiProcessingTime: Date.now() - startTime,
          renderTime: 0,
          memoryUsage: 0,
          cacheHitRate: 0
        }
      }
    };

    self.postMessage(response);

  } catch (error) {
    sendError(id, {
      code: 'BATCH_ERROR',
      message: error instanceof Error ? error.message : '批量处理失败',
      details: error,
      recoverable: false
    });
  }
}

// 消息处理器
self.onmessage = async (event: MessageEvent<AIWorkerMessage>) => {
  const { type, payload } = event.data;
  const { id } = payload;

  try {
    switch (type) {
      case 'ANALYZE_JD':
        if (payload.content && payload.config) {
          await analyzeJD(id, payload.content, payload.config);
        } else {
          throw new Error('缺少必要的分析参数');
        }
        break;

      case 'GENERATE_KEYWORDS':
        if (payload.content && payload.config) {
          await generateKeywords(id, payload.content, payload.config);
        } else {
          throw new Error('缺少必要的关键词生成参数');
        }
        break;

      case 'MATCH_SKILLS':
        if (payload.jobDescription && payload.userSkills) {
          await matchSkills(id, payload.jobDescription, payload.userSkills);
        } else {
          throw new Error('缺少必要的技能匹配参数');
        }
        break;

      case 'BATCH_PROCESS':
        if (payload.batchData) {
          await batchProcess(id, payload.batchData);
        } else {
          throw new Error('缺少批量处理数据');
        }
        break;

      default:
        throw new Error(`未知的消息类型: ${type}`);
    }
  } catch (error) {
    sendError(id, {
      code: 'WORKER_ERROR',
      message: error instanceof Error ? error.message : 'Worker处理失败',
      details: error,
      recoverable: false
    });
  }
};

// 导出类型供主线程使用
// Export types (avoiding conflicts)
export type {
  AIWorkerMessage as WorkerMessage,
  AIWorkerResponse as WorkerResponse,
  AIEngineConfig as EngineConfig,
  ProgressUpdate as Progress,
  WorkerError as Error
};