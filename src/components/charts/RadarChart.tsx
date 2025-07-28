import React, { useRef } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import { motion } from 'framer-motion';
import { RadarChartProps, ChartConfig, ChartTheme } from './types';
import { transformToRadarData, generateRadarOptions } from './utils/chartUtils';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartComponentProps extends RadarChartProps {
  dimensions?: { width: number; height: number };
  theme?: ChartTheme;
  config?: ChartConfig;
  isVisible?: boolean;
}

const RadarChart: React.FC<RadarChartComponentProps> = ({
  data,
  config,
  theme,
  dimensions,
  isVisible = true,
  className = '',
  showLabels = true,
  showGrid = true,
  maxValue = 100,
  fillOpacity = 0.2,
  onDataPointClick,
  onExport,
}) => {
  const chartRef = useRef<ChartJS<'radar'>>(null);

  if (!theme || !config) {
    return <div>Loading chart...</div>;
  }

  // Transform data for radar chart
  const chartData = transformToRadarData(data, theme);

  // Apply fill opacity
  if (chartData.datasets[0]) {
    chartData.datasets[0].backgroundColor =
      chartData.datasets[0].backgroundColor.replace(/[\d.]+\)$/g, `${fillOpacity})`);
  }

  // Generate chart options
  const baseOptions = generateRadarOptions(
    theme,
    config.interactive,
    config.animations && isVisible,
    maxValue
  );

  // Create options with click handler and grid control
  const options = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      r: {
        ...baseOptions.scales.r,
        grid: {
          ...baseOptions.scales.r.grid,
          display: showGrid,
        },
      },
    },
    onClick: onDataPointClick ? (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) {
        const element = elements[0];
        const dataIndex = element.index;
        const categoryScore = data.categoryScores[dataIndex];
        onDataPointClick(categoryScore);
      }
    } : undefined,
  } as const;

  // Handle export
  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    if (chartRef.current && onExport) {
      const canvas = chartRef.current.canvas;
      if (format === 'png') {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'skill-radar-chart.png';
        link.href = url;
        link.click();
      }
      onExport(format);
    }
  };

  return (
    <motion.div
      className={`radar-chart-container ${className}`}
      initial={config.animations ? { scale: 0.8, opacity: 0 } : false}
      animate={isVisible ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
    >
      <div className="relative">
        <Radar
          ref={chartRef}
          data={chartData}
          options={options as any}
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

        {/* Chart overlay for additional info */}
        <div className="absolute bottom-2 left-2 text-xs opacity-60">
          <div style={{ color: theme.colors.text }}>
            总体匹配度: {Math.round(data.overallScore)}%
          </div>
        </div>
      </div>

      {/* Legend for skill categories */}
      {showLabels && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.categoryScores.map((score, index) => (
            <motion.div
              key={score.category}
              className="flex items-center space-x-2"
              initial={config.animations ? { x: -20, opacity: 0 } : false}
              animate={isVisible ? { x: 0, opacity: 1 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.1 * index,
                ease: 'easeOut'
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: theme.colors.primary[index % theme.colors.primary.length]
                }}
              />
              <span style={{ color: theme.colors.text }}>
                {score.category}: {Math.round((score.score / score.maxScore) * 100)}%
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RadarChart;