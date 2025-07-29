/**
 * 简化的本地JD分析服务
 * 使用规则引擎和关键词匹配，不依赖复杂的ML库
 */

import type { AIAnalysisResult, Keyword, Skill } from '../../types';

// 技能数据库
const SKILL_DATABASE = {
  frontend: {
    skills: ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SCSS', 'SASS', 'jQuery', 'Bootstrap', 'Tailwind', 'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier'],
    weight: 1.2
  },
  backend: {
    skills: ['Node.js', 'Python', 'Java', 'Go', 'PHP', 'C#', '.NET', 'Spring', 'Django', 'Flask', 'Express', 'Koa', 'Fastify', 'Laravel', 'Symfony'],
    weight: 1.2
  },
  database: {
    skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 'Elasticsearch', 'InfluxDB', 'Cassandra'],
    weight: 1.1
  },
  devops: {
    skills: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible', 'Nginx', 'Apache'],
    weight: 1.3
  },
  mobile: {
    skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Java', 'Objective-C', 'Xamarin', 'Ionic', 'Cordova'],
    weight: 1.1
  },
  tools: {
    skills: ['Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'VS Code', 'IntelliJ', 'Postman', 'Figma', 'Sketch'],
    weight: 1.0
  }
};

// 软技能关键词
const SOFT_SKILLS = [
  '沟通', '团队合作', '领导力', '学习能力', '解决问题', '创新', '责任心', '抗压',
  '协作', '配合', '管理', '组织', '执行', '分析', '思维', '逻辑', '细心', '主动',
  'communication', 'teamwork', 'leadership', 'learning', 'problem solving',
  'analytical', 'creative', 'organized', 'detail-oriented', 'proactive'
];

// 通用技术关键词
const GENERAL_TECH_KEYWORDS = [
  '前端', '后端', '全栈', '开发', '编程', '算法', '数据结构', '数据库',
  '框架', '库', '工具', '测试', '部署', '运维', '架构', '设计模式',
  'API', 'REST', 'GraphQL', 'HTTP', 'HTTPS', 'JSON', 'XML',
  '版本控制', '代码审查', '单元测试', '集成测试', '性能优化',
  'frontend', 'backend', 'fullstack', 'development', 'programming',
  'framework', 'library', 'testing', 'deployment', 'architecture'
];

// 技能等级关键词
const SKILL_LEVEL_KEYWORDS = {
  5: ['精通', '专家', '资深', 'expert', 'senior', 'advanced'],
  4: ['熟练', '深入', '丰富', 'proficient', 'experienced', 'skilled'],
  3: ['熟悉', '掌握', '了解', 'familiar', 'knowledge', 'understand'],
  2: ['基础', '初级', '入门', 'basic', 'junior', 'beginner'],
  1: ['接触', '学习', '了解过', 'exposure', 'learning', 'aware']
};

export interface SimpleAnalysisOptions {
  extractKeywords: boolean;
  analyzeSkills: boolean;
  generateSuggestions: boolean;
  language: 'zh-CN' | 'en-US';
}

export class SimpleAnalyzer {
  /**
   * 分析职位描述
   */
  async analyzeJobDescription(content: string, options: SimpleAnalysisOptions): Promise<AIAnalysisResult> {
    const startTime = performance.now();

    console.log('SimpleAnalyzer: 开始分析，内容长度:', content.length);
    console.log('SimpleAnalyzer: 分析选项:', options);

    try {
      const results: AIAnalysisResult = {
        keywords: [],
        skills: [],
        matchScore: 0,
        suggestions: [],
        processingTime: 0,
        confidence: 0.8
      };

      // 预处理内容
      const processedContent = this.preprocessContent(content);
      console.log('SimpleAnalyzer: 预处理完成，处理后长度:', processedContent.length);

      // 1. 提取关键词
      if (options.extractKeywords) {
        results.keywords = this.extractKeywords(processedContent);
        console.log('SimpleAnalyzer: 提取关键词完成，数量:', results.keywords.length);
      }

      // 2. 分析技能
      if (options.analyzeSkills) {
        results.skills = this.analyzeSkills(processedContent, results.keywords);
        console.log('SimpleAnalyzer: 技能分析完成，数量:', results.skills.length);
      }

      // 3. 生成建议
      if (options.generateSuggestions) {
        results.suggestions = this.generateSuggestions(processedContent, results.skills);
        console.log('SimpleAnalyzer: 建议生成完成，数量:', results.suggestions.length);
      }

      // 4. 计算匹配分数
      results.matchScore = this.calculateMatchScore(results.keywords, results.skills);

      results.processingTime = performance.now() - startTime;

      console.log('SimpleAnalyzer: 分析完成，最终结果:', {
        keywords: results.keywords.length,
        skills: results.skills.length,
        suggestions: results.suggestions.length,
        matchScore: results.matchScore,
        processingTime: results.processingTime
      });

      return results;
    } catch (error) {
      console.error('SimpleAnalyzer: 分析失败:', error);
      throw error;
    }
  }

