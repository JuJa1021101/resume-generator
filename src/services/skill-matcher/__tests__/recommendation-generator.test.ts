import { RecommendationGenerator } from '../recommendation-generator';
import { SkillGap, Experience, Project } from '../../../types';

describe('RecommendationGenerator', () => {
  let generator: RecommendationGenerator;

  beforeEach(() => {
    generator = new RecommendationGenerator();
  });

  const createSkillGap = (
    skill: string,
    category: any,
    requiredLevel: number,
    currentLevel: number,
    importance: number,
    priority: 'high' | 'medium' | 'low'
  ): SkillGap => ({
    skill,
    category,
    requiredLevel,
    currentLevel,
    importance,
    priority
  });

  const createExperience = (
    company: string,
    position: string,
    technologies: string[],
    startDate: Date,
    endDate?: Date
  ): Experience => ({
    id: `exp-${Date.now()}`,
    company,
    position,
    startDate,
    endDate,
    description: 'Test experience',
    achievements: [],
    technologies
  });

  const createProject = (
    name: string,
    technologies: string[],
    startDate: Date,
    endDate?: Date
  ): Project => ({
    id: `proj-${Date.now()}`,
    name,
    description: 'Test project',
    technologies,
    startDate,
    endDate,
    highlights: []
  });

  describe('generateRecommendations', () => {
    it('should generate overall assessment for high scores', () => {
      const gaps: SkillGap[] = [];
      const strengths = ['React', 'TypeScript', 'Node.js'];
      const overallScore = 90;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec =>
        rec.type === 'strength' && rec.title.includes('优秀')
      )).toBe(true);
    });

    it('should generate skill gap recommendations for low scores', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 1, 0.9, 'high'),
        createSkillGap('Node.js', 'backend', 3, 0, 0.8, 'high'),
        createSkillGap('MongoDB', 'database', 3, 0, 0.7, 'medium')
      ];
      const strengths: string[] = [];
      const overallScore = 40;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec =>
        rec.type === 'skill-gap' && rec.priority === 'high'
      )).toBe(true);
      expect(recommendations.some(rec =>
        rec.description.includes('React') || rec.description.includes('Node.js')
      )).toBe(true);
    });

    it('should generate strength recommendations', () => {
      const gaps: SkillGap[] = [];
      const strengths = ['React', 'TypeScript', 'Docker'];
      const overallScore = 75;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.some(rec =>
        rec.type === 'strength' && rec.description.includes('React')
      )).toBe(true);
      expect(recommendations.some(rec =>
        rec.type === 'strength' && rec.title.includes('技能组合')
      )).toBe(true);
    });

    it('should generate learning path recommendations', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 2, 0.9, 'high'),
        createSkillGap('Vue.js', 'frontend', 3, 0, 0.8, 'medium')
      ];
      const strengths: string[] = [];
      const overallScore = 60;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.some(rec =>
        rec.type === 'improvement' && rec.title.includes('学习路径')
      )).toBe(true);
    });

    it('should generate experience-based recommendations', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 2, 0.9, 'high')
      ];
      const strengths: string[] = [];
      const overallScore = 60;

      const experience: Experience[] = [
        createExperience(
          'Tech Corp',
          'Frontend Developer',
          ['JavaScript', 'HTML', 'CSS'],
          new Date('2022-01-01'),
          new Date('2023-12-31')
        )
      ];

      const projects: Project[] = [
        createProject(
          'Web App',
          ['JavaScript', 'React'],
          new Date('2023-01-01'),
          new Date('2023-06-01')
        )
      ];

      const recommendations = generator.generateRecommendations(
        gaps,
        strengths,
        overallScore,
        experience,
        projects
      );

      expect(recommendations.some(rec =>
        rec.type === 'improvement' && rec.description.includes('基础')
      )).toBe(true);
    });

    it('should limit recommendations to reasonable number', () => {
      const gaps: SkillGap[] = Array.from({ length: 20 }, (_, i) =>
        createSkillGap(`Skill${i}`, 'frontend', 4, 1, 0.8, 'medium')
      );
      const strengths = Array.from({ length: 10 }, (_, i) => `Strength${i}`);
      const overallScore = 50;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.length).toBeLessThanOrEqual(12);
    });

    it('should prioritize recommendations correctly', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 1, 0.9, 'high'),
        createSkillGap('jQuery', 'frontend', 2, 1, 0.3, 'low')
      ];
      const strengths = ['TypeScript'];
      const overallScore = 60;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      // High priority recommendations should come first
      const highPriorityRecs = recommendations.filter(rec => rec.priority === 'high');
      const lowPriorityRecs = recommendations.filter(rec => rec.priority === 'low');

      if (highPriorityRecs.length > 0 && lowPriorityRecs.length > 0) {
        const firstHighIndex = recommendations.findIndex(rec => rec.priority === 'high');
        const firstLowIndex = recommendations.findIndex(rec => rec.priority === 'low');
        expect(firstHighIndex).toBeLessThan(firstLowIndex);
      }
    });

    it('should handle empty inputs gracefully', () => {
      const recommendations = generator.generateRecommendations([], [], 0);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec =>
        rec.type === 'skill-gap' && rec.priority === 'high'
      )).toBe(true);
    });

    it('should generate category-specific learning paths', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 2, 0.9, 'high'),
        createSkillGap('Vue.js', 'frontend', 3, 0, 0.8, 'medium'),
        createSkillGap('Node.js', 'backend', 4, 1, 0.9, 'high'),
        createSkillGap('Express', 'backend', 3, 0, 0.7, 'medium')
      ];
      const strengths: string[] = [];
      const overallScore = 50;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      expect(recommendations.some(rec =>
        rec.title.includes('前端开发') && rec.type === 'improvement'
      )).toBe(true);
      expect(recommendations.some(rec =>
        rec.title.includes('后端开发') && rec.type === 'improvement'
      )).toBe(true);
    });

    it('should calculate learning time estimates', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 1, 0.9, 'high'), // 3 level gap
        createSkillGap('Node.js', 'backend', 3, 2, 0.8, 'medium') // 1 level gap
      ];
      const strengths: string[] = [];
      const overallScore = 60;

      const recommendations = generator.generateRecommendations(gaps, strengths, overallScore);

      const learningPathRec = recommendations.find(rec =>
        rec.type === 'skill-gap' && rec.description.includes('周')
      );

      if (learningPathRec) {
        expect(learningPathRec.description).toMatch(/\d+周/);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle skills with special characters in experience matching', () => {
      const gaps: SkillGap[] = [
        createSkillGap('C++', 'languages', 4, 2, 0.9, 'high')
      ];
      const strengths: string[] = [];
      const overallScore = 60;

      const experience: Experience[] = [
        createExperience(
          'Tech Corp',
          'Developer',
          ['C++', 'C#'],
          new Date('2022-01-01')
        )
      ];

      const projects: Project[] = [
        createProject(
          'System App',
          ['C++'],
          new Date('2023-01-01')
        )
      ];

      const recommendations = generator.generateRecommendations(
        gaps,
        strengths,
        overallScore,
        experience,
        projects
      );

      expect(recommendations.some(rec =>
        rec.description.includes('基础') || rec.description.includes('C++')
      )).toBe(true);
    });

    it('should handle very long experience history', () => {
      const gaps: SkillGap[] = [
        createSkillGap('React', 'frontend', 4, 2, 0.9, 'high')
      ];
      const strengths: string[] = [];
      const overallScore = 60;

      const experience: Experience[] = Array.from({ length: 10 }, (_, i) =>
        createExperience(
          `Company${i}`,
          'Developer',
          ['JavaScript', 'React'],
          new Date(2010 + i, 0, 1),
          new Date(2010 + i + 1, 0, 1)
        )
      );

      const projects: Project[] = [];

      const recommendations = generator.generateRecommendations(
        gaps,
        strengths,
        overallScore,
        experience,
        projects
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(12);
    });
  });
});