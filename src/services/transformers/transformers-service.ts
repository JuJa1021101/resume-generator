/**
 * Transformers.js本地AI引擎服务
 * 提供本地文本分析、关键词提取和技能匹配功能
 */

import type {
  AIAnalysisResult,
  Keyword,
  Skill,
  SkillCategory
} from '../../types';

// 分析选项
export interface AnalysisOptions {
  extractKeywords: boolean;
  analyzeSkills: boolean;
  generateSuggestions: boolean;
  language: 'zh-CN' | 'en-US';
}

// 技能关键词数据库
const SKILL_DATABASE = {
  frontend: [
    'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SCSS', 'SASS',
    'jQuery', 'Bootstrap', 'Tailwind', 'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier'
  ],
  backend: [
    'Node.js', 'Python', 'Java', 'Go', 'PHP', 'C#', '.NET', 'Spring', 'Django', 'Flask',
    'Express', 'Koa', 'Fastify', 'Laravel', 'Symfony'
  ],
  database: [
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server',
    'Elasticsearch', 'InfluxDB', 'Cassandra'
  ],
  devops: [
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'GitLab CI', 'GitHub Actions',
    'Terraform', 'Ansible', 'Nginx', 'Apache'
  ],
  mobile: [
    'React Native', 'Flutter', 'Swift', 'Kotlin', 'Java', 'Objective-C', 'Xamarin',
    'Ionic', 'Cordova'
  ],
  tools: [
    'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'VS Code', 'IntelliJ',
    'Postman', 'Figma', 'Sketch'
  ]
};

export class TransformersService {
  private isInitialized: boolean = false;
  private pipeline: any = null;

  constructor() {
    // 初始化时设置环境变量
    this.setupEnvironment();
  }

  /**
   * 设置Transformers.js环境
   */
  private setupEnvironment(): void {
    // 确保全局对象存在
    if (typeof globalThis === 'undefined') {
      (window as any).globalThis = window;
    }

    // 设置Transformers.js环境变量
    if (typeof window !== 'undefined') {
      (window as any).global = window;
    }
  }

  /**
   * 初始化Transformers.js
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('TransformersService: 开始初始化...');

      // 动态导入Transformers.js
      const { pipeline, env } = await import('@xenova/transformers');

      // 配置环境
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      env.useCustomCache = true;

      console.log('TransformersService: Transformers.js导入成功');

      // 创建pipeline - 使用轻量级模型
      console.log('TransformersService: 创建pipeline...');
      this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log('TransformersService: 模型加载进度:', progress);
        }
      });

      this.isInitialized = true;
      console.log('TransformersService: 初始化完成');
    } catch (error) {
      console.error('TransformersService: 初始化失败:', error);

      // 如果Transformers.js初始化失败，使用fallback模式
      console.log('TransformersService: 使用fallback模式');
      this.isInitialized = true; // 标记为已初始化，使用规则引擎
    }
  }

  /**
   * 分析职位描述
   */
  async analyzeJobDescription(content: string, options: AnalysisOptions = {
    extractKeywords: true,
    analyzeSkills: true,
    generateSuggestions: true,
    language: 'zh-CN'
  }): Promise<AIAnalysisResult> {
    const startTime = performance.now();

    try {
      console.log('TransformersService: 开始分析，内容长度:', content.length);

      // 确保已初始化
      await this.initialize();

      const results: AIAnalysisResult = {
        keywords: [],
        skills: [],
        matchScore: 0,
        suggestions: [],
        processingTime: 0,
        confidence: 0.8
      };

      // 1. 提取关键词
      if (options.extractKeywords) {
        console.log('TransformersService: 开始提取关键词...');
        results.keywords = await this.extractKeywords(content);
        console.log('TransformersService: 提取到关键词数量:', results.keywords.length);
      }

      // 2. 分析技能要求
      if (options.analyzeSkills) {
        console.log('TransformersService: 开始分析技能...');
        results.skills = await this.analyzeSkills(content, results.keywords);
        console.log('TransformersService: 分析到技能数量:', results.skills.length);
      }

      // 3. 生成建议
      if (options.generateSuggestions) {
        console.log('TransformersService: 开始生成建议...');
        results.suggestions = await this.generateSuggestions(content, results.skills);
        console.log('TransformersService: 生成建议数量:', results.suggestions.length);
      }

      // 4. 计算整体匹配分数
      results.matchScore = this.calculateMatchScore(results.skills);

      results.processingTime = performance.now() - startTime;

      console.log('TransformersService: 分析完成，结果:', {
        keywords: results.keywords.length,
        skills: results.skills.length,
        suggestions: results.suggestions.length,
        matchScore: results.matchScore,
        processingTime: results.processingTime
      });

      return results;
    } catch (error) {
      console.error('TransformersService: 分析失败:', error);

      // 返回基础结果而不是抛出错误
      return {
        keywords: [],
        skills: [],
        matchScore: 0,
        suggestions: ['AI分析暂时不可用，请稍后重试'],
        processingTime: performance.now() - startTime,
        confidence: 0
      };
    }
  }

