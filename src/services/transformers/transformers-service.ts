/**
 * Transformers.js本地AI引擎服务
 * 提供本地文本分析、关键词提取和技能匹配功能
 */

import { pipeline, Pipeline, env } from '@xenova/transformers';
import type {
  AIAnalysisResult,
  Keyword,
  Skill,
  UserSkill,
  JobDescription,
  MatchResult,
  PerformanceMetrics
} from '../../types';

// 配置Transformers.js环境
env.allowRemoteModels = true;
env.allowLocalModels = true;

// 模型配置接口
export interface TransformersConfig {
  modelName: string;
  task: 'text-classification' | 'token-classification' | 'feature-extraction' | 'text2text-generation';
  device: 'cpu' | 'gpu';
  quantized: boolean;
  cacheDir?: string;
  maxLength: number;
  temperature: number;
}

// 模型元数据
export interface ModelMetadata {
  name: string;
  size: number;
  version: string;
  task: string;
  language: string;
  loadedAt: Date;
  performance: ModelPerformance;
}

export interface ModelPerformance {
  loadTime: number;
  inferenceTime: number;
  memoryUsage: number;
  accuracy: number;
}

// 分析选项
export interface AnalysisOptions {
  extractKeywords: boolean;
  analyzeSkills: boolean;
  calculateMatch: boolean;
  language: 'zh' | 'en';
  confidenceThreshold: number;
}

// 本地AI分析结果
export interface LocalAnalysisResult extends AIAnalysisResult {
  modelUsed: string;
  localProcessing: true;
  modelMetadata: ModelMetadata;
}

/**
 * Transformers.js本地AI引擎
 */
export class TransformersService {
  private models: Map<string, Pipeline> = new Map();
  private modelMetadata: Map<string, ModelMetadata> = new Map();
  private loadingPromises: Map<string, Promise<Pipeline>> = new Map();
  private config: TransformersConfig;
  private performanceMetrics: PerformanceMetrics;

  constructor(config: Partial<TransformersConfig> = {}) {
    this.config = {
      modelName: 'Xenova/distilbert-base-uncased',
      task: 'feature-extraction',
      device: 'cpu',
      quantized: true,
      maxLength: 512,
      temperature: 0.3,
      ...config
    };

    this.performanceMetrics = {
      loadTime: 0,
      aiProcessingTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };
  }

  /**
   * 加载指定模型
   */
  async loadModel(modelName: string, task: string): Promise<Pipeline> {
    const modelKey = `${modelName}_${task}`;

    // 如果模型已加载，直接返回
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // 如果正在加载，等待加载完成
    if (this.loadingPromises.has(modelKey)) {
      return this.loadingPromises.get(modelKey)!;
    }

    // 开始加载模型
    const loadingPromise = this.loadModelInternal(modelName, task);
    this.loadingPromises.set(modelKey, loadingPromise);

    try {
      const model = await loadingPromise;
      this.models.set(modelKey, model);
      return model;
    } finally {
      this.loadingPromises.delete(modelKey);
    }
  }

