/**
 * JD分析服务 - 整合多种AI引擎进行职位描述分析
 */

import {
  JobDescription,
  AIAnalysisResult,
  Keyword,
  Skill,
  RequiredSkill,
  JobRequirement,
  SkillCategory,
  UserPreferences,
  PerformanceMetrics
} from '../types';

// JD分析配置
export interface JDAnalysisConfig {
  aiEngine: 'gpt4o' | 'transformers';
  extractKeywords: boolean;
  analyzeSkills: boolean;
  generateSuggestions: boolean;
  language: 'zh-CN' | 'en-US';
}

// JD分析结果
export interface JDAnalysisResult {
  id: string;
  originalContent: string;
  cleanedContent: string;
  jobInfo: {
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    experience?: string;
  };
  keywords: Keyword[];
  skills: RequiredSkill[];
  requirements: JobRequirement[];
  aiAnalysis: AIAnalysisResult;
  performanceMetrics: PerformanceMetrics;
  analyzedAt: Date;
}

// 技能关键词映射表
const SKILL_KEYWORDS_MAP: Record<string, { category: SkillCategory; aliases: string[] }> = {
  // Frontend
  'React': { category: 'frontend', aliases: ['react', 'reactjs', 'react.js'] },
  'Vue': { category: 'frontend', aliases: ['vue', 'vuejs', 'vue.js'] },
  'Angular': { category: 'frontend', aliases: ['angular', 'angularjs'] },
  'JavaScript': { category: 'frontend', aliases: ['javascript', 'js', 'es6', 'es2015'] },
  'TypeScript': { category: 'frontend', aliases: ['typescript', 'ts'] },
  'HTML': { category: 'frontend', aliases: ['html', 'html5'] },
  'CSS': { category: 'frontend', aliases: ['css', 'css3', 'scss', 'sass', 'less'] },

  // Backend
  'Node.js': { category: 'backend', aliases: ['nodejs', 'node', 'node.js'] },
  'Python': { category: 'backend', aliases: ['python', 'py'] },
  'Java': { category: 'backend', aliases: ['java', 'jvm'] },
  'Go': { category: 'backend', aliases: ['go', 'golang'] },
  'PHP': { category: 'backend', aliases: ['php'] },
  'C#': { category: 'backend', aliases: ['c#', 'csharp', '.net'] },

  // Database
  'MySQL': { category: 'database', aliases: ['mysql'] },
  'PostgreSQL': { category: 'database', aliases: ['postgresql', 'postgres'] },
  'MongoDB': { category: 'database', aliases: ['mongodb', 'mongo'] },
  'Redis': { category: 'database', aliases: ['redis'] },

  // DevOps
  'Docker': { category: 'devops', aliases: ['docker', '容器'] },
  'Kubernetes': { category: 'devops', aliases: ['kubernetes', 'k8s'] },
  'AWS': { category: 'devops', aliases: ['aws', 'amazon web services'] },
  'Git': { category: 'devops', aliases: ['git', 'github', 'gitlab'] },

  // Tools
  'Webpack': { category: 'tools', aliases: ['webpack'] },
  'Vite': { category: 'tools', aliases: ['vite'] },
  'Jest': { category: 'tools', aliases: ['jest', '单元测试'] },
  'ESLint': { category: 'tools', aliases: ['eslint', 'lint'] },
};

export class JDAnalyzer {
  private config: JDAnalysisConfig;

  constructor(config: JDAnalysisConfig) {
    this.config = config;
  }

