import React, { useState } from 'react';
import { ChartContainer, RadarChart, BarChart, TrendChart, ChartExporter } from './index';
import { MatchResult } from '../../types';
import { lightTheme, darkTheme } from './utils/chartThemes';

// Example data for demonstration
const mockMatchResult: MatchResult = {
  overallScore: 78,
  categoryScores: [
    {
      category: 'frontend',
      score: 85,
      maxScore: 100,
      skillCount: 12,
      matchedSkills: 10,
    },
    {
      category: 'backend',
      score: 72,
      maxScore: 100,
      skillCount: 8,
      matchedSkills: 6,
    },
    {
      category: 'database',
      score: 65,
      maxScore: 100,
      skillCount: 6,
      matchedSkills: 4,
    },
    {
      category: 'devops',
      score: 58,
      maxScore: 100,
      skillCount: 5,
      matchedSkills: 3,
    },
    {
      category: 'tools',
      score: 80,
      maxScore: 100,
      skillCount: 10,
      matchedSkills: 8,
    },
  ],
  gaps: [
    {
      skill: 'React Hooks',
      category: 'frontend',
      requiredLevel: 4,
      currentLevel: 2,
      importance: 0.9,
      priority: 'high',
    },
    {
      skill: 'Node.js',
      category: 'backend',
      requiredLevel: 4,
      currentLevel: 1,
      importance: 0.8,
      priority: 'high',
    },
    {
      skill: 'MongoDB',
      category: 'database',
      requiredLevel: 3,
      currentLevel: 1,
      importance: 0.7,
      priority: 'medium',
    },
    {
      skill: 'Docker',
      category: 'devops',
      requiredLevel: 3,
      currentLevel: 0,
      importance: 0.6,
      priority: 'medium',
    },
  ],
  strengths: ['JavaScript', 'CSS', 'HTML', 'Git'],
  recommendations: [
    {
      type: 'skill-gap',
      title: '提升React技能',
      description: '建议深入学习React Hooks和状态管理',
      priority: 'high',
      actionable: true,
    },
    {
      type: 'strength',
      title: '前端基础扎实',
      description: '在JavaScript和CSS方面表现优秀',
      priority: 'medium',
      actionable: false,
    },
  ],
};

const ChartExample: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeChart, setActiveChart] = useState<'radar' | 'bar' | 'trend'>('radar');
  const chartRef = React.useRef<HTMLDivElement>(null);

  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
  const chartConfig = {
    width: 600,
    height: 400,
    responsive: true,
    maintainAspectRatio: true,
    animations: true,
    theme: currentTheme,
    interactive: true,
  };

  const handleDataPointClick = (data: any) => {
    console.log('Data point clicked:', data);
  };

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    console.log('Export requested:', format);
  };

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: currentTheme.colors.background }}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold"
          style={{ color: currentTheme.colors.text }}
        >
          数据可视化图表系统演示
        </h2>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-3 py-2 rounded-lg border transition-colors"
            style={{
              backgroundColor: currentTheme.colors.accent + '20',
              borderColor: currentTheme.colors.accent,
              color: currentTheme.colors.text,
            }}
          >
            {theme === 'light' ? '🌙 深色' : '☀️ 浅色'}
          </button>

          {/* Chart Type Selector */}
          <select
            value={activeChart}
            onChange={(e) => setActiveChart(e.target.value as any)}
            className="px-3 py-2 rounded-lg border"
            style={{
              backgroundColor: currentTheme.colors.background,
              borderColor: currentTheme.colors.grid,
              color: currentTheme.colors.text,
            }}
          >
            <option value="radar">雷达图</option>
            <option value="bar">柱状图</option>
            <option value="trend">趋势图</option>
          </select>
        </div>
      </div>

      {/* Chart Display */}
      <div ref={chartRef}>
        <ChartContainer
          config={chartConfig}
          title={`技能匹配度分析 - ${activeChart === 'radar' ? '雷达图' : activeChart === 'bar' ? '柱状图' : '趋势图'}`}
          subtitle={`总体匹配度: ${mockMatchResult.overallScore}%`}
          className="shadow-lg"
        >
          {activeChart === 'radar' && (
            <RadarChart
              data={mockMatchResult}
              config={chartConfig}
              theme={currentTheme}
              showLabels={true}
              showGrid={true}
              maxValue={100}
              fillOpacity={0.3}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
            />
          )}

          {activeChart === 'bar' && (
            <BarChart
              data={mockMatchResult}
              config={chartConfig}
              theme={currentTheme}
              orientation="vertical"
              showValues={true}
              groupBy="category"
              sortBy="value"
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
            />
          )}

          {activeChart === 'trend' && (
            <TrendChart
              data={mockMatchResult}
              config={chartConfig}
              theme={currentTheme}
              timeRange="month"
              showTrendLine={true}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
            />
          )}
        </ChartContainer>
      </div>

      {/* Export Controls */}
      <div className="flex items-center justify-between">
        <div
          className="text-sm"
          style={{ color: currentTheme.colors.text }}
        >
          <p>💡 功能特性:</p>
          <ul className="mt-2 space-y-1 ml-4">
            <li>• 双引擎架构: Chart.js + D3.js</li>
            <li>• 响应式设计，支持主题切换</li>
            <li>• 交互式图表，支持点击事件</li>
            <li>• 数据导出功能 (PNG/SVG/PDF)</li>
            <li>• 流畅的动画效果</li>
          </ul>
        </div>

        <ChartExporter
          data={mockMatchResult}
          theme={currentTheme}
          chartRef={chartRef}
        />
      </div>

      {/* Statistics */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg"
        style={{ backgroundColor: currentTheme.colors.accent + '10' }}
      >
        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {mockMatchResult.overallScore}%
          </div>
          <div
            className="text-sm opacity-75"
            style={{ color: currentTheme.colors.text }}
          >
            总体匹配度
          </div>
        </div>

        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {mockMatchResult.categoryScores.length}
          </div>
          <div
            className="text-sm opacity-75"
            style={{ color: currentTheme.colors.text }}
          >
            技能类别
          </div>
        </div>

        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {mockMatchResult.gaps.length}
          </div>
          <div
            className="text-sm opacity-75"
            style={{ color: currentTheme.colors.text }}
          >
            技能差距
          </div>
        </div>

        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {mockMatchResult.strengths.length}
          </div>
          <div
            className="text-sm opacity-75"
            style={{ color: currentTheme.colors.text }}
          >
            技能优势
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartExample;