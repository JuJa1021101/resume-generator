import {
  UserSkill,
  RequiredSkill,
  SkillCategory,
  MatchResult,
  CategoryScore,
  SkillGap,
  DetailedScore,
  ScoreBreakdown,
  Recommendation
} from '../../types';

/**
 * 技能匹配算法核心实现
 * 支持多维度技能分析和智能评分机制
 */
export class SkillMatcher {
  // 技能类别权重配置
  private readonly categoryWeights: Record<SkillCategory, number> = {
    'frontend': 0.15,
    'backend': 0.15,
    'database': 0.12,
    'devops': 0.10,
    'mobile': 0.08,
    'design': 0.08,
    'soft-skills': 0.12,
    'tools': 0.10,
    'languages': 0.10
  };

  // 技能重要性权重映射
  private readonly importanceWeights = {
    high: 1.0,
    medium: 0.7,
    low: 0.4
  };

  // 技能等级差异惩罚系数
  private readonly levelPenalty = {
    0: 1.0,   // 完全匹配
    1: 0.8,   // 差1级
    2: 0.6,   // 差2级
    3: 0.4,   // 差3级
    4: 0.2    // 差4级
  };

  /**
   * 执行技能匹配分析
   * @param userSkills 用户技能列表
   * @param requiredSkills 岗位要求技能列表
   * @returns 匹配结果
   */
  public analyzeSkillMatch(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): MatchResult {
    // 1. 计算各类别得分
    const categoryScores = this.calculateCategoryScores(userSkills, requiredSkills);

    // 2. 计算总体匹配度
    const overallScore = this.calculateOverallScore(categoryScores);

    // 3. 识别技能差距
    const gaps = this.identifySkillGaps(userSkills, requiredSkills);

    // 4. 识别优势技能
    const strengths = this.identifyStrengths(userSkills, requiredSkills);

    // 5. 生成改进建议
    const recommendations = this.generateRecommendations(gaps, strengths, overallScore);

    return {
      overallScore,
      categoryScores,
      gaps,
      strengths,
      recommendations
    };
  }

  /**
   * 计算各技能类别得分
   */
  private calculateCategoryScores(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): CategoryScore[] {
    const categories = Object.keys(this.categoryWeights) as SkillCategory[];

    return categories.map(category => {
      const categoryRequiredSkills = requiredSkills.filter(skill => skill.category === category);
      const categoryUserSkills = userSkills.filter(skill => skill.category === category);

      if (categoryRequiredSkills.length === 0) {
        return {
          category,
          score: 0,
          maxScore: 0,
          skillCount: 0,
          matchedSkills: 0
        };
      }

      let totalScore = 0;
      let maxScore = 0;
      let matchedSkills = 0;

      categoryRequiredSkills.forEach(requiredSkill => {
        const userSkill = categoryUserSkills.find(us =>
          this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
        );

        const skillWeight = this.getImportanceWeight(requiredSkill.importance);
        maxScore += 100 * skillWeight;

        if (userSkill) {
          matchedSkills++;
          const levelScore = this.calculateLevelScore(
            userSkill.level,
            requiredSkill.level || 3
          );
          totalScore += levelScore * skillWeight;
        }
      });

      return {
        category,
        score: Math.round(totalScore),
        maxScore: Math.round(maxScore),
        skillCount: categoryRequiredSkills.length,
        matchedSkills
      };
    }).filter(score => score.maxScore > 0);
  }

