import {
  SkillGap,
  Recommendation,
  SkillCategory,
  Experience,
  Project
} from '../../types';

/**
 * 智能建议生成器
 * 基于技能差距分析生成个性化改进建议
 */
export class RecommendationGenerator {
  // 学习路径模板
  private readonly learningPaths: Record<SkillCategory, string[]> = {
    'frontend': [
      '掌握HTML5语义化和CSS3高级特性',
      '深入学习JavaScript ES6+和TypeScript',
      '熟练使用React/Vue等现代框架',
      '了解前端工程化和构建工具',
      '学习前端性能优化技术'
    ],
    'backend': [
      '掌握至少一门后端编程语言',
      '学习数据库设计和SQL优化',
      '了解RESTful API设计原则',
      '掌握服务器部署和运维基础',
      '学习微服务架构和分布式系统'
    ],
    'database': [
      '掌握SQL基础语法和查询优化',
      '学习数据库设计和范式理论',
      '了解NoSQL数据库特点和应用',
      '掌握数据库性能调优技术',
      '学习数据备份和恢复策略'
    ],
    'devops': [
      '学习Linux系统管理基础',
      '掌握Docker容器化技术',
      '了解CI/CD流水线搭建',
      '学习云平台服务使用',
      '掌握监控和日志管理'
    ],
    'mobile': [
      '选择移动开发平台(iOS/Android/跨平台)',
      '学习移动UI设计原则',
      '掌握移动应用性能优化',
      '了解移动应用发布流程',
      '学习移动端测试技术'
    ],
    'design': [
      '学习设计基础理论和色彩搭配',
      '掌握设计工具使用技巧',
      '了解用户体验设计原则',
      '学习交互设计和原型制作',
      '掌握响应式设计技术'
    ],
    'soft-skills': [
      '提升沟通表达和团队协作能力',
      '培养问题分析和解决思维',
      '加强项目管理和时间管理',
      '提升学习能力和适应性',
      '培养领导力和影响力'
    ],
    'tools': [
      '熟练使用版本控制工具Git',
      '掌握IDE和编辑器高级功能',
      '学习项目管理和协作工具',
      '了解自动化测试工具',
      '掌握性能分析和调试工具'
    ],
    'languages': [
      '选择适合职业发展的编程语言',
      '深入学习语言核心特性',
      '掌握语言生态和框架',
      '了解语言最佳实践',
      '参与开源项目实践'
    ]
  };

  // 技能提升时间估算(周)
  private readonly skillTimeEstimates: Record<number, number> = {
    1: 2,   // 入门到初级: 2周
    2: 4,   // 初级到中级: 4周
    3: 8,   // 中级到高级: 8周
    4: 12   // 高级到专家: 12周
  };

  /**
   * 生成综合改进建议
   */
  public generateRecommendations(
    gaps: SkillGap[],
    strengths: string[],
    overallScore: number,
    userExperience?: Experience[],
    userProjects?: Project[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 1. 总体评估建议
    recommendations.push(...this.generateOverallAssessment(overallScore));

    // 2. 技能差距改进建议
    recommendations.push(...this.generateSkillGapRecommendations(gaps));

    // 3. 优势技能强化建议
    recommendations.push(...this.generateStrengthRecommendations(strengths));

    // 4. 学习路径建议
    recommendations.push(...this.generateLearningPathRecommendations(gaps));

    // 5. 项目经验建议
    if (userExperience && userProjects) {
      recommendations.push(...this.generateExperienceRecommendations(gaps, userExperience, userProjects));
    }

    // 按优先级排序并限制数量
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 12);
  }

  /**
   * 生成总体评估建议
   */
  private generateOverallAssessment(overallScore: number): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (overallScore >= 85) {
      recommendations.push({
        type: 'strength',
        title: '技能匹配度优秀',
        description: '您的技能与岗位要求高度匹配，建议重点突出相关项目经验和成果',
        priority: 'high',
        actionable: true
      });
    } else if (overallScore >= 70) {
      recommendations.push({
        type: 'improvement',
        title: '技能匹配度良好',
        description: '整体技能水平符合要求，建议针对性补强关键技能差距',
        priority: 'medium',
        actionable: true
      });
    } else if (overallScore >= 50) {
      recommendations.push({
        type: 'skill-gap',
        title: '需要重点提升技能',
        description: '当前技能与岗位要求存在一定差距，建议制定系统性学习计划',
        priority: 'high',
        actionable: true
      });
    } else {
      recommendations.push({
        type: 'skill-gap',
        title: '技能差距较大',
        description: '建议重新评估职业目标，或投入更多时间进行技能提升',
        priority: 'high',
        actionable: true
      });
    }