  /**
   * 预处理内容
   */
  private preprocessContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): Keyword[] {
    const keywords: Keyword[] = [];
    const keywordMap = new Map<string, { importance: number; frequency: number; category: string }>();

    console.log('SimpleAnalyzer: 开始关键词提取...');

    // 1. 技术技能关键词
    Object.entries(SKILL_DATABASE).forEach(([, config]) => {
      config.skills.forEach(skill => {
        const patterns = [
          new RegExp(`\\b${skill.toLowerCase()}\\b`, 'g'),
          new RegExp(`${skill.toLowerCase()}`, 'g')
        ];

        let totalMatches = 0;
        patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            totalMatches += matches.length;
          }
        });

        if (totalMatches > 0) {
          const importance = this.calculateImportance(skill, totalMatches, content.length, config.weight);
          keywordMap.set(skill, {
            importance,
            frequency: totalMatches,
            category: 'technical'
          });
          console.log(`SimpleAnalyzer: 找到技术关键词 ${skill}, 频次: ${totalMatches}, 重要性: ${importance}`);
        }
      });
    });

    // 2. 软技能关键词
    SOFT_SKILLS.forEach(skill => {
      const matches = content.match(new RegExp(`${skill}`, 'gi'));
      if (matches) {
        const importance = this.calculateImportance(skill, matches.length, content.length, 0.8);
        keywordMap.set(skill, {
          importance,
          frequency: matches.length,
          category: 'soft'
        });
        console.log(`SimpleAnalyzer: 找到软技能关键词 ${skill}, 频次: ${matches.length}`);
      }
    });

    // 3. 通用技术关键词
    GENERAL_TECH_KEYWORDS.forEach(keyword => {
      const matches = content.match(new RegExp(`${keyword}`, 'gi'));
      if (matches) {
        const importance = this.calculateImportance(keyword, matches.length, content.length, 0.9);
        keywordMap.set(keyword, {
          importance,
          frequency: matches.length,
          category: 'domain'
        });
        console.log(`SimpleAnalyzer: 找到通用技术关键词 ${keyword}, 频次: ${matches.length}`);
      }
    });

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
   * 分析技能
   */
  private analyzeSkills(content: string, keywords: Keyword[]): Skill[] {
    const skills: Skill[] = [];

    console.log('SimpleAnalyzer: 开始技能分析...');

    // 从技术关键词中提取技能
    keywords.forEach(keyword => {
      if (keyword.category === 'technical') {
        const category = this.determineSkillCategory(keyword.text);
        const requiredLevel = this.estimateSkillLevel(keyword.text, content);

        skills.push({
          name: keyword.text,
          category,
          importance: keyword.importance,
          matched: false,
          requiredLevel
        });

        console.log(`SimpleAnalyzer: 添加技能 ${keyword.text}, 类别: ${category}, 等级: ${requiredLevel}`);
      }
    });

    // 如果没有找到技能，添加一些基础技能
    if (skills.length === 0) {
      console.log('SimpleAnalyzer: 未找到技能，尝试添加基础技能...');

      const basicSkills = ['JavaScript', 'HTML', 'CSS', 'React', 'Vue', 'Python', 'Java'];
      basicSkills.forEach(skillName => {
        if (content.includes(skillName.toLowerCase())) {
          skills.push({
            name: skillName,
            category: this.determineSkillCategory(skillName),
            importance: 0.7,
            matched: false,
            requiredLevel: 3
          });
          console.log(`SimpleAnalyzer: 添加基础技能 ${skillName}`);
        }
      });
    }

    return skills.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 生成建议
   */
  private generateSuggestions(content: string, skills: Skill[]): string[] {
    const suggestions: string[] = [];

    console.log('SimpleAnalyzer: 开始生成建议...');

    // 基于技能的建议
    const topSkills = skills.slice(0, 5);
    if (topSkills.length > 0) {
      suggestions.push(`重点突出以下核心技能：${topSkills.map(s => s.name).join('、')}`);
    }

    // 基于内容的建议
    if (content.includes('经验') || content.includes('年') || content.includes('experience')) {
      suggestions.push('在简历中详细描述相关工作经验和项目经历');
    }

    if (content.includes('团队') || content.includes('合作') || content.includes('team')) {
      suggestions.push('强调团队协作能力和沟通技巧');
    }

    if (content.includes('项目') || content.includes('产品') || content.includes('project')) {
      suggestions.push('提供具体的项目案例和成果展示');
    }

    if (content.includes('学历') || content.includes('本科') || content.includes('硕士')) {
      suggestions.push('确保学历信息在简历中清晰展示');
    }

    // 技能类别建议
    const skillCategories = [...new Set(skills.map(s => s.category))];
    if (skillCategories.includes('frontend') && skillCategories.includes('backend')) {
      suggestions.push('展示全栈开发能力，突出技术栈的完整性');
    }

    if (skillCategories.includes('devops')) {
      suggestions.push('强调DevOps实践经验和自动化部署能力');
    }

    // 默认建议
    if (suggestions.length === 0) {
      suggestions.push('根据职位要求调整简历重点');
      suggestions.push('突出与岗位最相关的技能和经验');
    }

    return suggestions.slice(0, 6);
  }

  /**
   * 计算重要性
   */
  private calculateImportance(keyword: string, frequency: number, contentLength: number, weight: number = 1): number {
    // TF (词频)
    const tf = frequency / (contentLength / 100); // 标准化到每100字符

    // 基础重要性
    let importance = Math.min(tf * 0.1, 1) * weight;

    // 高价值技能加权
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
      'react', 'vue', 'angular', 'node.js', 'python', 'java', 'go',
      'docker', 'kubernetes', 'aws', 'typescript', 'mongodb', 'redis',
      'spring', 'django', 'express', 'mysql', 'postgresql'
    ];

    return highValueSkills.some(hvs => skill.toLowerCase().includes(hvs));
  }

  /**
   * 确定技能类别
   */
  private determineSkillCategory(skill: string): any {
    for (const [category, config] of Object.entries(SKILL_DATABASE)) {
      if (config.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
        return category;
      }
    }
    return 'tools';
  }

  /**
   * 估算技能等级
   */
  private estimateSkillLevel(_skill: string, content: string): number {
    // 查找技能等级关键词
    for (const [level, keywords] of Object.entries(SKILL_LEVEL_KEYWORDS)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return parseInt(level);
      }
    }

    // 默认等级为3
    return 3;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(keywords: Keyword[], skills: Skill[]): number {
    if (keywords.length === 0 && skills.length === 0) {
      return 0;
    }

    // 基于关键词和技能的综合评分
    const keywordScore = keywords.length > 0
      ? keywords.reduce((sum, kw) => sum + kw.importance, 0) / keywords.length
      : 0;

    const skillScore = skills.length > 0
      ? skills.reduce((sum, skill) => sum + skill.importance, 0) / skills.length
      : 0;

    // 数量奖励
    const quantityBonus = Math.min((keywords.length + skills.length) / 20, 0.2);

    return Math.min((keywordScore * 0.4 + skillScore * 0.6) + quantityBonus, 1);
  }
}