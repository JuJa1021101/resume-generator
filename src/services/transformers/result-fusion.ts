/**
 * AI结果融合服务
 * 负责融合本地Transformers.js和云端GPT-4o的分析结果
 */

import type {
  AIAnalysisResult,
  Keyword,
  Skill,
  PerformanceMetrics
} from '../../types';
import type { LocalAnalysisResult } from './transformers-service';

// 融合配置
export interface FusionConfig {
  localWeight: number; // 本地结果权重 (0-1)
  cloudWeight: number; // 云端结果权重 (0-1)
  confidenceThreshold: number; // 置信度阈值
  enableFallback: boolean; // 启用降级策略
  fusionStrategy: 'weighted' | 'ensemble' | 'selective' | 'hybrid';
  qualityThreshold: number; // 结果质量阈值
}

// 融合结果
export interface FusedResult extends AIAnalysisResult {
  fusionMetadata: FusionMetadata;
  localResult?: LocalAnalysisResult;
  cloudResult?: AIAnalysisResult;
}

// 融合元数据
export interface FusionMetadata {
  strategy: string;
  localWeight: number;
  cloudWeight: number;
  fusionConfidence: number;
  qualityScore: number;
  processingTime: number;
  fallbackUsed: boolean;
  errorCount: number;
}

// 结果质量评估
export interface QualityAssessment {
  completeness: number; // 完整性 (0-1)
  consistency: number; // 一致性 (0-1)
  relevance: number; // 相关性 (0-1)
  accuracy: number; // 准确性 (0-1)
  overallScore: number; // 总体质量分数 (0-1)
}

// 融合策略接口
interface FusionStrategy {
  name: string;
  fuse(localResult: LocalAnalysisResult, cloudResult: AIAnalysisResult, config: FusionConfig): FusedResult;
}

/**
 * AI结果融合服务
 */
export class ResultFusionService {
  private config: FusionConfig;
  private strategies: Map<string, FusionStrategy> = new Map();
  private fusionHistory: FusedResult[] = [];
  private performanceMetrics: PerformanceMetrics;

  constructor(config: Partial<FusionConfig> = {}) {
    this.config = {
      localWeight: 0.4,
      cloudWeight: 0.6,
      confidenceThreshold: 0.7,
      enableFallback: true,
      fusionStrategy: 'weighted',
      qualityThreshold: 0.6,
      ...config
    };

    this.performanceMetrics = {
      loadTime: 0,
      aiProcessingTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };

    // 初始化融合策略
    this.initializeFusionStrategies();
  }

  /**
   * 融合本地和云端分析结果
   */
  async fuseResults(
    localResult: LocalAnalysisResult | null,
    cloudResult: AIAnalysisResult | null,
    options: {
      strategy?: string;
      weights?: { local: number; cloud: number };
      fallbackToSingle?: boolean;
    } = {}
  ): Promise<FusedResult> {
    const startTime = Date.now();

    try {
      // 处理单一结果情况
      if (!localResult && !cloudResult) {
        throw new Error('至少需要一个分析结果');
      }

      if (!localResult && cloudResult) {
        return this.createFallbackResult(cloudResult, 'cloud-only', startTime);
      }

      if (localResult && !cloudResult) {
        return this.createFallbackResult(localResult, 'local-only', startTime);
      }

      // 双结果融合
      const strategy = options.strategy || this.config.fusionStrategy;
      const fusionStrategy = this.strategies.get(strategy);

      if (!fusionStrategy) {
        throw new Error(`未知的融合策略: ${strategy}`);
      }

      // 应用自定义权重
      const fusionConfig = { ...this.config };
      if (options.weights) {
        fusionConfig.localWeight = options.weights.local;
        fusionConfig.cloudWeight = options.weights.cloud;
      }

      // 执行融合
      const fusedResult = fusionStrategy.fuse(localResult!, cloudResult!, fusionConfig);

      // 质量评估
      const qualityScore = this.assessResultQuality(fusedResult, localResult!, cloudResult!);
      fusedResult.fusionMetadata.qualityScore = qualityScore.overallScore;

      // 如果质量不达标且启用降级，使用更好的单一结果
      if (qualityScore.overallScore < this.config.qualityThreshold && options.fallbackToSingle) {
        const betterResult = this.selectBetterResult(localResult!, cloudResult!);
        return this.createFallbackResult(betterResult, 'quality-fallback', startTime);
      }

      // 更新性能指标
      fusedResult.fusionMetadata.processingTime = Date.now() - startTime;
      this.performanceMetrics.aiProcessingTime += fusedResult.fusionMetadata.processingTime;

      // 记录融合历史
      this.fusionHistory.push(fusedResult);
      this.maintainHistorySize();

      return fusedResult;

    } catch (error) {
      console.error('Result fusion failed:', error);

      // 降级处理
      if (this.config.enableFallback) {
        const fallbackResult = localResult || cloudResult;
        if (fallbackResult) {
          return this.createFallbackResult(fallbackResult, 'error-fallback', startTime);
        }
      }

      throw error;
    }
  }