  /**
   * 分析职位描述
   */
  async analyzeJD(content: string): Promise<JDAnalysisResult> {
    const startTime = performance.now();
    const analysisId = this.generateAnalysisId();

    try {
      // 1. 清理和预处理内容
      const cleanedContent = this.cleanContent(content);

      // 2. 提取基本职位信息
      const jobInfo = this.extractJobInfo(cleanedContent);

      // 3. 关键词提取
      const keywords = this.config.extractKeywords
        ? await this.extractKeywords(cleanedContent)
        : [];

      // 4. 技能分析
      const skills = this.config.analyzeSkills
        ? await this.analyzeSkills(cleanedContent, keywords)
        : [];

      // 5. 要求分析
      const requirements = await this.extractRequirements(cleanedContent);

      // 6. AI深度分析
      const aiAnalysis = await this.performAIAnalysis(cleanedContent);

      // 7. 性能指标
      const endTime = performance.now();
      const performanceMetrics: PerformanceMetrics = {
        loadTime: 0,
        aiProcessingTime: endTime - startTime,
        renderTime: 0,
        memoryUsage: this.getMemoryUsage(),
        cacheHitRate: 0
      };

      return {
        id: analysisId,
        originalContent: content,
        cleanedContent,
        jobInfo,
        keywords,
        skills,
        requirements,
        aiAnalysis,
        performanceMetrics,
        analyzedAt: new Date()
      };

    } catch (error) {
      console.error('JD分析失败:', error);
      throw new Error(`JD分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理内容
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * 提取职位基本信息
   */
  private extractJobInfo(content: string): JDAnalysisResult['jobInfo'] {
    const lines = content.split('\n').filter(line => line.trim());

    // 提取职位标题
    const titlePatterns = [
      /职位[:：]\s*(.+)/,
      /岗位[:：]\s*(.+)/,
      /招聘[:：]\s*(.+)/,
      /^(.+?)(?:招聘|职位|岗位)/
    ];

    let title: string | undefined;
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }

    // 提取公司信息
    const companyMatch = content.match(/公司[:：]\s*([^\n]+)/);
    const company = companyMatch?.[1]?.trim();

    // 提取地点信息
    const locationMatch = content.match(/(?:地点|位置|工作地点)[:：]\s*([^\n]+)/);
    const location = locationMatch?.[1]?.trim();

    // 提取薪资信息
    const salaryPatterns = [
      /薪资[:：]\s*([^\n]+)/,
      /工资[:：]\s*([^\n]+)/,
      /(\d+k?-?\d*k?)/i
    ];

    let salary: string | undefined;
    for (const pattern of salaryPatterns) {
      const match = content.match(pattern);
      if (match) {
        salary = match[1].trim();
        break;
      }
    }

    // 提取经验要求
    const experiencePatterns = [
      /经验[:：]\s*([^\n]+)/,
      /工作经验[:：]\s*([^\n]+)/,
      /(\d+年?以上?经验)/
    ];

    let experience: string | undefined;
    for (const pattern of experiencePatterns) {
      const match = content.match(pattern);
      if (match) {
        experience = match[1].trim();
        break;
      }
    }

    return { title, company, location, salary, experience };
  }

  /**
   * 提取关键词
   */
  private async extractKeywords(content: string): Promise<Keyword[]> {
    const keywords: Keyword[] = [];

    // 技术关键词提取
    const techKeywords = this.extractTechKeywords(content);
    keywords.push(...techKeywords);

    // 软技能关键词提取
    const softSkillKeywords = this.extractSoftSkillKeywords(content);
    keywords.push(...softSkillKeywords);

    // 领域关键词提取
    const domainKeywords = this.extractDomainKeywords(content);
    keywords.push(...domainKeywords);

    // 按重要性排序
    return keywords.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 提取技术关键词
   */
  private extractTechKeywords(content: string): Keyword[] {
    const keywords: Keyword[] = [];
    const lowerContent = content.toLowerCase();

    Object.entries(SKILL_KEYWORDS_MAP).forEach(([skill, config]) => {
      config.aliases.forEach(alias => {
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          const frequency = matches.length;
          const importance = this.calculateKeywordImportance(alias, frequency, content.length);

          keywords.push({
            text: skill,
            importance,
            category: 'technical',
            frequency
          });
        }
      });
    });

    return keywords;
  }

  /**
   * 提取软技能关键词
   */
  private extractSoftSkillKeywords(content: string): Keyword[] {
    const softSkills = [
      '沟通', '团队合作', '领导力', '学习能力', '解决问题',
      '创新', '责任心', '抗压', '细心', '主动性'
    ];

    const keywords: Keyword[] = [];

    softSkills.forEach(skill => {
      const regex = new RegExp(`\\b${skill}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        const frequency = matches.length;
        const importance = this.calculateKeywordImportance(skill, frequency, content.length);

        keywords.push({
          text: skill,
          importance,
          category: 'soft',
          frequency
        });
      }
    });

