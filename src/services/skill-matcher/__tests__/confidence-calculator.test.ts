import { ConfidenceCalculator } from '../confidence-calculator';
import { UserSkill, RequiredSkill, MatchResult, CategoryScore, SkillGap, Experience, Project } from '../../../types';

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  const createUserSkill = (
    name: string,
    level: 1 | 2 | 3 | 4 | 5,
    category: any,
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
    category: any,
    level?: number
  ): RequiredSkill => ({
    name,
    importance,
    category,
    level
  });

  const createMatchResult = (
    overallScore: number,
    categoryScores: CategoryScore[],
    gaps: SkillGap[] = [],
    strengths: string[] = [],
    recommendations: string[] = []
  ): MatchResult => ({
    overallScore,
    categoryScores,
    gaps,
    strengths,
    recommendations
  });

  const createCategoryScore = (
    category: any,
    score: number,
    maxScore: number,
    skillCount: number,
    matchedSkills: number
  ): CategoryScore => ({
    category,
    score,
    maxScore,
    skillCount,
    matchedSkills
  });

  const createExperience = (
    company: string,
    technologies: string[],
    startDate: Date,
    endDate?: Date
  ): Experience => ({
    id: `exp-${Date.now()}`,
    company,
    position: 'Developer',
    startDate,
    endDate,
    description: 'Test experience',
    achievements: [],
    technologies
  });

  const createProject = (
    name: string,
    technologies: string[]
  ): Project => ({
    id: `proj-${Date.now()}`,
    name,
    description: 'Test project',
    technologies,
    startDate: new Date(),
    highlights: []
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for perfect matches', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3, ['React Cert']),
        createUserSkill('Node.js', 4, 'backend', 3),
        createUserSkill('TypeScript', 4, 'languages', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4),
        createRequiredSkill('TypeScript', 0.7, 'languages', 4)
      ];

      const categoryScores: CategoryScore[] = [
        createCategoryScore('frontend', 90, 100, 1, 1),
        createCategoryScore('backend', 85, 100, 1, 1),
        createCategoryScore('languages', 80, 100, 1, 1)
      ];

      const matchResult = createMatchResult(85, categoryScores);

      const experience: Experience[] = [
        createExperience('Tech Corp', ['React', 'Node.js'], new Date('2020-01-01'))
      ];

      const projects: Project[] = [
        createProject('Web App', ['React', 'TypeScript'])
      ];

      const confidence = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult,
        experience,
        projects
      );

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

      const categoryScores: CategoryScore[] = [
        createCategoryScore('frontend', 20, 100, 1, 0),
        createCategoryScore('backend', 0, 100, 1, 0),
        createCategoryScore('database', 0, 100, 1, 0)
      ];

      const matchResult = createMatchResult(20, categoryScores);

      const confidence = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult
      );

      expect(confidence).toBeLessThan(50);
    });

    it('should consider experience relevance in confidence calculation', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 3, 'frontend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 3)
      ];

      const categoryScores: CategoryScore[] = [
        createCategoryScore('frontend', 60, 100, 2, 1)
      ];

      const matchResult = createMatchResult(60, categoryScores);

      // With relevant experience
      const experience: Experience[] = [
        createExperience('Tech Corp', ['React', 'Node.js'], new Date('2020-01-01'))
      ];

      const projects: Project[] = [
        createProject('React App', ['React', 'Node.js'])
      ];

      const confidenceWithExperience = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult,
        experience,
        projects
      );

      // Without experience
      const confidenceWithoutExperience = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult
      );

      expect(confidenceWithExperience).toBeGreaterThan(confidenceWithoutExperience);
    });

    it('should handle empty inputs gracefully', () => {
      const confidence = calculator.calculateConfidence(
        [],
        [],
        createMatchResult(0, [])
      );

      expect(confidence).toBe(50); // Default confidence
    });

    it('should consider skill depth in confidence calculation', () => {
      const experiencedSkills: UserSkill[] = [
        createUserSkill('React', 5, 'frontend', 5, ['React Expert Cert'])
      ];

      const beginnerSkills: UserSkill[] = [
        createUserSkill('React', 2, 'frontend', 0.5)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4)
      ];

      const categoryScores: CategoryScore[] = [
        createCategoryScore('frontend', 80, 100, 1, 1)
      ];

      const matchResult = createMatchResult(80, categoryScores);

      const experiencedConfidence = calculator.calculateConfidence(
        experiencedSkills,
        requiredSkills,
        matchResult
      );

      const beginnerConfidence = calculator.calculateConfidence(
        beginnerSkills,
        requiredSkills,
        matchResult
      );

      expect(experiencedConfidence).toBeGreaterThan(beginnerConfidence);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return correct confidence levels', () => {
      expect(calculator.getConfidenceLevel(90).level).toBe('very-high');
      expect(calculator.getConfidenceLevel(75).level).toBe('high');
      expect(calculator.getConfidenceLevel(60).level).toBe('medium');
      expect(calculator.getConfidenceLevel(45).level).toBe('low');
      expect(calculator.getConfidenceLevel(30).level).toBe('very-low');
    });

    it('should return appropriate descriptions and colors', () => {
      const veryHigh = calculator.getConfidenceLevel(90);
      expect(veryHigh.description).toContain('非常可靠');
      expect(veryHigh.color).toBe('#10B981');

      const low = calculator.getConfidenceLevel(45);
      expect(low.description).toContain('较低');
      expect(low.color).toBe('#EF4444');
    });
  });

  describe('generateConfidenceImprovementSuggestions', () => {
    it('should generate suggestions for low confidence scores', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('HTML', 2, 'frontend', 1)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 3),
        createRequiredSkill('MongoDB', 0.7, 'database', 3)
      ];

      const suggestions = calculator.generateConfidenceImprovementSuggestions(
        40,
        userSkills,
        requiredSkills
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(suggestion =>
        suggestion.includes('React') || suggestion.includes('Node.js')
      )).toBe(true);
    });

    it('should suggest skill depth improvement for shallow skills', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 1, 'frontend', 0.5),
        createUserSkill('Node.js', 2, 'backend', 1)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4)
      ];

      const suggestions = calculator.generateConfidenceImprovementSuggestions(
        50,
        userSkills,
        requiredSkills
      );

      expect(suggestions.some(suggestion =>
        suggestion.includes('实践经验') || suggestion.includes('项目应用')
      )).toBe(true);
    });

    it('should suggest data completeness improvement for incomplete skills', () => {
      const userSkills: UserSkill[] = [
        { name: '', level: 0, category: 'frontend', yearsOfExperience: 0, certifications: [] } as UserSkill,
        createUserSkill('React', 3, 'frontend', 2)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4)
      ];

      const suggestions = calculator.generateConfidenceImprovementSuggestions(
        60,
        userSkills,
        requiredSkills
      );

      expect(suggestions.some(suggestion =>
        suggestion.includes('完善') || suggestion.includes('信息')
      )).toBe(true);
    });

    it('should limit suggestions to reasonable number', () => {
      const userSkills: UserSkill[] = Array.from({ length: 20 }, (_, i) =>
        createUserSkill(`Skill${i}`, 1, 'frontend', 0.5)
      );

      const requiredSkills: RequiredSkill[] = Array.from({ length: 30 }, (_, i) =>
        createRequiredSkill(`RequiredSkill${i}`, 0.8, 'frontend', 4)
      );

      const suggestions = calculator.generateConfidenceImprovementSuggestions(
        30,
        userSkills,
        requiredSkills
      );

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return empty suggestions for high confidence', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 4, 'frontend', 3),
        createUserSkill('Node.js', 4, 'backend', 3)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('Node.js', 0.8, 'backend', 4)
      ];

      const suggestions = calculator.generateConfidenceImprovementSuggestions(
        85,
        userSkills,
        requiredSkills
      );

      expect(suggestions.length).toBe(0);
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

      const categoryScores: CategoryScore[] = [
        createCategoryScore('languages', 85, 100, 2, 2),
        createCategoryScore('backend', 80, 100, 1, 1)
      ];

      const matchResult = createMatchResult(82, categoryScores);

      const confidence = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult
      );

      expect(confidence).toBeGreaterThan(60);
    });

    it('should handle very long experience periods', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('Java', 5, 'languages', 10)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('Java', 0.9, 'languages', 4)
      ];

      const categoryScores: CategoryScore[] = [
        createCategoryScore('languages', 95, 100, 1, 1)
      ];

      const matchResult = createMatchResult(95, categoryScores);

      const experience: Experience[] = [
        createExperience(
          'Long Corp',
          ['Java'],
          new Date('2010-01-01'),
          new Date('2024-01-01')
        )
      ];

      const confidence = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult,
        experience,
        []
      );

      expect(confidence).toBeGreaterThan(80);
    });

    it('should handle unbalanced category scores', () => {
      const userSkills: UserSkill[] = [
        createUserSkill('React', 5, 'frontend', 5),
        createUserSkill('HTML', 1, 'frontend', 0.5)
      ];

      const requiredSkills: RequiredSkill[] = [
        createRequiredSkill('React', 0.9, 'frontend', 4),
        createRequiredSkill('HTML', 0.9, 'frontend', 4)
      ];

      const categoryScores: CategoryScore[] = [
        createCategoryScore('frontend', 60, 100, 2, 2) // Unbalanced scores within category
      ];

      const matchResult = createMatchResult(60, categoryScores);

      const confidence = calculator.calculateConfidence(
        userSkills,
        requiredSkills,
        matchResult
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(100);
    });
  });
});