  /**
   * 批量融合结果
   */
  async fuseBatchResults(
    localResults: (LocalAnalysisResult | null)[],
    cloudResults: (AIAnalysisResult | null)[],
    options: {
      strategy?: string;
      parallelProcessing?: boolean;
    } = {}
  ): Promise<FusedResult[]> {
    if (localResults.length !== cloudResults.length) {
      throw new Error('本地和云端结果数量不匹配');
    }

    const fusionPromises = localResults.map((localResult, index) =>
      this.fuseResults(localResult, cloudResults[index], options)
    );

    if (options.parallelProcessing !== false) {
      return Promise.all(fusionPromises);
    } else {
      // 顺序处理
      const results: FusedResult[] = [];
      for (const promise of fusionPromises) {
        results.push(await promise);
      }
      return results;
    }
  }

  /**
   * 智能融合策略选择
   */
  async smartFusion(
    localResult: LocalAnalysisResult | null,
    cloudResult: AIAnalysisResult | null
  ): Promise<FusedResult> {
    // 根据结果特征自动选择最佳融合策略
    const strategy = this.selectOptimalStrategy(localResult, cloudResult);

    return this.fuseResults(localResult, cloudResult, {
      strategy,
      fallbackToSingle: true
    });
  }

  /**
   * 初始化融合策略
   */
  private initializeFusionStrategies(): void {
    // 加权平均策略
    this.strategies.set('weighted', {
      name: 'weighted',
      fuse: (local, cloud, config) => this.weightedFusion(local, cloud, config)
    });

    // 集成策略
    this.strategies.set('ensemble', {
      name: 'ensemble',
      fuse: (local, cloud, config) => this.ensembleFusion(local, cloud, config)
    });

    // 选择性策略
    this.strategies.set('selective', {
      name: 'selective',
      fuse: (local, cloud, config) => this.selectiveFusion(local, cloud, config)
    });

    // 混合策略
    this.strategies.set('hybrid', {
      name: 'hybrid',
      fuse: (local, cloud, config) => this.hybridFusion(local, cloud, config)
    });
  }

  /**
   * 加权平均融合
   */
  private weightedFusion(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult,
    config: FusionConfig
  ): FusedResult {
    // 融合关键词
    const fusedKeywords = this.fuseKeywords(
      localResult.keywords,
      cloudResult.keywords,
      config.localWeight,
      config.cloudWeight
    );

    // 融合技能
    const fusedSkills = this.fuseSkills(
      localResult.skills,
      cloudResult.skills,
      config.localWeight,
      config.cloudWeight
    );

    // 融合匹配度
    const fusedMatchScore =
      localResult.matchScore * config.localWeight +
      cloudResult.matchScore * config.cloudWeight;

    // 融合建议
    const fusedSuggestions = this.fuseSuggestions(
      localResult.suggestions,
      cloudResult.suggestions
    );

    // 计算融合置信度
    const fusionConfidence = this.calculateFusionConfidence(localResult, cloudResult, config);

    return {
      keywords: fusedKeywords,
      skills: fusedSkills,
      matchScore: Math.min(fusedMatchScore, 1.0),
      suggestions: fusedSuggestions,
      processingTime: Math.max(localResult.processingTime, cloudResult.processingTime),
      confidence: fusionConfidence,
      fusionMetadata: {
        strategy: 'weighted',
        localWeight: config.localWeight,
        cloudWeight: config.cloudWeight,
        fusionConfidence,
        qualityScore: 0, // 将在后续计算
        processingTime: 0, // 将在后续设置
        fallbackUsed: false,
        errorCount: 0
      },
      localResult,
      cloudResult
    };
  }

