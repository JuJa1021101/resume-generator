import {
  UserSkill,
  RequiredSkill,
  MatchResult,
  Experience,
  Project
} from '../../types';

/**
 * 匹配结果置信度计算器
 * 基于多个维度评估技能匹配结果的可靠性
 */
export class ConfidenceCalculator {
  // 置信度因子权重
  private readonly confidenceWeights = {
    skillCoverage: 0.25,      // 技能覆盖率
    levelAccuracy: 0.20,      // 技能等级准确性
    experienceRelevance: 0.20, // 经验相关性
    skillDepth: 0.15,         // 技能深度
    categoryBalance: 0.10,    // 类别平衡性
    dataQuality: 0.10         // 数据质量
  };

  /**
   * 计算综合置信度
   */
  public calculateConfidence(
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[],
    matchResult: MatchResult,
    userExperience?: Experience[],
    userProjects?: Project[]
  ): number {
    let totalConfidence = 0;
    let totalWeight = 0;

    // 1. 技能覆盖率置信度
    const coverageConfidence = this.calculateCoverageConfidence(matchResult);
    totalConfidence += coverageConfidence * this.confidenceWeights.skillCoverage;
    totalWeight += this.confidenceWeights.skillCoverage;

    // 2. 技能等级准确性置信度
    const levelConfidence = this.calculateLevelConfidence(userSkills, requiredSkills);
    totalConfidence += levelConfidence * this.confidenceWeights.levelAccuracy;
    totalWeight += this.confidenceWeights.levelAccuracy;

    // 3. 经验相关性置信度
    if (userExperience && userProjects) {
      const experienceConfidence = this.calculateExperienceConfidence(
        requiredSkills,
        userExperience,
        userProjects
      );
      totalConfidence += experienceConfidence * this.confidenceWeights.experienceRelevance;
      totalWeight += this.confidenceWeights.experienceRelevance;
    }

    // 4. 技能深度置信度
    const depthConfidence = this.calculateSkillDepthConfidence(userSkills, requiredSkills);
    totalConfidence += depthConfidence * this.confidenceWeights.skillDepth;
    totalWeight += this.confidenceWeights.skillDepth;

    // 5. 类别平衡性置信度
    const balanceConfidence = this.calculateCategoryBalanceConfidence(matchResult);
    totalConfidence += balanceConfidence * this.confidenceWeights.categoryBalance;
    totalWeight += this.confidenceWeights.categoryBalance;

    // 6. 数据质量置信度
    const qualityConfidence = this.calculateDataQualityConfidence(userSkills, requiredSkills);
    totalConfidence += qualityConfidence * this.confidenceWeights.dataQuality;
    totalWeight += this.confidenceWeights.dataQuality;

    return totalWeight > 0 ? Math.round((totalConfidence / totalWeight) * 100) : 50;
  }

  /**
   * 计算技能覆盖率置信度
   */
  private calculateCoverageConfidence(matchResult: MatchResult): number {
    if (matchResult.categoryScores.length === 0) return 0;

    const totalSkills = matchResult.categoryScores.reduce((sum, category) => sum + category.skillCount, 0);
    const matchedSkills = matchResult.categoryScores.reduce((sum, category) => sum + category.matchedSkills, 0);

    if (totalSkills === 0) return 0;

    const coverageRate = matchedSkills / totalSkills;

    // 覆盖率越高，置信度越高，但有递减效应
    if (coverageRate >= 0.8) return 95;
    if (coverageRate >= 0.6) return 85;
    if (coverageRate >= 0.4) return 70;
    if (coverageRate >= 0.2) return 50;
    return 30;
  }

  /**
   * 计算技能等级准确性置信度
   */
  private calculateLevelConfidence(userSkills: UserSkill[], requiredSkills: RequiredSkill[]): number {
    let totalAccuracy = 0;
    let comparisons = 0;

    requiredSkills.forEach(requiredSkill => {
      const userSkill = userSkills.find(us =>
        this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
      );

      if (userSkill) {
        const requiredLevel = requiredSkill.level || 3;
        const levelDiff = Math.abs(userSkill.level - requiredLevel);

        // 等级差异越小，准确性越高
        const accuracy = Math.max(0, 1 - levelDiff * 0.15);
        totalAccuracy += accuracy;
        comparisons++;
      }
    });

    if (comparisons === 0) return 50;

    const averageAccuracy = totalAccuracy / comparisons;
    return Math.round(averageAccuracy * 100);
  }

  /**
   * 计算经验相关性置信度
   */
  private calculateExperienceConfidence(
    requiredSkills: RequiredSkill[],
    experience: Experience[],
    projects: Project[]
  ): number {
    // 提取所有经验中的技术
    const experienceTechnologies = experience.flatMap(exp => exp.technologies);
    const projectTechnologies = projects.flatMap(project => project.technologies);
    const allExperienceTech = [...new Set([...experienceTechnologies, ...projectTechnologies])];

    if (allExperienceTech.length === 0) return 30;

    // 计算经验技术与要求技能的匹配度
    let matchedRequiredSkills = 0;
    requiredSkills.forEach(requiredSkill => {
      const hasExperience = allExperienceTech.some(tech =>
        this.normalizeSkillName(tech).includes(this.normalizeSkillName(requiredSkill.name)) ||
        this.normalizeSkillName(requiredSkill.name).includes(this.normalizeSkillName(tech))
      );
      if (hasExperience) matchedRequiredSkills++;
    });

    const experienceMatchRate = matchedRequiredSkills / requiredSkills.length;

    // 考虑工作经验的时长
    const totalExperienceMonths = experience.reduce((total, exp) => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return total + months;
    }, 0);

