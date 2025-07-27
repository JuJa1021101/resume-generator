import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { TrendChartProps, ChartConfig, ChartTheme, D3ChartData } from './types';
import {
  createResponsiveSVG,
  createChartGroup,
  createScales,
  createColorScale,
  createAxes,
  createGridLines,
  createTooltip,
  showTooltip,
  hideTooltip,
  createTransition,
} from './utils/d3Utils';

interface TrendChartComponentProps extends TrendChartProps {
  dimensions?: { width: number; height: number };
  theme?: ChartTheme;
  config?: ChartConfig;
  isVisible?: boolean;
}

const TrendChart: React.FC<TrendChartComponentProps> = ({
  data,
  config,
  theme,
  dimensions,
  isVisible = true,
  className = '',
  timeRange = 'month',
  showTrendLine = true,
  compareWith = [],
  onDataPointClick,
  onExport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<D3ChartData[]>([]);

  if (!theme || !config || !dimensions) {
    return <div>Loading chart...</div>;
  }

  const margins = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = dimensions.width - margins.left - margins.right;
  const height = dimensions.height - margins.top - margins.bottom;

  // Transform data for trend visualization
  useEffect(() => {
    const transformedData: D3ChartData[] = data.categoryScores.map((score, index) => ({
      name: score.category,
      value: (score.score / score.maxScore) * 100,
      category: score.category,
      metadata: {
        matchedSkills: score.matchedSkills,
        totalSkills: score.skillCount,
        rawScore: score.score,
        maxScore: score.maxScore,
      },
    }));

    setChartData(transformedData);
  }, [data]);

  // Create chart
  useEffect(() => {
    if (!containerRef.current || !isVisible || chartData.length === 0) return;

    // Clear previous chart
    d3.select(containerRef.current).selectAll('*').remove();

    // Create SVG
    const svg = createResponsiveSVG(containerRef.current, dimensions.width, dimensions.height, margins);
    const chartGroup = createChartGroup(svg, margins);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    const colorScale = createColorScale(chartData, theme);

    // Create grid lines
    createGridLines(chartGroup, xScale, yScale, width, height, theme);

    // Create axes
    createAxes(chartGroup, xScale, yScale, width, height, theme);

    // Create tooltip
    const tooltip = createTooltip(containerRef.current, theme);

    // Create trend line data
    const lineData = chartData.map((d, i) => [
      (xScale(d.name) || 0) + xScale.bandwidth() / 2,
      yScale(d.value)
    ]);

    // Create line generator
    const line = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveMonotoneX);

    // Add trend line
    if (showTrendLine && lineData.length > 1) {
      const transition = createTransition(1000);

      const path = chartGroup.append('path')
        .datum(lineData)
        .attr('class', 'trend-line')
        .attr('fill', 'none')
        .attr('stroke', theme.colors.accent)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7);

      // Animate line drawing
      const totalLength = (path.node() as SVGPathElement).getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition(transition)
        .attr('stroke-dashoffset', 0);
    }

    // Add bars with animation
    const bars = chartGroup.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => colorScale(d.category))
      .attr('rx', 4)
      .style('cursor', 'pointer');

    // Animate bars
    bars.transition()
      .delay((d, i) => i * 100)
      .duration(800)
      .ease(d3.easeBackOut)
      .attr('y', d => yScale(d.value))
      .attr('height', d => height - yScale(d.value));

    // Add value labels
    const labels = chartGroup.selectAll('.value-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 5)
      .attr('text-anchor', 'middle')
      .style('fill', theme.colors.text)
      .style('font-family', theme.fonts.family)
      .style('font-size', `${theme.fonts.size.small}px`)
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .text(d => `${Math.round(d.value)}%`);

    // Animate labels
    labels.transition()
      .delay((d, i) => i * 100 + 400)
      .duration(600)
      .style('opacity', 1);

    // Add interaction
    bars
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('transform', 'scale(1.05)');

        const tooltipContent = `
          <div class="font-semibold">${d.name}</div>
          <div>匹配度: ${Math.round(d.value)}%</div>
          <div>已匹配: ${d.metadata.matchedSkills}/${d.metadata.totalSkills}</div>
          <div>得分: ${d.metadata.rawScore}/${d.metadata.maxScore}</div>
        `;

        showTooltip(tooltip, tooltipContent, event);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('transform', 'scale(1)');

        hideTooltip(tooltip);
      })
      .on('click', function (event, d) {
        if (onDataPointClick) {
          const categoryScore = data.categoryScores.find(score => score.category === d.category);
          if (categoryScore) {
            onDataPointClick(categoryScore);
          }
        }
      });

    // Add comparison data if provided
    if (compareWith.length > 0) {
      compareWith.forEach((compareData, index) => {
        const compareChartData = compareData.categoryScores.map(score => ({
          name: score.category,
          value: (score.score / score.maxScore) * 100,
          category: score.category,
        }));

        const compareLine = d3.line()
          .x(d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
          .y(d => yScale(d.value))
          .curve(d3.curveMonotoneX);

        chartGroup.append('path')
          .datum(compareChartData)
          .attr('class', `compare-line-${index}`)
          .attr('fill', 'none')
          .attr('stroke', theme.colors.secondary[index % theme.colors.secondary.length])
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.6);
      });
    }

    // Add chart title
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('fill', theme.colors.text)
      .style('font-family', theme.fonts.family)
      .style('font-size', `${theme.fonts.size.medium}px`)
      .style('font-weight', 'bold')
      .text('技能匹配度趋势分析');

  }, [chartData, dimensions, theme, isVisible, showTrendLine, compareWith, data, onDataPointClick]);

  // Handle export
  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    if (containerRef.current && onExport) {
      const svg = containerRef.current.querySelector('svg');
      if (svg && format === 'svg') {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'skill-trend-chart.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
      onExport(format);
    }
  };

  return (
    <motion.div
      className={`trend-chart-container ${className}`}
      initial={config.animations ? { scale: 0.9, opacity: 0 } : false}
      animate={isVisible ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
    >
      <div className="relative">
        <div
          ref={containerRef}
          className="trend-chart"
          style={{ width: '100%', height: dimensions.height }}
        />

        {/* Export buttons */}
        {onExport && (
          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              onClick={() => handleExport('svg')}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="导出为SVG"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Chart controls */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <label
            className="text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            时间范围:
          </label>
          <select
            className="text-sm border rounded px-2 py-1"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.grid,
            }}
            value={timeRange}
            onChange={(e) => {
              // This would need to be handled by parent component
              console.log('Time range changed:', e.target.value);
            }}
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="quarter">本季度</option>
            <option value="year">本年</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-trend-line"
            checked={showTrendLine}
            onChange={(e) => {
              // This would need to be handled by parent component
              console.log('Show trend line changed:', e.target.checked);
            }}
            className="rounded"
          />
          <label
            htmlFor="show-trend-line"
            className="text-sm"
            style={{ color: theme.colors.text }}
          >
            显示趋势线
          </label>
        </div>
      </div>

      {/* Trend insights */}
      <motion.div
        className="mt-4 p-3 rounded-lg"
        style={{ backgroundColor: `${theme.colors.accent}10` }}
        initial={config.animations ? { opacity: 0, y: 20 } : false}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h4
          className="text-sm font-semibold mb-2"
          style={{ color: theme.colors.text }}
        >
          趋势分析
        </h4>
        <div className="text-xs space-y-1">
          <div style={{ color: theme.colors.text }}>
            📈 平均匹配度: {Math.round(data.overallScore)}%
          </div>
          <div style={{ color: theme.colors.text }}>
            🎯 最强技能: {data.categoryScores
              .sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore))[0]?.category}
          </div>
          <div style={{ color: theme.colors.text }}>
            📊 技能覆盖: {data.categoryScores.length} 个类别
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TrendChart;