  /**
   * 集成融合策略
   */
  private ensembleFusion(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult,
    config: FusionConfig
  ): FusedResult {
    // 使用投票机制融合结果
    const fusedKeywords = this.ensembleKeywords(localResult.keywords, cloudResult.keywords);
    const fusedSkills = this.ensembleSkills(localResult.skills, cloudResult.skills);

    // 使用置信度加权的匹配度
    const confidenceWeightedScore =
      (localResult.matchScore * localResult.confidence +
        cloudResult.matchScore * cloudResult.confidence) /
      (localResult.confidence + cloudResult.confidence);

    const fusionConfidence = Math.max(localResult.confidence, cloudResult.confidence);

    return {
      keywords: fusedKeywords,
      skills: fusedSkills,
      matchScore: confidenceWeightedScore,
      suggestions: [...new Set([...localResult.suggestions, ...cloudResult.suggestions])],
      processingTime: Math.max(localResult.processingTime, cloudResult.processingTime),
      confidence: fusionConfidence,
      fusionMetadata: {
        strategy: 'ensemble',
        localWeight: config.localWeight,
        cloudWeight: config.cloudWeight,
        fusionConfidence,
        qualityScore: 0,
        processingTime: 0,
        fallbackUsed: false,
        errorCount: 0
      },
      localResult,
      cloudResult
    };
  }

  /**
   * 选择性融合策略
   */
  private selectiveFusion(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult,
    _config: FusionConfig
  ): FusedResult {
    // 根据置信度选择最佳结果的不同部分
    const useLocalKeywords = localResult.confidence > cloudResult.confidence;
    const useLocalSkills = localResult.confidence > cloudResult.confidence;
    const useLocalScore = localResult.confidence > cloudResult.confidence;

    return {
      keywords: useLocalKeywords ? localResult.keywords : cloudResult.keywords,
      skills: useLocalSkills ? localResult.skills : cloudResult.skills,
      matchScore: useLocalScore ? localResult.matchScore : cloudResult.matchScore,
      suggestions: localResult.confidence > cloudResult.confidence ?
        localResult.suggestions : cloudResult.suggestions,
      processingTime: Math.min(localResult.processingTime, cloudResult.processingTime),
      confidence: Math.max(localResult.confidence, cloudResult.confidence),
      fusionMetadata: {
        strategy: 'selective',
        localWeight: useLocalKeywords ? 1 : 0,
        cloudWeight: useLocalKeywords ? 0 : 1,
        fusionConfidence: Math.max(localResult.confidence, cloudResult.confidence),
        qualityScore: 0,
        processingTime: 0,
        fallbackUsed: false,
        errorCount: 0
      },
      localResult,
      cloudResult
    };
  }

  /**
   * 混合融合策略
   */
  private hybridFusion(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult,
    config: FusionConfig
  ): FusedResult {
    // 结合多种策略的优点
    const weightedResult = this.weightedFusion(localResult, cloudResult, config);
    const ensembleResult = this.ensembleFusion(localResult, cloudResult, config);

    // 选择质量更高的结果
    const weightedQuality = this.assessResultQuality(weightedResult, localResult, cloudResult);
    const ensembleQuality = this.assessResultQuality(ensembleResult, localResult, cloudResult);

    const betterResult = weightedQuality.overallScore > ensembleQuality.overallScore ?
      weightedResult : ensembleResult;

    betterResult.fusionMetadata.strategy = 'hybrid';
    return betterResult;
  }

  /**
   * 融合关键词
   */
  private fuseKeywords(
    localKeywords: Keyword[],
    cloudKeywords: Keyword[],
    localWeight: number,
    cloudWeight: number
  ): Keyword[] {
    const keywordMap = new Map<string, Keyword>();

    // 处理本地关键词
    localKeywords.forEach(keyword => {
      keywordMap.set(keyword.text.toLowerCase(), {
        ...keyword,
        importance: keyword.importance * localWeight
      });
    });

    // 处理云端关键词
    cloudKeywords.forEach(keyword => {
      const key = keyword.text.toLowerCase();
      const existing = keywordMap.get(key);

      if (existing) {
        // 合并重复关键词
        existing.importance += keyword.importance * cloudWeight;
        existing.frequency = Math.max(existing.frequency, keyword.frequency);
      } else {
        keywordMap.set(key, {
          ...keyword,
          importance: keyword.importance * cloudWeight
        });
      }
    });

    return Array.from(keywordMap.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20); // 限制数量
  }