  /**
   * 计算总体匹配度得分
   */
  private calculateOverallScore(categoryScores: CategoryScore[]): number {
    let weightedScore = 0;
    let totalWeight = 0;

    categoryScores.forEach(categoryScore => {
      const weight = this.categoryWeights[categoryScore.category];
      const normalizedScore = categoryScore.maxScore > 0
        ? (categoryScore.score / categoryScore.maxScore) * 100
        : 0;

      weightedScore += normalizedScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  /**
   * 识别技能差距
   */
  private identifySkillGaps(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): SkillGap[] {
    const gaps: SkillGap[] = [];

    requiredSkills.forEach(requiredSkill => {
      const userSkill = userSkills.find(us =>
        this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
      );

      const requiredLevel = requiredSkill.level || 3;
      const currentLevel = userSkill?.level || 0;

      if (currentLevel < requiredLevel) {
        gaps.push({
          skill: requiredSkill.name,
          category: requiredSkill.category,
          requiredLevel,
          currentLevel,
          importance: requiredSkill.importance,
          priority: this.calculateGapPriority(requiredSkill.importance, requiredLevel - currentLevel)
        });
      }
    });

    // 按优先级和重要性排序
    return gaps.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return b.importance - a.importance;
    });
  }

  /**
   * 识别优势技能
   */
  private identifyStrengths(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): string[] {
    const strengths: string[] = [];

    requiredSkills.forEach(requiredSkill => {
      const userSkill = userSkills.find(us =>
        this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
      );

      if (userSkill) {
        const requiredLevel = requiredSkill.level || 3;

        // 如果用户技能等级超过要求或达到高级水平
        if (userSkill.level >= requiredLevel && userSkill.level >= 4) {
          strengths.push(userSkill.name);
        }
      }
    });

    // 添加用户拥有但岗位未明确要求的高级技能
    userSkills.forEach(userSkill => {
      if (userSkill.level >= 4) {
        const isRequired = requiredSkills.some(rs =>
          this.normalizeSkillName(rs.name) === this.normalizeSkillName(userSkill.name)
        );

        if (!isRequired && !strengths.includes(userSkill.name)) {
          strengths.push(userSkill.name);
        }
      }
    });

    return strengths.slice(0, 10); // 限制最多10个优势技能
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    gaps: SkillGap[],
    strengths: string[],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    // 基于总体得分的建议
    if (overallScore >= 80) {
      recommendations.push('您的技能匹配度很高，建议重点突出相关项目经验');
    } else if (overallScore >= 60) {
      recommendations.push('技能匹配度良好，建议补强关键技能差距');
    } else {
      recommendations.push('建议重点提升核心技能以提高匹配度');
    }

    // 基于技能差距的建议
    const highPriorityGaps = gaps.filter(gap => gap.priority === 'high').slice(0, 3);
    if (highPriorityGaps.length > 0) {
      recommendations.push(
        `优先提升以下关键技能: ${highPriorityGaps.map(gap => gap.skill).join(', ')}`
      );
    }

    // 基于技能类别的建议
    const categoryGaps = this.groupGapsByCategory(gaps);
    Object.entries(categoryGaps).forEach(([category, categoryGaps]) => {
      if (categoryGaps.length >= 2) {
        recommendations.push(
          `建议系统性学习${this.getCategoryDisplayName(category as SkillCategory)}相关技能`
        );
      }
    });

    // 基于优势技能的建议
    if (strengths.length > 0) {
      recommendations.push(
        `充分展示您在${strengths.slice(0, 3).join(', ')}方面的专业优势`
      );
    }

    return recommendations.slice(0, 8); // 限制最多8条建议
  }

  /**
   * 计算详细得分分解
   */
  public calculateDetailedScores(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): DetailedScore[] {
    const categories = Object.keys(this.categoryWeights) as SkillCategory[];

    return categories.map(category => {
      const categoryRequiredSkills = requiredSkills.filter(skill => skill.category === category);
      const categoryUserSkills = userSkills.filter(skill => skill.category === category);

      if (categoryRequiredSkills.length === 0) {
        return {
          category: this.getCategoryDisplayName(category),
          score: 0,
          maxScore: 0,
          breakdown: []
        };
      }

      const breakdown: ScoreBreakdown[] = [];
      let totalScore = 0;
      let maxScore = 0;

      categoryRequiredSkills.forEach(requiredSkill => {
        const userSkill = categoryUserSkills.find(us =>
          this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
        );

        const weight = this.getImportanceWeight(requiredSkill.importance);
        const requiredLevel = requiredSkill.level || 3;
        const userLevel = userSkill?.level || 0;
        const skillScore = userSkill ? this.calculateLevelScore(userLevel, requiredLevel) : 0;

        breakdown.push({
          skill: requiredSkill.name,
          userScore: userLevel * 20, // 转换为百分制
          requiredScore: requiredLevel * 20,
          weight
        });

        totalScore += skillScore * weight;
        maxScore += 100 * weight;
      });

      return {
        category: this.getCategoryDisplayName(category),
        score: Math.round(totalScore),
        maxScore: Math.round(maxScore),
        breakdown
      };
    }).filter(score => score.maxScore > 0);
  }

  /**
   * 计算匹配结果置信度
   */
  public calculateConfidence(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[],
    matchResult: MatchResult
  ): number {
    let confidenceFactors = 0;
    let totalFactors = 0;

    // 因子1: 技能覆盖率
    const coverageRate = matchResult.categoryScores.reduce((sum, category) =>
      sum + (category.matchedSkills / category.skillCount), 0
    ) / matchResult.categoryScores.length;
    confidenceFactors += coverageRate * 0.3;
    totalFactors += 0.3;

    // 因子2: 高重要性技能匹配度
    const highImportanceSkills = requiredSkills.filter(skill => skill.importance >= 0.8);
    const highImportanceMatches = highImportanceSkills.filter(requiredSkill =>
      userSkills.some(userSkill =>
        this.normalizeSkillName(userSkill.name) === this.normalizeSkillName(requiredSkill.name)
      )
    );
    const highImportanceRate = highImportanceSkills.length > 0
      ? highImportanceMatches.length / highImportanceSkills.length
      : 1;
    confidenceFactors += highImportanceRate * 0.4;
    totalFactors += 0.4;

    // 因子3: 技能等级准确性
    let levelAccuracy = 0;
    let levelComparisons = 0;
    requiredSkills.forEach(requiredSkill => {
      const userSkill = userSkills.find(us =>
        this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
      );
      if (userSkill) {
        const requiredLevel = requiredSkill.level || 3;
        const levelDiff = Math.abs(userSkill.level - requiredLevel);
        levelAccuracy += Math.max(0, 1 - levelDiff * 0.2);
        levelComparisons++;
      }
    });
    if (levelComparisons > 0) {
      confidenceFactors += (levelAccuracy / levelComparisons) * 0.3;
      totalFactors += 0.3;
    }

    return totalFactors > 0 ? Math.round((confidenceFactors / totalFactors) * 100) : 50;
  }

  // 辅助方法

  private normalizeSkillName(name: string): string {
    return name.toLowerCase().trim().replace(/[.\-_\s]/g, '');
  }

  private getImportanceWeight(importance: number): number {
    if (importance >= 0.8) return this.importanceWeights.high;
    if (importance >= 0.5) return this.importanceWeights.medium;
    return this.importanceWeights.low;
  }

  private calculateLevelScore(userLevel: number, requiredLevel: number): number {
    const levelDiff = Math.abs(userLevel - requiredLevel);
    const penalty = this.levelPenalty[Math.min(levelDiff, 4) as keyof typeof this.levelPenalty];

    // 如果用户等级高于要求，给予奖励
    if (userLevel > requiredLevel) {
      return Math.min(100, 100 * penalty * 1.1);
    }

    return 100 * penalty;
  }

  private calculateGapPriority(importance: number, levelGap: number): 'high' | 'medium' | 'low' {
    const score = importance * levelGap;
    if (score >= 2.4) return 'high';
    if (score >= 1.2) return 'medium';
    return 'low';
  }

  private groupGapsByCategory(gaps: SkillGap[]): Record<string, SkillGap[]> {
    return gaps.reduce((acc, gap) => {
      if (!acc[gap.category]) {
        acc[gap.category] = [];
      }
      acc[gap.category].push(gap);
      return acc;
    }, {} as Record<string, SkillGap[]>);
  }

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