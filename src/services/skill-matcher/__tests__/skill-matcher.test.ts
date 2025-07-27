import { SkillMatcher } from '../skill-matcher';
import { UserSkill, RequiredSkill, SkillCategory } from '../../../types';

describe('SkillMatcher', () => {
  let skillMatcher: SkillMatcher;

  beforeEach(() => {
    skillMatcher = new SkillMatcher();
  });

  const createUserSkill = (
    name: string,
    level: 1 | 2 | 3 | 4 | 5,
    category: SkillCategory,
    yearsOfExperience: number = 2,
    certifications: string[] = []
  ): UserSkill => ({
    name,
    level,
    category,
    yearsOfExperience,
    certifications
  });

  const createRequiredSkill = (
    name: string,
    importance: number,
    category: SkillCategory,
    level?: number
  ): RequiredSkill => ({
    name,
    importance,
    category,
    level
  });

  describe('analyzeSkillMatch', () => {
    it('should calculate correct overall score for perfect match', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3),
        createUserSkill('Node.js', 4, 'backend', 3),
        createUserSkill('TypeScript', 4, 'languages', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4),
        createRequiredSkill('TypeScript', 0.7, 'languages', 4)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.overallScore).toBeGreaterThan(85);
      expect(result.categoryScores).toHaveLength(3);
      expect(result.gaps).toHaveLength(0);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should identify skill gaps correctly', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 2, 'frontend', 1),
        createUserSkill('JavaScript', 3, 'languages', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Vue.js', 0.8, 'frontend', 3),
        createRequiredSkill('Node.js', 0.7, 'backend', 3)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.gaps).toHaveLength(3);
      expect(result.gaps.find(gap => gap.skill === 'React')).toBeDefined();
      expect(result.gaps.find(gap => gap.skill === 'Vue.js')).toBeDefined();
      expect(result.gaps.find(gap => gap.skill === 'Node.js')).toBeDefined();
    });

    it('should calculate category scores correctly', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3),
        createUserSkill('Vue.js', 3, 'frontend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Vue.js', 0.8, 'frontend', 3),
        createRequiredSkill('Angular', 0.6, 'frontend', 3)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      const frontendCategory = result.categoryScores.find(cat => cat.category === 'frontend');
      expect(frontendCategory).toBeDefined();
      expect(frontendCategory!.skillCount).toBe(3);
      expect(frontendCategory!.matchedSkills).toBe(2);
      expect(frontendCategory!.score).toBeGreaterThan(0);
    });

    it('should identify strengths correctly', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 5, 'frontend', 5, ['React Certification']),
        createUserSkill('TypeScript', 4, 'languages', 4),
        createUserSkill('Docker', 4, 'devops', 3)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 3),
        createRequiredSkill('JavaScript', 0.8, 'languages', 3)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.strengths).toContain('React');
      expect(result.strengths).toContain('TypeScript');
      expect(result.strengths).toContain('Docker');
    });

    it('should generate appropriate recommendations', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 2, 'frontend', 1)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 3),
        createRequiredSkill('MongoDB', 0.7, 'database', 3)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec =>
        rec.includes('React') || rec.includes('Node.js') || rec.includes('MongoDB')
      )).toBe(true);
    });

    it('should handle empty skill arrays', () => {
      const result = skillMatcher.analyzeSkillMatch([], []);

      expect(result.overallScore).toBe(0);
      expect(result.categoryScores).toHaveLength(0);
      expect(result.gaps).toHaveLength(0);
      expect(result.strengths).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive skill matching', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('react', 4, 'frontend', 3),
        createUserSkill('NODE.JS', 4, 'backend', 3)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('node.js', 0.8, 'backend', 4)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.gaps).toHaveLength(0);
      expect(result.overallScore).toBeGreaterThan(80);
    });
  });

  describe('calculateDetailedScores', () => {
    it('should provide detailed breakdown for each category', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3),
        createUserSkill('Node.js', 3, 'backend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Vue.js', 0.7, 'frontend', 3),
        createRequiredSkill('Node.js', 0.8, 'backend', 3)
      ];

      const detailedScores = skillMatcher.calculateDetailedScores(userSkills, requiredSkills);

      expect(detailedScores.length).toBeGreaterThan(0);

      const frontendScore = detailedScores.find(score => score.category === '前端开发');
      expect(frontendScore).toBeDefined();
      expect(frontendScore!.breakdown.length).toBe(2);

      const reactBreakdown = frontendScore!.breakdown.find(b => b.skill === 'React');
      expect(reactBreakdown).toBeDefined();
      expect(reactBreakdown!.userScore).toBe(80); // 4 * 20
      expect(reactBreakdown!.requiredScore).toBe(80); // 4 * 20
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for good matches', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3),
        createUserSkill('Node.js', 4, 'backend', 3),
        createUserSkill('TypeScript', 4, 'languages', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4),
        createRequiredSkill('TypeScript', 0.7, 'languages', 4)
      ];

      const matchResult = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);
      const confidence = skillMatcher.calculateConfidence(userSkills, requiredSkills, matchResult);

      expect(confidence).toBeGreaterThan(70);
    });

    it('should return low confidence for poor matches', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('jQuery', 2, 'frontend', 1)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4),
        createRequiredSkill('MongoDB', 0.7, 'database', 3)
      ];

      const matchResult = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);
      const confidence = skillMatcher.calculateConfidence(userSkills, requiredSkills, matchResult);

      expect(confidence).toBeLessThan(50);
    });
  });

  describe('edge cases', () => {
    it('should handle skills with special characters', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('C++', 4, 'languages', 3),
        createUserSkill('C#', 4, 'languages', 3),
        createUserSkill('.NET', 3, 'backend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('C++', 0.9, 'languages', 4),
        createRequiredSkill('C#', 0.8, 'languages', 4),
        createRequiredSkill('.NET', 0.7, 'backend', 3)
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.gaps.length).toBeLessThan(3);
    });

    it('should handle very large skill lists', () => {
      const userSkills: UserSkill[] = Array.from({ length: 50 }, (_, i) =>
        createUserSkill(`Skill${i}`, 3, 'frontend', 2)
      );

      const requiredSkills: RequiredSkill[] = Array.from({ length: 30 }, (_, i) =>
        createRequiredSkill(`Skill${i}`, 0.5, 'frontend', 3)
      );

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.categoryScores.length).toBeGreaterThan(0);
    });

    it('should prioritize high importance skills in gap analysis', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('HTML', 3, 'frontend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4), // High importance
        createRequiredSkill('jQuery', 0.3, 'frontend', 2)  // Low importance
      ];

      const result = skillMatcher.analyzeSkillMatch(userSkills, requiredSkills);

      const reactGap = result.gaps.find(gap => gap.skill === 'React');
      const jqueryGap = result.gaps.find(gap => gap.skill === 'jQuery');

      expect(reactGap?.priority).toBe('high');
      expect(jqueryGap?.priority).toBe('low');
    });
  });
});