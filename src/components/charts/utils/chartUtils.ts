import { MatchResult, CategoryScore, SkillGap } from '../../../types';
import { RadarChartData, BarChartData, ChartTheme } from '../types';
import { generateColorPalette } from './chartThemes';

// Transform match result to radar chart data
export const transformToRadarData = (
  matchResult: MatchResult,
  theme: ChartTheme
): RadarChartData => {
  const labels = matchResult.categoryScores.map(score =>
    formatCategoryLabel(score.category)
  );

  const data = matchResult.categoryScores.map(score =>
    Math.round((score.score / score.maxScore) * 100)
  );

  const colors = generateColorPalette(1, theme, 'primary');

  return {
    labels,
    datasets: [{
      label: '技能匹配度',
      data,
      backgroundColor: `${colors[0]}20`, // 20% opacity
      borderColor: colors[0],
      borderWidth: 2,
      pointBackgroundColor: colors[0],
      pointBorderColor: '#ffffff',
      pointRadius: 4,
      fill: true,
    }],
  };
};

// Transform skill gaps to bar chart data
export const transformToBarData = (
  skillGaps: SkillGap[],
  theme: ChartTheme,
  sortBy: 'importance' | 'gap' | 'name' = 'importance'
): BarChartData => {
  // Sort skill gaps based on criteria
  const sortedGaps = [...skillGaps].sort((a, b) => {
    switch (sortBy) {
      case 'importance':
        return b.importance - a.importance;
      case 'gap':
        return (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel);
      case 'name':
        return a.skill.localeCompare(b.skill);
      default:
        return 0;
    }
  });

  const labels = sortedGaps.map(gap => gap.skill);
  const currentLevels = sortedGaps.map(gap => gap.currentLevel);
  const requiredLevels = sortedGaps.map(gap => gap.requiredLevel);
  const gaps = sortedGaps.map(gap => gap.requiredLevel - gap.currentLevel);

  const colors = generateColorPalette(3, theme, 'primary');

  return {
    labels,
    datasets: [
      {
        label: '当前水平',
        data: currentLevels,
        backgroundColor: colors.map(color => `${color}80`), // 50% opacity
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: '要求水平',
        data: requiredLevels,
        backgroundColor: colors.map(color => `${color}40`), // 25% opacity
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: '技能差距',
        data: gaps,
        backgroundColor: gaps.map(() => theme.colors.primary[3] + '60'), // Red with opacity
        borderColor: gaps.map(() => theme.colors.primary[3]),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };
};

// Transform category scores to comparison data
export const transformToCategoryComparison = (
  categoryScores: CategoryScore[],
  theme: ChartTheme
): BarChartData => {
  const labels = categoryScores.map(score => formatCategoryLabel(score.category));
  const scores = categoryScores.map(score =>
    Math.round((score.score / score.maxScore) * 100)
  );
  // const matchedCounts = categoryScores.map(score => score.matchedSkills);
  // const totalCounts = categoryScores.map(score => score.skillCount);

  const colors = generateColorPalette(categoryScores.length, theme, 'primary');

  return {
    labels,
    datasets: [
      {
        label: '匹配度 (%)',
        data: scores,
        backgroundColor: colors.map(color => `${color}80`),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };
};

// Format category labels for display
export const formatCategoryLabel = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'frontend': '前端开发',
    'backend': '后端开发',
    'database': '数据库',
    'devops': 'DevOps',
    'mobile': '移动开发',
    'design': '设计',
    'soft-skills': '软技能',
    'tools': '工具',
    'languages': '编程语言',
  };

  return categoryMap[category] || category;
};

// Calculate chart dimensions based on container
export const calculateChartDimensions = (
  container: HTMLElement,
  aspectRatio: number = 2
): { width: number; height: number } => {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  let width = containerWidth;
  let height = containerWidth / aspectRatio;

  // Ensure height doesn't exceed container
  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspectRatio;
  }

  return { width, height };
};

// Generate chart options for Chart.js
export const generateChartOptions = (
  theme: ChartTheme,
  interactive: boolean = true,
  animations: boolean = true
) => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size.medium,
          },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: interactive,
        backgroundColor: theme.colors.background,
        titleColor: theme.colors.text,
        bodyColor: theme.colors.text,
        borderColor: theme.colors.grid,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: theme.fonts.family,
          size: theme.fonts.size.medium,
          weight: 'bold' as const,
        },
        bodyFont: {
          family: theme.fonts.family,
          size: theme.fonts.size.small,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size.small,
          },
        },
      },
      y: {
        grid: {
          color: theme.colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size.small,
          },
        },
      },
    },
  };

  if (animations) {
    return {
      ...baseOptions,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart' as const,
      },
    };
  }

  return {
    ...baseOptions,
    animation: false,
  };
};

// Generate radar chart specific options
export const generateRadarOptions = (
  theme: ChartTheme,
  interactive: boolean = true,
  animations: boolean = true,
  maxValue: number = 100
) => {
  const baseOptions = generateChartOptions(theme, interactive, animations);

  const radarOptions = {
    ...baseOptions,
    scales: {
      r: {
        beginAtZero: true,
        max: maxValue,
        grid: {
          color: theme.colors.grid,
        },
        pointLabels: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size.small,
          },
        },
        ticks: {
          color: theme.colors.text,
          font: {
            family: theme.fonts.family,
            size: theme.fonts.size.small,
          },
          stepSize: 20,
          showLabelBackdrop: false,
        },
      },
    },
  };

  return radarOptions;
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};