    return recommendations;
  }

  /**
   * 生成技能差距改进建议
   */
  private generateSkillGapRecommendations(gaps: SkillGap[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 高优先级技能差距
    const highPriorityGaps = gaps.filter(gap => gap.priority === 'high').slice(0, 3);
    if (highPriorityGaps.length > 0) {
      recommendations.push({
        type: 'skill-gap',
        title: '优先提升关键技能',
        description: `建议优先学习: ${highPriorityGaps.map(gap => gap.skill).join(', ')}`,
        priority: 'high',
        actionable: true
      });
    }

    // 按类别分组的技能差距
    const categoryGaps = this.groupGapsByCategory(gaps);
    Object.entries(categoryGaps).forEach(([category, categoryGaps]) => {
      if (categoryGaps.length >= 2) {
        const estimatedTime = this.calculateLearningTime(categoryGaps);
        recommendations.push({
          type: 'skill-gap',
          title: `${this.getCategoryDisplayName(category as SkillCategory)}技能提升`,
          description: `建议系统性学习该领域技能，预计需要${estimatedTime}周时间`,
          priority: categoryGaps.some(gap => gap.priority === 'high') ? 'high' : 'medium',
          actionable: true
        });
      }
    });

    return recommendations;
  }

  /**
   * 生成优势技能强化建议
   */
  private generateStrengthRecommendations(strengths: string[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (strengths.length > 0) {
      recommendations.push({
        type: 'strength',
        title: '突出专业优势',
        description: `充分展示您在${strengths.slice(0, 3).join(', ')}方面的专业能力和项目经验`,
        priority: 'medium',
        actionable: true
      });

      if (strengths.length >= 3) {
        recommendations.push({
          type: 'strength',
          title: '技能组合优势',
          description: '您拥有多项高级技能，建议在简历中突出技能组合带来的综合优势',
          priority: 'medium',
          actionable: true
        });
      }
    }

    return recommendations;
  }

  /**
   * 生成学习路径建议
   */
  private generateLearningPathRecommendations(gaps: SkillGap[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 按类别分组并生成学习路径
    const categoryGaps = this.groupGapsByCategory(gaps);
    Object.entries(categoryGaps).forEach(([category, categoryGaps]) => {
      if (categoryGaps.length > 0) {
        const learningPath = this.learningPaths[category as SkillCategory];
        if (learningPath) {
          const relevantSteps = learningPath.slice(0, 3);
          recommendations.push({
            type: 'improvement',
            title: `${this.getCategoryDisplayName(category as SkillCategory)}学习路径`,
            description: `建议学习步骤: ${relevantSteps.join(' → ')}`,
            priority: 'low',
            actionable: true
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * 生成项目经验建议
   */
  private generateExperienceRecommendations(
    gaps: SkillGap[],
    experience: Experience[],
    projects: Project[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 分析现有项目经验
    const projectTechnologies = projects.flatMap(project => project.technologies);
    const experienceTechnologies = experience.flatMap(exp => exp.technologies);
    const allTechnologies = [...new Set([...projectTechnologies, ...experienceTechnologies])];

    // 找出有技术基础但需要提升的技能
    const improvableSkills = gaps.filter(gap =>
      allTechnologies.some(tech =>
        this.normalizeSkillName(tech).includes(this.normalizeSkillName(gap.skill)) ||
        this.normalizeSkillName(gap.skill).includes(this.normalizeSkillName(tech))
      )
    );

    if (improvableSkills.length > 0) {
      recommendations.push({
        type: 'improvement',
        title: '基于现有经验提升',
        description: `您已有相关技术基础，建议深化${improvableSkills.slice(0, 2).map(skill => skill.skill).join('、')}等技能`,
        priority: 'medium',
        actionable: true
      });
    }

    // 建议新项目实践
    const highPriorityGaps = gaps.filter(gap => gap.priority === 'high').slice(0, 2);
    if (highPriorityGaps.length > 0) {
      recommendations.push({
        type: 'improvement',
        title: '项目实践建议',
        description: `建议开展包含${highPriorityGaps.map(gap => gap.skill).join('、')}技术的实践项目`,
        priority: 'medium',
        actionable: true
      });
    }

    return recommendations;
  }

  /**
   * 计算学习时间估算
   */
  private calculateLearningTime(gaps: SkillGap[]): number {
    return gaps.reduce((total, gap) => {
      const levelGap = gap.requiredLevel - gap.currentLevel;
      const timePerLevel = this.skillTimeEstimates[levelGap] || 4;
      return total + timePerLevel;
    }, 0);
  }

  /**
   * 按类别分组技能差距
   */
  private groupGapsByCategory(gaps: SkillGap[]): Record<string, SkillGap[]> {
    return gaps.reduce((acc, gap) => {
      if (!acc[gap.category]) {
        acc[gap.category] = [];
      }
      acc[gap.category].push(gap);
      return acc;
    }, {} as Record<string, SkillGap[]>);
  }

  /**
   * 标准化技能名称
   */
  private normalizeSkillName(name: string): string {
    return name.toLowerCase().trim().replace(/[.\-_\s]/g, '');
  }

  /**
   * 获取类别显示名称
   */
  private getCategoryDisplayName(category: SkillCategory): string {
    const displayNames: Record<SkillCategory, string> = {
      'frontend': '前端开发',
      'backend': '后端开发',
      'database': '数据库',
      'devops': 'DevOps',
      'mobile': '移动开发',
      'design': '设计',
      'soft-skills': '软技能',
      'tools': '开发工具',
      'languages': '编程语言'
    };
    return displayNames[category] || category;
  }
}