    return keywords;
  }

  /**
   * 提取领域关键词
   */
  private extractDomainKeywords(content: string): Keyword[] {
    const domains = [
      '前端', '后端', '全栈', '移动端', '数据库', '运维',
      '测试', '产品', '设计', '算法', '机器学习', '人工智能'
    ];

    const keywords: Keyword[] = [];

    domains.forEach(domain => {
      const regex = new RegExp(`\\b${domain}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        const frequency = matches.length;
        const importance = this.calculateKeywordImportance(domain, frequency, content.length);

        keywords.push({
          text: domain,
          importance,
          category: 'domain',
          frequency
        });
      }
    });

    return keywords;
  }

  /**
   * 计算关键词重要性
   */
  private calculateKeywordImportance(keyword: string, frequency: number, contentLength: number): number {
    // TF-IDF简化版本
    const tf = frequency / contentLength * 1000; // 词频
    const baseImportance = Math.min(tf * 10, 1); // 基础重要性

    // 根据关键词类型调整权重
    let typeWeight = 1;
    if (SKILL_KEYWORDS_MAP[keyword]) {
      typeWeight = 1.2; // 技术技能权重更高
    }

    return Math.min(baseImportance * typeWeight, 1);
  }

  /**
   * 分析技能要求
   */
  private async analyzeSkills(content: string, keywords: Keyword[]): Promise<RequiredSkill[]> {
    const skills: RequiredSkill[] = [];

    // 从关键词中提取技能
    keywords.forEach(keyword => {
      if (keyword.category === 'technical') {
        const skillConfig = Object.values(SKILL_KEYWORDS_MAP).find(config =>
          config.aliases.some(alias => alias.toLowerCase() === keyword.text.toLowerCase())
        );

        if (skillConfig) {
          skills.push({
            name: keyword.text,
            importance: keyword.importance,
            category: skillConfig.category,
            requiredLevel: this.estimateRequiredLevel(keyword, content)
          });
        }
      }
    });

    return skills.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 估算技能要求等级
   */
  private estimateRequiredLevel(keyword: Keyword, content: string): number {
    const lowerContent = content.toLowerCase();

    // 根据描述词判断等级
    if (lowerContent.includes('精通') || lowerContent.includes('专家')) {
      return 5;
    } else if (lowerContent.includes('熟练') || lowerContent.includes('深入')) {
      return 4;
    } else if (lowerContent.includes('熟悉') || lowerContent.includes('掌握')) {
      return 3;
    } else if (lowerContent.includes('了解') || lowerContent.includes('基础')) {
      return 2;
    }

    // 默认根据重要性判断
    if (keyword.importance > 0.8) return 4;
    if (keyword.importance > 0.6) return 3;
    if (keyword.importance > 0.4) return 2;
    return 1;
  }

  /**
   * 提取职位要求
   */
  private async extractRequirements(content: string): Promise<JobRequirement[]> {
    const requirements: JobRequirement[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 识别要求相关的行
      if (this.isRequirementLine(trimmedLine)) {
        const type = this.determineRequirementType(trimmedLine);
        const importance = this.calculateRequirementImportance(trimmedLine);
        const category = this.categorizeRequirement(trimmedLine);

        requirements.push({
          type,
          description: trimmedLine,
          importance,
          category
        });
      }
    });

    return requirements.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 判断是否为要求行
   */
  private isRequirementLine(line: string): boolean {
    const requirementPatterns = [
      /要求|需要|必须|应该|希望|优先|加分/,
      /经验|技能|能力|背景|学历/,
      /熟悉|掌握|了解|精通|熟练/
    ];

    return requirementPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 确定要求类型
   */
  private determineRequirementType(line: string): 'must-have' | 'nice-to-have' {
    const mustHaveKeywords = ['必须', '要求', '需要', '应该'];
    const niceToHaveKeywords = ['优先', '加分', '希望', '最好'];

    if (mustHaveKeywords.some(keyword => line.includes(keyword))) {
      return 'must-have';
    } else if (niceToHaveKeywords.some(keyword => line.includes(keyword))) {
      return 'nice-to-have';
    }

    return 'must-have'; // 默认为必需
  }

  /**
   * 计算要求重要性
   */
  private calculateRequirementImportance(line: string): number {
    let importance = 0.5; // 基础重要性

    // 根据关键词调整重要性
    if (line.includes('必须') || line.includes('要求')) {
      importance += 0.3;
    }
    if (line.includes('精通') || line.includes('专家')) {
      importance += 0.2;
    }
    if (line.includes('年以上') || line.includes('经验')) {
      importance += 0.1;
    }

    return Math.min(importance, 1);
  }

  /**
   * 要求分类
   */
  private categorizeRequirement(line: string): string {
    if (line.includes('技术') || line.includes('编程') || line.includes('开发')) {
      return '技术要求';
    } else if (line.includes('经验') || line.includes('年')) {
      return '经验要求';
    } else if (line.includes('学历') || line.includes('本科') || line.includes('硕士')) {
      return '学历要求';
    } else if (line.includes('沟通') || line.includes('团队') || line.includes('合作')) {
      return '软技能要求';
    }

    return '其他要求';
  }

  /**
   * 执行AI深度分析
   */
  private async performAIAnalysis(content: string): Promise<AIAnalysisResult> {
    const startTime = performance.now();

    try {
      if (this.config.aiEngine === 'gpt4o') {
        return await this.performGPT4oAnalysis(content);
      } else {
        return await this.performTransformersAnalysis(content);
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      // 返回基础分析结果
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
   * GPT-4o分析
   */
  private async performGPT4oAnalysis(content: string): Promise<AIAnalysisResult> {
    try {
      // 检查是否有API密钥（优先从localStorage获取）
      let apiKey = localStorage.getItem('openai_api_key') || import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OpenAI API密钥未配置，请配置API密钥后重试');
      }

      // 动态导入GPT4oClient
      const { GPT4oClient } = await import('./api/gpt4o-client');

      const client = new GPT4oClient({
        apiKey,
        maxTokens: 2000,
        temperature: 0.3
      });

      const response = await client.analyzeJobDescription({
        content,
        type: 'jd-analysis'
      });

      return response.result;
    } catch (error) {
      console.error('GPT-4o分析失败:', error);
      throw error;
    }
  }

  /**
   * Transformers.js分析
   */
  private async performTransformersAnalysis(content: string): Promise<AIAnalysisResult> {
    try {
      console.log('JDAnalyzer: 开始本地AI分析，内容长度:', content.length);

      // 使用Transformers.js服务
      const { TransformersService } = await import('./transformers/transformers-service');

      const service = new TransformersService();

      const result = await service.analyzeJobDescription(content, {
        extractKeywords: this.config.extractKeywords,
        analyzeSkills: this.config.analyzeSkills,
        generateSuggestions: this.config.generateSuggestions,
        language: this.config.language
      });

      console.log('JDAnalyzer: Transformers.js分析完成，结果:', result);

      return result;
    } catch (error) {
      console.error('JDAnalyzer: Transformers.js分析失败:', error);

      // 如果分析失败，返回基础结果而不是抛出错误
      return {
        keywords: [],
        skills: [],
        matchScore: 0,
        suggestions: ['Transformers.js分析暂时不可用，请稍后重试'],
        processingTime: 0,
        confidence: 0
      };
    }
  }

  /**
   * 生成分析ID
   */
  private generateAnalysisId(): string {
    return `jd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
}

// 创建默认分析器实例
export function createJDAnalyzer(preferences: UserPreferences): JDAnalyzer {
  const config: JDAnalysisConfig = {
    aiEngine: preferences.aiEngine,
    extractKeywords: true,
    analyzeSkills: true,
    generateSuggestions: true,
    language: preferences.language
  };

  return new JDAnalyzer(config);
}