  /**
   * 内部模型加载逻辑
   */
  private async loadModelInternal(modelName: string, task: string): Promise<Pipeline> {
    const startTime = Date.now();

    try {
      console.log(`Loading model: ${modelName} for task: ${task}`);

      const model = await pipeline(task as any, modelName, {
        quantized: this.config.quantized,
        device: this.config.device,
        cache_dir: this.config.cacheDir
      });

      const loadTime = Date.now() - startTime;

      // 记录模型元数据
      const metadata: ModelMetadata = {
        name: modelName,
        size: this.estimateModelSize(modelName),
        version: '1.0.0',
        task,
        language: this.detectLanguage(modelName),
        loadedAt: new Date(),
        performance: {
          loadTime,
          inferenceTime: 0,
          memoryUsage: 0,
          accuracy: 0.85 // 默认准确率
        }
      };

      this.modelMetadata.set(`${modelName}_${task}`, metadata);
      this.performanceMetrics.loadTime += loadTime;

      console.log(`Model loaded successfully in ${loadTime}ms`);
      return model;

    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw new Error(`模型加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 分析JD内容
   */
  async analyzeJobDescription(
    content: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<LocalAnalysisResult> {
    const startTime = Date.now();

    const analysisOptions: AnalysisOptions = {
      extractKeywords: true,
      analyzeSkills: true,
      calculateMatch: false,
      language: 'zh',
      confidenceThreshold: 0.5,
      ...options
    };

    try {
      // 预处理文本
      const processedContent = this.preprocessText(content);

      // 并行执行不同的分析任务
      const [keywords, skills] = await Promise.all([
        analysisOptions.extractKeywords ? this.extractKeywords(processedContent, analysisOptions.language) : [],
        analysisOptions.analyzeSkills ? this.analyzeSkills(processedContent, analysisOptions.language) : []
      ]);

      // 计算整体匹配度（基于关键词和技能分析）
      const matchScore = this.calculateOverallScore(keywords, skills);

      // 生成建议
      const suggestions = this.generateSuggestions(keywords, skills, analysisOptions.language);

      const processingTime = Date.now() - startTime;
      this.performanceMetrics.aiProcessingTime += processingTime;

      const result: LocalAnalysisResult = {
        keywords,
        skills,
        matchScore,
        suggestions,
        processingTime,
        confidence: this.calculateConfidence(keywords, skills),
        modelUsed: this.config.modelName,
        localProcessing: true,
        modelMetadata: this.modelMetadata.get(`${this.config.modelName}_${this.config.task}`)!
      };

      return result;

    } catch (error) {
      console.error('JD analysis failed:', error);
      throw new Error(`JD分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 提取关键词
   */
  async extractKeywords(text: string, language: 'zh' | 'en' = 'zh'): Promise<Keyword[]> {
    try {
      // 使用特征提取模型
      const model = await this.loadModel(
        language === 'zh' ? 'Xenova/distilbert-base-multilingual-cased' : 'Xenova/distilbert-base-uncased',
        'feature-extraction'
      );

      // 分词和特征提取
      const tokens = this.tokenizeText(text, language);
      const features = await model(tokens.slice(0, this.config.maxLength));

      // 基于特征向量计算关键词重要性
      const keywords = this.extractKeywordsFromFeatures(tokens, features, language);

      return keywords.map(keyword => ({
        text: keyword.text,
        importance: keyword.importance,
        category: this.categorizeKeyword(keyword.text, language),
        frequency: keyword.frequency
      }));

    } catch (error) {
      console.error('Keyword extraction failed:', error);
      return this.fallbackKeywordExtraction(text, language);
    }
  }

  /**
   * 分析技能要求
   */
  async analyzeSkills(text: string, language: 'zh' | 'en' = 'zh'): Promise<Skill[]> {
    try {
      // 使用命名实体识别模型识别技能
      const model = await this.loadModel(
        'Xenova/bert-base-NER',
        'token-classification'
      );

      const entities = await model(text);

      // 过滤和处理技能实体
      const skills = this.processSkillEntities(entities, language);

      return skills.map(skill => ({
        name: skill.name,
        category: skill.category,
        importance: skill.importance,
        matched: false, // 本地分析时默认为false，需要与用户技能匹配
        requiredLevel: skill.requiredLevel
      }));

    } catch (error) {
      console.error('Skill analysis failed:', error);
      return this.fallbackSkillAnalysis(text, language);
    }
  }

  /**
   * 技能匹配分析
   */
  async matchSkills(
    jobDescription: JobDescription,
    userSkills: UserSkill[]
  ): Promise<MatchResult> {
    const startTime = Date.now();

    try {
      // 分析JD中的技能要求
      const requiredSkills = await this.analyzeSkills(jobDescription.content);

      // 计算技能匹配度
      const matchResults = this.calculateSkillMatches(requiredSkills, userSkills);

      // 生成匹配结果
      const result: MatchResult = {
        overallScore: matchResults.overallScore,
        categoryScores: matchResults.categoryScores,
        gaps: matchResults.gaps,
        strengths: matchResults.strengths,
        recommendations: matchResults.recommendations
      };

      this.performanceMetrics.aiProcessingTime += Date.now() - startTime;
      return result;

    } catch (error) {
      console.error('Skill matching failed:', error);
      throw new Error(`技能匹配失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量处理多个JD
   */
  async batchAnalyze(
    jobDescriptions: string[],
    options: Partial<AnalysisOptions> = {}
  ): Promise<LocalAnalysisResult[]> {
    const results: LocalAnalysisResult[] = [];

    for (let i = 0; i < jobDescriptions.length; i++) {
      try {
        const result = await this.analyzeJobDescription(jobDescriptions[i], options);
        results.push(result);
      } catch (error) {
        console.error(`Batch analysis failed for item ${i}:`, error);
        // 继续处理其他项目
      }
    }

    return results;
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelName?: string): ModelMetadata[] {
    if (modelName) {
      const metadata = Array.from(this.modelMetadata.values())
        .filter(meta => meta.name === modelName);
      return metadata;
    }
    return Array.from(this.modelMetadata.values());
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 清理模型缓存
   */
  clearModelCache(): void {
    this.models.clear();
    this.modelMetadata.clear();
    this.loadingPromises.clear();
    console.log('Model cache cleared');
  }

  /**
   * 预处理文本
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中英文字符和空格
      .toLowerCase();
  }

  /**
   * 文本分词
   */
  private tokenizeText(text: string, language: 'zh' | 'en'): string[] {
    if (language === 'zh') {
      // 简单的中文分词（实际项目中应使用专业分词库）
      return text.split('').filter(char => char.trim());
    } else {
      return text.split(/\s+/).filter(word => word.trim());
    }
  }

  /**
   * 从特征向量提取关键词
   */
  private extractKeywordsFromFeatures(
    tokens: string[],
    features: any,
    language: 'zh' | 'en'
  ): Array<{ text: string, importance: number, frequency: number }> {
    // 简化的关键词提取逻辑
    const keywordMap = new Map<string, { importance: number, frequency: number }>();

    // 技术关键词词典
    const techKeywords = language === 'zh'
      ? ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', '数据库', '前端', '后端']
      : ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'database', 'frontend', 'backend'];

    tokens.forEach(token => {
      const lowerToken = token.toLowerCase();
      if (techKeywords.some(keyword => keyword.toLowerCase().includes(lowerToken) || lowerToken.includes(keyword.toLowerCase()))) {
        const existing = keywordMap.get(token) || { importance: 0, frequency: 0 };
        keywordMap.set(token, {
          importance: Math.min(existing.importance + 0.1, 1.0),
          frequency: existing.frequency + 1
        });
      }
    });

    return Array.from(keywordMap.entries()).map(([text, data]) => ({
      text,
      importance: data.importance,
      frequency: data.frequency
    })).sort((a, b) => b.importance - a.importance).slice(0, 20);
  }

  /**
   * 关键词分类
   */
  private categorizeKeyword(keyword: string, language: 'zh' | 'en'): 'technical' | 'soft' | 'domain' {
    const technical = language === 'zh'
      ? ['React', 'Vue', 'JavaScript', 'Python', 'Java', '数据库', 'API']
      : ['React', 'Vue', 'JavaScript', 'Python', 'Java', 'database', 'API'];

    const soft = language === 'zh'
      ? ['团队', '沟通', '领导', '协作', '学习']
      : ['team', 'communication', 'leadership', 'collaboration', 'learning'];

    const lowerKeyword = keyword.toLowerCase();

    if (technical.some(tech => lowerKeyword.includes(tech.toLowerCase()))) {
      return 'technical';
    }
    if (soft.some(s => lowerKeyword.includes(s.toLowerCase()))) {
      return 'soft';
    }
    return 'domain';
  }

  /**
   * 处理技能实体
   */
  private processSkillEntities(entities: any[], language: 'zh' | 'en'): Array<{
    name: string,
    category: any,
    importance: number,
    requiredLevel: number
  }> {
    // 简化的技能处理逻辑
    const skillMap = new Map<string, { category: any, importance: number, requiredLevel: number }>();

    const skillCategories = {
      'React': 'frontend',
      'Vue': 'frontend',
      'JavaScript': 'frontend',
      'TypeScript': 'frontend',
      'Node.js': 'backend',
      'Python': 'backend',
      'Java': 'backend',
      'MySQL': 'database',
      'MongoDB': 'database'
    };

    entities.forEach((entity: any) => {
      if (entity.entity_group === 'MISC' || entity.entity_group === 'ORG') {
        const skillName = entity.word;
        const category = (skillCategories as any)[skillName] || 'tools';

        skillMap.set(skillName, {
          category,
          importance: entity.score || 0.7,
          requiredLevel: Math.ceil(entity.score * 5) || 3
        });
      }
    });

    return Array.from(skillMap.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }

  /**
   * 计算整体匹配度
   */
  private calculateOverallScore(keywords: Keyword[], skills: Skill[]): number {
    const keywordScore = keywords.reduce((sum, kw) => sum + kw.importance, 0) / keywords.length || 0;
    const skillScore = skills.reduce((sum, skill) => sum + skill.importance, 0) / skills.length || 0;

    return Math.min((keywordScore * 0.4 + skillScore * 0.6), 1.0);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(keywords: Keyword[], skills: Skill[]): number {
    const avgKeywordImportance = keywords.reduce((sum, kw) => sum + kw.importance, 0) / keywords.length || 0;
    const avgSkillImportance = skills.reduce((sum, skill) => sum + skill.importance, 0) / skills.length || 0;

    return Math.min((avgKeywordImportance + avgSkillImportance) / 2, 1.0);
  }

  /**
   * 生成建议
   */
  private generateSuggestions(keywords: Keyword[], skills: Skill[], language: 'zh' | 'en'): string[] {
    const suggestions: string[] = [];

    const topKeywords = keywords.slice(0, 3);
    const topSkills = skills.slice(0, 3);

    if (language === 'zh') {
      if (topKeywords.length > 0) {
        suggestions.push(`重点关注关键词: ${topKeywords.map(kw => kw.text).join(', ')}`);
      }
      if (topSkills.length > 0) {
        suggestions.push(`提升核心技能: ${topSkills.map(skill => skill.name).join(', ')}`);
      }
      suggestions.push('建议在简历中突出相关项目经验');
    } else {
      if (topKeywords.length > 0) {
        suggestions.push(`Focus on keywords: ${topKeywords.map(kw => kw.text).join(', ')}`);
      }
      if (topSkills.length > 0) {
        suggestions.push(`Improve core skills: ${topSkills.map(skill => skill.name).join(', ')}`);
      }
      suggestions.push('Highlight relevant project experience in resume');
    }

    return suggestions;
  }

  /**
   * 计算技能匹配
   */
  private calculateSkillMatches(requiredSkills: Skill[], userSkills: UserSkill[]): any {
    // 简化的技能匹配逻辑
    const matchedSkills = requiredSkills.map(required => {
      const userSkill = userSkills.find(user =>
        user.name.toLowerCase() === required.name.toLowerCase() ||
        user.name.toLowerCase().includes(required.name.toLowerCase())
      );

      return {
        ...required,
        matched: !!userSkill,
        userLevel: userSkill?.level || 0
      };
    });

    const overallScore = matchedSkills.reduce((sum, skill) => {
      if (skill.matched) {
        return sum + (skill.userLevel / 5) * skill.importance;
      }
      return sum;
    }, 0) / matchedSkills.length;

    return {
      overallScore,
      categoryScores: [],
      gaps: [],
      strengths: matchedSkills.filter(s => s.matched).map(s => s.name),
      recommendations: ['继续提升技能水平', '关注行业发展趋势']
    };
  }

  /**
   * 备用关键词提取
   */
  private fallbackKeywordExtraction(text: string, language: 'zh' | 'en'): Keyword[] {
    const techKeywords = language === 'zh'
      ? ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java']
      : ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java'];

    return techKeywords
      .filter(keyword => text.toLowerCase().includes(keyword.toLowerCase()))
      .map(keyword => ({
        text: keyword,
        importance: 0.7,
        category: 'technical' as const,
        frequency: 1
      }));
  }

  /**
   * 备用技能分析
   */
  private fallbackSkillAnalysis(text: string, language: 'zh' | 'en'): Skill[] {
    const skills = language === 'zh'
      ? ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js']
      : ['React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js'];

    return skills
      .filter(skill => text.toLowerCase().includes(skill.toLowerCase()))
      .map(skill => ({
        name: skill,
        category: 'frontend' as any,
        importance: 0.7,
        matched: false,
        requiredLevel: 3
      }));
  }

  /**
   * 估算模型大小
   */
  private estimateModelSize(modelName: string): number {
    // 简化的模型大小估算（MB）
    const sizeMap: Record<string, number> = {
      'Xenova/distilbert-base-uncased': 250,
      'Xenova/distilbert-base-multilingual-cased': 500,
      'Xenova/bert-base-NER': 400
    };

    return sizeMap[modelName] || 300;
  }

  /**
   * 检测模型语言
   */
  private detectLanguage(modelName: string): string {
    if (modelName.includes('multilingual') || modelName.includes('chinese')) {
      return 'multilingual';
    }
    return 'english';
  }
}

// 创建默认实例
export const createTransformersService = (config?: Partial<TransformersConfig>): TransformersService => {
  return new TransformersService(config);
};

// 单例实例
let transformersServiceInstance: TransformersService | null = null;

export const getTransformersService = (): TransformersService => {
  if (!transformersServiceInstance) {
    transformersServiceInstance = createTransformersService();
  }
  return transformersServiceInstance;
};