  /**
   * 融合技能
   */
  private fuseSkills(
    localSkills: Skill[],
    cloudSkills: Skill[],
    localWeight: number,
    cloudWeight: number
  ): Skill[] {
    const skillMap = new Map<string, Skill>();

    // 处理本地技能
    localSkills.forEach(skill => {
      skillMap.set(skill.name.toLowerCase(), {
        ...skill,
        importance: skill.importance * localWeight
      });
    });

    // 处理云端技能
    cloudSkills.forEach(skill => {
      const key = skill.name.toLowerCase();
      const existing = skillMap.get(key);

      if (existing) {
        existing.importance += skill.importance * cloudWeight;
        existing.requiredLevel = Math.max(existing.requiredLevel, skill.requiredLevel);
        existing.matched = existing.matched || skill.matched;
      } else {
        skillMap.set(key, {
          ...skill,
          importance: skill.importance * cloudWeight
        });
      }
    });

    return Array.from(skillMap.values())
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * 集成关键词
   */
  private ensembleKeywords(localKeywords: Keyword[], cloudKeywords: Keyword[]): Keyword[] {
    const allKeywords = [...localKeywords, ...cloudKeywords];
    const keywordVotes = new Map<string, { keyword: Keyword; votes: number; totalImportance: number }>();

    allKeywords.forEach(keyword => {
      const key = keyword.text.toLowerCase();
      const existing = keywordVotes.get(key);

      if (existing) {
        existing.votes++;
        existing.totalImportance += keyword.importance;
      } else {
        keywordVotes.set(key, {
          keyword: { ...keyword },
          votes: 1,
          totalImportance: keyword.importance
        });
      }
    });

    return Array.from(keywordVotes.values())
      .map(({ keyword, votes, totalImportance }) => ({
        ...keyword,
        importance: totalImportance / votes,
        frequency: votes
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20);
  }

  /**
   * 集成技能
   */
  private ensembleSkills(localSkills: Skill[], cloudSkills: Skill[]): Skill[] {
    const allSkills = [...localSkills, ...cloudSkills];
    const skillVotes = new Map<string, { skill: Skill; votes: number; totalImportance: number }>();

    allSkills.forEach(skill => {
      const key = skill.name.toLowerCase();
      const existing = skillVotes.get(key);

      if (existing) {
        existing.votes++;
        existing.totalImportance += skill.importance;
        existing.skill.matched = existing.skill.matched || skill.matched;
        existing.skill.requiredLevel = Math.max(existing.skill.requiredLevel, skill.requiredLevel);
      } else {
        skillVotes.set(key, {
          skill: { ...skill },
          votes: 1,
          totalImportance: skill.importance
        });
      }
    });

    return Array.from(skillVotes.values())
      .map(({ skill, votes, totalImportance }) => ({
        ...skill,
        importance: totalImportance / votes
      }))
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * 融合建议
   */
  private fuseSuggestions(localSuggestions: string[], cloudSuggestions: string[]): string[] {
    const allSuggestions = [...localSuggestions, ...cloudSuggestions];
    const uniqueSuggestions = [...new Set(allSuggestions)];

    // 按长度和质量排序，保留最有价值的建议
    return uniqueSuggestions
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);
  }

  /**
   * 计算融合置信度
   */
  private calculateFusionConfidence(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult,
    config: FusionConfig
  ): number {
    const weightedConfidence =
      localResult.confidence * config.localWeight +
      cloudResult.confidence * config.cloudWeight;

    // 考虑结果一致性
    const consistency = this.calculateResultConsistency(localResult, cloudResult);

    return Math.min(weightedConfidence * (0.7 + 0.3 * consistency), 1.0);
  }

  /**
   * 计算结果一致性
   */
  private calculateResultConsistency(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult
  ): number {
    // 关键词一致性
    const keywordConsistency = this.calculateKeywordConsistency(
      localResult.keywords,
      cloudResult.keywords
    );

    // 技能一致性
    const skillConsistency = this.calculateSkillConsistency(
      localResult.skills,
      cloudResult.skills
    );

    // 匹配度一致性
    const scoreConsistency = 1 - Math.abs(localResult.matchScore - cloudResult.matchScore);

    return (keywordConsistency + skillConsistency + scoreConsistency) / 3;
  }

  /**
   * 计算关键词一致性
   */
  private calculateKeywordConsistency(localKeywords: Keyword[], cloudKeywords: Keyword[]): number {
    const localSet = new Set(localKeywords.map(k => k.text.toLowerCase()));
    const cloudSet = new Set(cloudKeywords.map(k => k.text.toLowerCase()));

    const intersection = new Set([...localSet].filter(x => cloudSet.has(x)));
    const union = new Set([...localSet, ...cloudSet]);

    return intersection.size / union.size;
  }

  /**
   * 计算技能一致性
   */
  private calculateSkillConsistency(localSkills: Skill[], cloudSkills: Skill[]): number {
    const localSet = new Set(localSkills.map(s => s.name.toLowerCase()));
    const cloudSet = new Set(cloudSkills.map(s => s.name.toLowerCase()));

    const intersection = new Set([...localSet].filter(x => cloudSet.has(x)));
    const union = new Set([...localSet, ...cloudSet]);

    return intersection.size / union.size;
  }

  /**
   * 评估结果质量
   */
  private assessResultQuality(
    fusedResult: FusedResult,
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult
  ): QualityAssessment {
    // 完整性评估
    const completeness = this.assessCompleteness(fusedResult);

    // 一致性评估
    const consistency = this.calculateResultConsistency(localResult, cloudResult);

    // 相关性评估
    const relevance = this.assessRelevance(fusedResult);

    // 准确性评估（基于置信度）
    const accuracy = fusedResult.confidence;

    const overallScore = (completeness + consistency + relevance + accuracy) / 4;

    return {
      completeness,
      consistency,
      relevance,
      accuracy,
      overallScore
    };
  }

  /**
   * 评估完整性
   */
  private assessCompleteness(result: FusedResult): number {
    let score = 0;

    if (result.keywords.length > 0) score += 0.25;
    if (result.skills.length > 0) score += 0.25;
    if (result.matchScore > 0) score += 0.25;
    if (result.suggestions.length > 0) score += 0.25;

    return score;
  }

  /**
   * 评估相关性
   */
  private assessRelevance(result: FusedResult): number {
    // 基于关键词和技能的重要性评估相关性
    const avgKeywordImportance = result.keywords.length > 0 ?
      result.keywords.reduce((sum, k) => sum + k.importance, 0) / result.keywords.length : 0;

    const avgSkillImportance = result.skills.length > 0 ?
      result.skills.reduce((sum, s) => sum + s.importance, 0) / result.skills.length : 0;

    return (avgKeywordImportance + avgSkillImportance) / 2;
  }

  /**
   * 选择更好的结果
   */
  private selectBetterResult(
    localResult: LocalAnalysisResult,
    cloudResult: AIAnalysisResult
  ): LocalAnalysisResult | AIAnalysisResult {
    // 基于置信度和完整性选择
    const localScore = localResult.confidence * this.assessCompleteness(localResult as any);
    const cloudScore = cloudResult.confidence * this.assessCompleteness(cloudResult as any);

    return localScore > cloudScore ? localResult : cloudResult;
  }

  /**
   * 选择最优融合策略
   */
  private selectOptimalStrategy(
    localResult: LocalAnalysisResult | null,
    cloudResult: AIAnalysisResult | null
  ): string {
    if (!localResult || !cloudResult) {
      return 'weighted'; // 默认策略
    }

    const consistency = this.calculateResultConsistency(localResult, cloudResult);
    const confidenceDiff = Math.abs(localResult.confidence - cloudResult.confidence);

    if (consistency > 0.8) {
      return 'weighted'; // 结果一致，使用加权平均
    } else if (confidenceDiff > 0.3) {
      return 'selective'; // 置信度差异大，选择性融合
    } else {
      return 'ensemble'; // 使用集成策略
    }
  }

  /**
   * 创建降级结果
   */
  private createFallbackResult(
    result: LocalAnalysisResult | AIAnalysisResult,
    reason: string,
    startTime: number
  ): FusedResult {
    return {
      ...result,
      fusionMetadata: {
        strategy: reason,
        localWeight: reason.includes('local') ? 1 : 0,
        cloudWeight: reason.includes('cloud') ? 1 : 0,
        fusionConfidence: result.confidence,
        qualityScore: result.confidence,
        processingTime: Date.now() - startTime,
        fallbackUsed: true,
        errorCount: reason.includes('error') ? 1 : 0
      },
      localResult: 'localProcessing' in result ? result : undefined,
      cloudResult: !('localProcessing' in result) ? result : undefined
    };
  }

  /**
   * 维护历史记录大小
   */
  private maintainHistorySize(): void {
    if (this.fusionHistory.length > 100) {
      this.fusionHistory = this.fusionHistory.slice(-50); // 保留最近50条
    }
  }

  /**
   * 获取融合历史
   */
  getFusionHistory(): FusedResult[] {
    return [...this.fusionHistory];
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取配置
   */
  getConfig(): FusionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FusionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 清理历史记录
   */
  clearHistory(): void {
    this.fusionHistory.length = 0;
  }
}

// 创建默认融合服务实例
export const createResultFusionService = (config?: Partial<FusionConfig>): ResultFusionService => {
  return new ResultFusionService(config);
};

// 单例实例
let fusionServiceInstance: ResultFusionService | null = null;

export const getResultFusionService = (): ResultFusionService => {
  if (!fusionServiceInstance) {
    fusionServiceInstance = createResultFusionService();
  }
  return fusionServiceInstance;
};