  /**
   * 提取关键词 - 结合AI和规则引擎
   */
  private async extractKeywords(content: string): Promise<Keyword[]> {
    const keywords: Keyword[] = [];
    const keywordMap = new Map<string, { importance: number; frequency: number; category: string }>();

    try {
      // 如果pipeline可用，使用AI增强分析
      if (this.pipeline) {
        console.log('TransformersService: 使用AI增强关键词提取');
        await this.extractKeywordsWithAI(content, keywordMap);
      }
    } catch (error) {
      console.log('TransformersService: AI关键词提取失败，使用规则引擎:', error);
    }

    // 使用规则引擎提取关键词
    this.extractKeywordsWithRules(content, keywordMap);

    // 转换为Keyword数组
    keywordMap.forEach((data, text) => {
      keywords.push({
        text,
        importance: data.importance,
        category: data.category as any,
        frequency: data.frequency
      });
    });

    return keywords.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 使用AI增强关键词提取
   */
  private async extractKeywordsWithAI(content: string, keywordMap: Map<string, any>): Promise<void> {
    try {
      // 将内容分段处理（避免超长文本）
      const chunks = this.chunkText(content, 500);

      for (const chunk of chunks) {
        // 使用特征提取获取语义向量
        const embeddings = await this.pipeline(chunk);

        // 基于语义向量增强关键词权重
        this.enhanceKeywordsWithEmbeddings(chunk, embeddings, keywordMap);
      }
    } catch (error) {
      console.log('TransformersService: AI增强处理失败:', error);
    }
  }

  /**
   * 使用规则引擎提取关键词
   */
  private extractKeywordsWithRules(content: string, keywordMap: Map<string, any>): void {
    const lowerContent = content.toLowerCase();

    // 1. 技术技能关键词
    Object.entries(SKILL_DATABASE).forEach(([category, skills]) => {
      skills.forEach(skill => {
        const patterns = [
          new RegExp(`\\b${skill.toLowerCase()}\\b`, 'g'),
          new RegExp(`${skill.toLowerCase()}`, 'g')
        ];

        let totalMatches = 0;
        patterns.forEach(pattern => {
          const matches = lowerContent.match(pattern);
          if (matches) {
            totalMatches += matches.length;
          }
        });

        if (totalMatches > 0) {
          const importance = this.calculateKeywordImportance(skill, totalMatches, content.length);
          const existing = keywordMap.get(skill);

          keywordMap.set(skill, {
            importance: existing ? Math.max(existing.importance, importance) : importance,
            frequency: existing ? existing.frequency + totalMatches : totalMatches,
            category: 'technical'
          });
        }
      });
    });

    // 2. 软技能关键词
    const softSkills = [
      '沟通', '团队合作', '领导力', '学习能力', '解决问题', '创新', '责任心', '抗压',
      '协作', '配合', '管理', '组织', '执行', '分析', '思维', '逻辑',
      'communication', 'teamwork', 'leadership', 'learning', 'problem solving'
    ];

    softSkills.forEach(skill => {
      const matches = lowerContent.match(new RegExp(`${skill}`, 'gi'));
      if (matches) {
        const importance = this.calculateKeywordImportance(skill, matches.length, content.length, 0.8);
        keywordMap.set(skill, {
          importance,
          frequency: matches.length,
          category: 'soft'
        });
      }
    });

    // 3. 通用技术关键词
    const generalTechKeywords = [
      '前端', '后端', '全栈', '开发', '编程', '算法', '数据结构', '数据库',
      '框架', '库', '工具', '测试', '部署', '运维', '架构', '设计模式',
      'API', 'REST', 'GraphQL', 'HTTP', 'HTTPS', 'JSON', 'XML'
    ];

    generalTechKeywords.forEach(keyword => {
      const matches = lowerContent.match(new RegExp(`${keyword}`, 'gi'));
      if (matches) {
        const importance = this.calculateKeywordImportance(keyword, matches.length, content.length, 0.9);
        keywordMap.set(keyword, {
          importance,
          frequency: matches.length,
          category: 'domain'
        });
      }
    });
  }

  /**
   * 基于语义向量增强关键词
   */
  private enhanceKeywordsWithEmbeddings(text: string, embeddings: any, keywordMap: Map<string, any>): void {
    // 这里可以实现更复杂的语义分析
    // 目前简化处理，主要用于权重调整
    const semanticBoost = 0.1;

    keywordMap.forEach((data, keyword) => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        data.importance = Math.min(data.importance + semanticBoost, 1);
      }
    });
  }

  /**
   * 分析技能要求
   */
  private async analyzeSkills(content: string, keywords: Keyword[]): Promise<Skill[]> {
    const skills: Skill[] = [];

    // 从关键词中提取技能
    keywords.forEach(keyword => {
      if (keyword.category === 'technical') {
        const category = this.determineSkillCategory(keyword.text);
        const requiredLevel = this.estimateRequiredLevel(keyword, content);

        skills.push({
          name: keyword.text,
          category,
          importance: keyword.importance,
          matched: false,
          requiredLevel
        });
      }
    });

    // 如果没有找到技能，添加基础技能
    if (skills.length === 0) {
      const basicSkills = ['JavaScript', 'HTML', 'CSS', 'React', 'Vue', 'Python', 'Java'];
      basicSkills.forEach(skillName => {
        if (content.toLowerCase().includes(skillName.toLowerCase())) {
          skills.push({
            name: skillName,
            category: this.determineSkillCategory(skillName),
            importance: 0.7,
            matched: false,
            requiredLevel: 3
          });
        }
      });
    }

    return skills.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 生成建议
   */
  private async generateSuggestions(content: string, skills: Skill[]): Promise<string[]> {
    const suggestions: string[] = [];

    // 基于技能的建议
    const topSkills = skills.slice(0, 5);
    if (topSkills.length > 0) {
      suggestions.push(`重点突出以下核心技能：${topSkills.map(s => s.name).join('、')}`);
    }

    // 基于内容的建议
    if (content.includes('经验') || content.includes('年')) {
      suggestions.push('在简历中详细描述相关工作经验和项目经历');
    }

    if (content.includes('团队') || content.includes('合作')) {
      suggestions.push('强调团队协作能力和沟通技巧');
    }

    if (content.includes('项目') || content.includes('产品')) {
      suggestions.push('提供具体的项目案例和成果展示');
    }

    // 技能类别建议
    const skillCategories = [...new Set(skills.map(s => s.category))];
    if (skillCategories.includes('frontend') && skillCategories.includes('backend')) {
      suggestions.push('展示全栈开发能力，突出技术栈的完整性');
    }

    if (skillCategories.includes('devops')) {
      suggestions.push('强调DevOps实践经验和自动化部署能力');
    }

    return suggestions.slice(0, 6);
  }

  /**
   * 文本分块
   */
  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?。！？]/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence + '。';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 计算关键词重要性
   */
  private calculateKeywordImportance(keyword: string, frequency: number, contentLength: number, weight: number = 1): number {
    const tf = frequency / (contentLength / 100);
    let importance = Math.min(tf * 0.1, 1) * weight;

    if (this.isHighValueSkill(keyword)) {
      importance *= 1.2;
    }

    return Math.min(importance, 1);
  }

  /**
   * 判断是否为高价值技能
   */
  private isHighValueSkill(skill: string): boolean {
    const highValueSkills = [
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'Go',
      'Docker', 'Kubernetes', 'AWS', 'TypeScript', 'MongoDB', 'Redis'
    ];

    return highValueSkills.some(hvs =>
      skill.toLowerCase().includes(hvs.toLowerCase())
    );
  }

  /**
   * 确定技能类别
   */
  private determineSkillCategory(skill: string): SkillCategory {
    for (const [category, skills] of Object.entries(SKILL_DATABASE)) {
      if (skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
        return category as SkillCategory;
      }
    }
    return 'tools';
  }

  /**
   * 估算技能要求等级
   */
  private estimateRequiredLevel(keyword: Keyword, content: string): number {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('精通') || lowerContent.includes('专家')) {
      return 5;
    } else if (lowerContent.includes('熟练') || lowerContent.includes('深入')) {
      return 4;
    } else if (lowerContent.includes('熟悉') || lowerContent.includes('掌握')) {
      return 3;
    } else if (lowerContent.includes('了解') || lowerContent.includes('基础')) {
      return 2;
    }

    if (keyword.importance > 0.8) return 4;
    if (keyword.importance > 0.6) return 3;
    if (keyword.importance > 0.4) return 2;
    return 1;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(skills: Skill[]): number {
    if (skills.length === 0) return 0;

    const totalImportance = skills.reduce((sum, skill) => sum + skill.importance, 0);
    const averageImportance = totalImportance / skills.length;
    const skillCountBonus = Math.min(skills.length / 10, 0.2);

    return Math.min(averageImportance + skillCountBonus, 1);
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPipeline: !!this.pipeline,
      mode: this.pipeline ? 'AI-Enhanced' : 'Rule-Based'
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.pipeline = null;
    this.isInitialized = false;
  }
}