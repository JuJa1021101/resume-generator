import React, { useRef, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion } from 'framer-motion';
import { BarChartProps, ChartConfig, ChartTheme } from './types';
import {
  transformToBarData,
  transformToCategoryComparison,
  generateChartOptions
} from './utils/chartUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartComponentProps extends BarChartProps {
  dimensions?: { width: number; height: number };
  theme?: ChartTheme;
  config?: ChartConfig;
  isVisible?: boolean;
}

const BarChart: React.FC<BarChartComponentProps> = ({
  data,
  config,
  theme,
  dimensions,
  isVisible = true,
  className = '',
  orientation = 'vertical',
  showValues = true,
  groupBy = 'category',
  sortBy = 'value',
  onDataPointClick,
  onExport,
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  if (!theme || !config) {
    return <div>Loading chart...</div>;
  }

  // Transform data based on groupBy option
  const chartData = groupBy === 'category'
    ? transformToCategoryComparison(data.categoryScores, theme)
    : transformToBarData(data.gaps, theme, sortBy);

  // Generate chart options
  const options = {
    ...generateChartOptions(theme, config.interactive, config.animations && isVisible),
    indexAxis: orientation === 'horizontal' ? 'y' as const : 'x' as const,
    plugins: {
      ...generateChartOptions(theme, config.interactive, config.animations && isVisible).plugins,
      datalabels: showValues ? {
        display: true,
        color: theme.colors.text,
        font: {
          family: theme.fonts.family,
          size: theme.fonts.size.small,
        },
        formatter: (value: number) => `${Math.round(value)}${groupBy === 'category' ? '%' : ''}`,
      } : false,
    },
    scales: {
      ...generateChartOptions(theme, config.interactive, config.animations && isVisible).scales,
      [orientation === 'horizontal' ? 'x' : 'y']: {
        ...generateChartOptions(theme, config.interactive, config.animations && isVisible).scales?.y,
        beginAtZero: true,
        max: groupBy === 'category' ? 100 : undefined,
        ticks: {
          ...generateChartOptions(theme, config.interactive, config.animations && isVisible).scales?.y?.ticks,
          callback: function (value: any) {
            return groupBy === 'category' ? `${value}%` : value;
          },
        },
      },
    },
  };

  // Add click handler
  if (onDataPointClick) {
    options.onClick = (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const dataIndex = element.index;
        const datasetIndex = element.datasetIndex;

        if (groupBy === 'category') {
          const categoryScore = data.categoryScores[dataIndex];
          onDataPointClick(categoryScore);
        } else {
          const skillGap = data.gaps[dataIndex];
          onDataPointClick(skillGap);
        }
      }
    };
  }

  // Handle export
  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    if (chartRef.current && onExport) {
      const canvas = chartRef.current.canvas;
      if (format === 'png') {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `skill-${groupBy}-chart.png`;
        link.href = url;
        link.click();
      }
      onExport(format);
    }
  };

  return (
    <motion.div
      className={`bar-chart-container ${className}`}
      initial={config.animations ? { y: 50, opacity: 0 } : false}
      animate={isVisible ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
    >
      <div className="relative">
        <Bar
          ref={chartRef}
          data={chartData}
          options={options}
          width={dimensions?.width}
          height={dimensions?.height}
        />

        {/* Export buttons */}
        {onExport && (
          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              onClick={() => handleExport('png')}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="导出为PNG"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Chart statistics */}
        <div className="absolute bottom-2 left-2 text-xs opacity-60">
          <div style={{ color: theme.colors.text }}>
            {groupBy === 'category'
              ? `${data.categoryScores.length} 个技能类别`
              : `${data.gaps.length} 个技能差距`
            }
          </div>
        </div>
      </div>

      {/* Chart controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <label
            className="text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            显示方式:
          </label>
          <select
            className="text-sm border rounded px-2 py-1"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.grid,
            }}
            value={groupBy}
            onChange={(e) => {
              // This would need to be handled by parent component
              console.log('Group by changed:', e.target.value);
            }}
          >
            <option value="category">按类别</option>
            <option value="priority">按优先级</option>
          </select>
        </div>

        {groupBy !== 'category' && (
          <div className="flex items-center space-x-2">
            <label
              className="text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              排序:
            </label>
            <select
              className="text-sm border rounded px-2 py-1"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.grid,
              }}
              value={sortBy}
              onChange={(e) => {
                // This would need to be handled by parent component
                console.log('Sort by changed:', e.target.value);
              }}
            >
              <option value="importance">重要性</option>
              <option value="gap">差距大小</option>
              <option value="name">技能名称</option>
            </select>
          </div>
        )}
      </div>

      {/* Insights */}
      {groupBy === 'category' && (
        <motion.div
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: `${theme.colors.accent}10` }}
          initial={config.animations ? { opacity: 0 } : false}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h4
            className="text-sm font-semibold mb-2"
            style={{ color: theme.colors.text }}
          >
            技能分析洞察
          </h4>
          <div className="text-xs space-y-1">
            {data.categoryScores
              .sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore))
              .slice(0, 3)
              .map((score, index) => (
                <div
                  key={score.category}
                  style={{ color: theme.colors.text }}
                >
                  {index === 0 && '🏆 '}
                  {index === 1 && '🥈 '}
                  {index === 2 && '🥉 '}
                  {score.category}: {Math.round((score.score / score.maxScore) * 100)}% 匹配度
                </div>
              ))
            }
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BarChart;