    // 经验时长加成
    const experienceBonus = Math.min(0.2, totalExperienceMonths / 120); // 最多20%加成，10年经验满分

    const finalConfidence = (experienceMatchRate + experienceBonus) * 100;
    return Math.min(95, Math.round(finalConfidence));
  }

  /**
   * 计算技能深度置信度
   */
  private calculateSkillDepthConfidence(userSkills: UserSkill[], requiredSkills: RequiredSkill[]): number {
    let depthScore = 0;
    let evaluatedSkills = 0;

    requiredSkills.forEach(requiredSkill => {
      const userSkill = userSkills.find(us =>
        this.normalizeSkillName(us.name) === this.normalizeSkillName(requiredSkill.name)
      );

      if (userSkill) {
        // 考虑技能等级和经验年限
        const levelScore = userSkill.level / 5; // 标准化到0-1
        const experienceScore = Math.min(1, userSkill.yearsOfExperience / 5); // 5年经验为满分
        const certificationBonus = userSkill.certifications.length > 0 ? 0.1 : 0;

        const skillDepth = (levelScore * 0.6 + experienceScore * 0.3 + certificationBonus);
        depthScore += skillDepth;
        evaluatedSkills++;
      }
    });

    if (evaluatedSkills === 0) return 40;

    const averageDepth = depthScore / evaluatedSkills;
    return Math.round(averageDepth * 100);
  }

  /**
   * 计算类别平衡性置信度
   */
  private calculateCategoryBalanceConfidence(matchResult: MatchResult): number {
    if (matchResult.categoryScores.length === 0) return 50;

    // 计算各类别得分的标准差
    const scores = matchResult.categoryScores.map(category =>
      category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0
    );

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // 标准差越小，平衡性越好，置信度越高
    const balanceScore = Math.max(0, 100 - standardDeviation * 2);
    return Math.round(balanceScore);
  }

  /**
   * 计算数据质量置信度
   */
  private calculateDataQualityConfidence(userSkills: UserSkill[], requiredSkills: RequiredSkill[]): number {
    let qualityScore = 0;
    let qualityFactors = 0;

    // 因子1: 用户技能数据完整性
    const completeUserSkills = userSkills.filter(skill =>
      skill.name && skill.level && skill.category && skill.yearsOfExperience >= 0
    );
    const userDataCompleteness = userSkills.length > 0 ? completeUserSkills.length / userSkills.length : 0;
    qualityScore += userDataCompleteness * 0.4;
    qualityFactors += 0.4;

    // 因子2: 要求技能数据完整性
    const completeRequiredSkills = requiredSkills.filter(skill =>
      skill.name && skill.importance > 0 && skill.category
    );
    const requiredDataCompleteness = requiredSkills.length > 0 ? completeRequiredSkills.length / requiredSkills.length : 0;
    qualityScore += requiredDataCompleteness * 0.3;
    qualityFactors += 0.3;

    // 因子3: 技能名称标准化程度
    const standardizedSkills = userSkills.filter(skill =>
      skill.name.length > 2 && skill.name.length < 50 && !/[^\w\s\-\+\#\.]/g.test(skill.name)
    );
    const nameQuality = userSkills.length > 0 ? standardizedSkills.length / userSkills.length : 0;
    qualityScore += nameQuality * 0.3;
    qualityFactors += 0.3;

    return qualityFactors > 0 ? Math.round((qualityScore / qualityFactors) * 100) : 60;
  }

  /**
   * 获取置信度等级描述
   */
  public getConfidenceLevel(confidence: number): {
    level: 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
    description: string;
    color: string;
  } {
    if (confidence >= 85) {
      return {
        level: 'very-high',
        description: '匹配结果非常可靠',
        color: '#10B981'
      };
    } else if (confidence >= 70) {
      return {
        level: 'high',
        description: '匹配结果较为可靠',
        color: '#059669'
      };
    } else if (confidence >= 55) {
      return {
        level: 'medium',
        description: '匹配结果中等可靠',
        color: '#F59E0B'
      };
    } else if (confidence >= 40) {
      return {
        level: 'low',
        description: '匹配结果可靠性较低',
        color: '#EF4444'
      };
    } else {
      return {
        level: 'very-low',
        description: '匹配结果可靠性很低',
        color: '#DC2626'
      };
    }
  }

  /**
   * 生成置信度改进建议
   */
  public generateConfidenceImprovementSuggestions(
    confidence: number,
    userSkills: UserSkill[],
    requiredSkills: RequiredSkill[]
  ): string[] {
    const suggestions: string[] = [];

    if (confidence < 70) {
      // 技能覆盖率建议
      const unmatchedSkills = requiredSkills.filter(requiredSkill =>
        !userSkills.some(userSkill =>
          this.normalizeSkillName(userSkill.name) === this.normalizeSkillName(requiredSkill.name)
        )
      );

      if (unmatchedSkills.length > 0) {
        suggestions.push(`补充缺失的关键技能: ${unmatchedSkills.slice(0, 3).map(skill => skill.name).join(', ')}`);
      }

      // 技能深度建议
      const shallowSkills = userSkills.filter(skill => skill.level < 3 && skill.yearsOfExperience < 2);
      if (shallowSkills.length > 0) {
        suggestions.push('增加技能实践经验和项目应用');
      }

      // 数据完整性建议
      const incompleteSkills = userSkills.filter(skill =>
        !skill.name || !skill.level || !skill.category
      );
      if (incompleteSkills.length > 0) {
        suggestions.push('完善技能信息，包括技能等级和分类');
      }
    }

    return suggestions.slice(0, 5);
  }

  private normalizeSkillName(name: string): string {
    return name.toLowerCase().trim().replace(/[.\-_\s]/g, '');
  }
}