export { SkillMatcher } from './skill-matcher';
export { RecommendationGenerator } from './recommendation-generator';
export { ConfidenceCalculator } from './confidence-calculator';

// Re-export types for convenience
export type {
  UserSkill,
  RequiredSkill,
  MatchResult,
  CategoryScore,
  SkillGap,
  Recommendation,
  DetailedScore,
  ScoreBreakdown,
  SkillCategory
} from '../../types';