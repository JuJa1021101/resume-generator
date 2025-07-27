import {
  transformToRadarData,
  transformToBarData,
  transformToCategoryComparison,
  formatCategoryLabel,
  calculateChartDimensions,
  generateChartOptions,
  generateRadarOptions,
  debounce,
} from '../utils/chartUtils';
import { lightTheme } from '../utils/chartThemes';
import { MatchResult, SkillGap } from '../../../types';

describe('chartUtils', () => {
  const mockMatchResult: MatchResult = {
    overallScore: 75,
    categoryScores: [
      {
        category: 'frontend',
        score: 80,
        maxScore: 100,
        skillCount: 10,
        matchedSkills: 8,
      },
      {
        category: 'backend',
        score: 70,
        maxScore: 100,
        skillCount: 8,
        matchedSkills: 6,
      },
    ],
    gaps: [],
    strengths: [],
    recommendations: [],
  };

  const mockSkillGaps: SkillGap[] = [
    {
      skill: 'React',
      category: 'frontend',
      requiredLevel: 4,
      currentLevel: 2,
      importance: 0.9,
      priority: 'high',
    },
    {
      skill: 'Node.js',
      category: 'backend',
      requiredLevel: 3,
      currentLevel: 1,
      importance: 0.8,
      priority: 'medium',
    },
  ];

  describe('transformToRadarData', () => {
    it('transforms match result to radar chart data', () => {
      const result = transformToRadarData(mockMatchResult, lightTheme);

      expect(result.labels).toEqual(['前端开发', '后端开发']);
      expect(result.datasets[0].data).toEqual([80, 70]);
      expect(result.datasets[0].label).toBe('技能匹配度');
      expect(result.datasets[0].borderColor).toBe(lightTheme.colors.primary[0]);
    });

    it('applies theme colors correctly', () => {
      const result = transformToRadarData(mockMatchResult, lightTheme);

      expect(result.datasets[0].borderColor).toBe(lightTheme.colors.primary[0]);
      expect(result.datasets[0].pointBackgroundColor).toBe(lightTheme.colors.primary[0]);
    });
  });

  describe('transformToBarData', () => {
    it('transforms skill gaps to bar chart data', () => {
      const result = transformToBarData(mockSkillGaps, lightTheme);

      expect(result.labels).toEqual(['React', 'Node.js']);
      expect(result.datasets).toHaveLength(3);
      expect(result.datasets[0].label).toBe('当前水平');
      expect(result.datasets[1].label).toBe('要求水平');
      expect(result.datasets[2].label).toBe('技能差距');
    });

    it('sorts by importance by default', () => {
      const result = transformToBarData(mockSkillGaps, lightTheme);

      expect(result.labels[0]).toBe('React'); // Higher importance (0.9)
      expect(result.labels[1]).toBe('Node.js'); // Lower importance (0.8)
    });

    it('sorts by gap size when specified', () => {
      const result = transformToBarData(mockSkillGaps, lightTheme, 'gap');

      // React has gap of 2, Node.js has gap of 2, so order should be by importance
      expect(result.labels).toEqual(['React', 'Node.js']);
    });

    it('sorts by name when specified', () => {
      const result = transformToBarData(mockSkillGaps, lightTheme, 'name');

      expect(result.labels).toEqual(['Node.js', 'React']); // Alphabetical order
    });
  });

  describe('transformToCategoryComparison', () => {
    it('transforms category scores to comparison data', () => {
      const result = transformToCategoryComparison(mockMatchResult.categoryScores, lightTheme);

      expect(result.labels).toEqual(['前端开发', '后端开发']);
      expect(result.datasets[0].data).toEqual([80, 70]);
      expect(result.datasets[0].label).toBe('匹配度 (%)');
    });

    it('applies theme colors to each category', () => {
      const result = transformToCategoryComparison(mockMatchResult.categoryScores, lightTheme);

      expect(result.datasets[0].backgroundColor).toHaveLength(2);
      expect(result.datasets[0].borderColor).toHaveLength(2);
    });
  });

  describe('formatCategoryLabel', () => {
    it('formats known categories correctly', () => {
      expect(formatCategoryLabel('frontend')).toBe('前端开发');
      expect(formatCategoryLabel('backend')).toBe('后端开发');
      expect(formatCategoryLabel('database')).toBe('数据库');
      expect(formatCategoryLabel('devops')).toBe('DevOps');
      expect(formatCategoryLabel('mobile')).toBe('移动开发');
      expect(formatCategoryLabel('design')).toBe('设计');
      expect(formatCategoryLabel('soft-skills')).toBe('软技能');
      expect(formatCategoryLabel('tools')).toBe('工具');
      expect(formatCategoryLabel('languages')).toBe('编程语言');
    });

    it('returns original category for unknown categories', () => {
      expect(formatCategoryLabel('unknown')).toBe('unknown');
    });
  });

  describe('calculateChartDimensions', () => {
    it('calculates dimensions based on container width', () => {
      const mockContainer = {
        clientWidth: 800,
        clientHeight: 600,
      } as HTMLElement;

      const result = calculateChartDimensions(mockContainer, 2);

      expect(result.width).toBe(800);
      expect(result.height).toBe(400); // 800 / 2
    });

    it('adjusts dimensions when height exceeds container', () => {
      const mockContainer = {
        clientWidth: 800,
        clientHeight: 300,
      } as HTMLElement;

      const result = calculateChartDimensions(mockContainer, 2);

      expect(result.height).toBe(300);
      expect(result.width).toBe(600); // 300 * 2
    });
  });

  describe('generateChartOptions', () => {
    it('generates basic chart options', () => {
      const options = generateChartOptions(lightTheme);

      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.plugins.legend.labels.color).toBe(lightTheme.colors.text);
      expect(options.scales.x.ticks.color).toBe(lightTheme.colors.text);
      expect(options.scales.y.ticks.color).toBe(lightTheme.colors.text);
    });

    it('disables interactions when specified', () => {
      const options = generateChartOptions(lightTheme, false);

      expect(options.plugins.tooltip.enabled).toBe(false);
    });

    it('disables animations when specified', () => {
      const options = generateChartOptions(lightTheme, true, false);

      expect(options.animation).toBe(false);
    });
  });

  describe('generateRadarOptions', () => {
    it('generates radar-specific options', () => {
      const options = generateRadarOptions(lightTheme);

      expect(options.scales.r).toBeDefined();
      expect(options.scales.r.beginAtZero).toBe(true);
      expect(options.scales.r.max).toBe(100);
      expect(options.scales.r.pointLabels.color).toBe(lightTheme.colors.text);
    });

    it('sets custom max value', () => {
      const options = generateRadarOptions(lightTheme, true, true, 120);

      expect(options.scales.r.max).toBe(120);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('debounces function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('resets timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      jest.advanceTimersByTime(50);
      debouncedFn('arg2');
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });
});