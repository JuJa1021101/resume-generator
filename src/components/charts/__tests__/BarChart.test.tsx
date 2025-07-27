import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarChart from '../BarChart';
import { lightTheme, defaultChartConfig } from '../utils/chartThemes';
import { MatchResult } from '../../../types';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: React.forwardRef(({ data, options, ...props }: any, ref: any) => (
    <div
      data-testid="bar-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      ref={ref}
      {...props}
    >
      Bar Chart
    </div>
  )),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('BarChart', () => {
  const mockData: MatchResult = {
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
    gaps: [
      {
        skill: 'React',
        category: 'frontend',
        requiredLevel: 4,
        currentLevel: 2,
        importance: 0.9,
        priority: 'high' as const,
      },
      {
        skill: 'Node.js',
        category: 'backend',
        requiredLevel: 3,
        currentLevel: 1,
        importance: 0.8,
        priority: 'medium' as const,
      },
    ],
    strengths: [],
    recommendations: [],
  };

  const defaultProps = {
    data: mockData,
    theme: lightTheme,
    config: defaultChartConfig,
    dimensions: { width: 400, height: 300 },
    isVisible: true,
  };

  it('renders bar chart correctly', () => {
    render(<BarChart {...defaultProps} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('displays category count for category grouping', () => {
    render(<BarChart {...defaultProps} groupBy="category" />);

    expect(screen.getByText('2 个技能类别')).toBeInTheDocument();
  });

  it('displays skill gaps count for priority grouping', () => {
    render(<BarChart {...defaultProps} groupBy="priority" />);

    expect(screen.getByText('2 个技能差距')).toBeInTheDocument();
  });

  it('shows export button when onExport is provided', () => {
    const mockOnExport = jest.fn();
    render(<BarChart {...defaultProps} onExport={mockOnExport} />);

    expect(screen.getByTitle('导出为PNG')).toBeInTheDocument();
  });

  it('handles export button click', () => {
    const mockOnExport = jest.fn();
    render(<BarChart {...defaultProps} onExport={mockOnExport} />);

    const exportButton = screen.getByTitle('导出为PNG');
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith('png');
  });

  it('applies custom className', () => {
    const { container } = render(
      <BarChart {...defaultProps} className="custom-bar" />
    );

    expect(container.firstChild).toHaveClass('custom-bar');
  });

  it('configures horizontal orientation', () => {
    render(<BarChart {...defaultProps} orientation="horizontal" />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.indexAxis).toBe('y');
  });

  it('configures vertical orientation', () => {
    render(<BarChart {...defaultProps} orientation="vertical" />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.indexAxis).toBe('x');
  });

  it('shows group by control', () => {
    render(<BarChart {...defaultProps} />);

    expect(screen.getByText('显示方式:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('category')).toBeInTheDocument();
  });

  it('shows sort by control for non-category grouping', () => {
    render(<BarChart {...defaultProps} groupBy="priority" />);

    expect(screen.getByText('排序:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value')).toBeInTheDocument();
  });

  it('hides sort by control for category grouping', () => {
    render(<BarChart {...defaultProps} groupBy="category" />);

    expect(screen.queryByText('排序:')).not.toBeInTheDocument();
  });

  it('shows insights for category grouping', () => {
    render(<BarChart {...defaultProps} groupBy="category" />);

    expect(screen.getByText('技能分析洞察')).toBeInTheDocument();
    expect(screen.getByText(/🏆.*frontend: 80% 匹配度/)).toBeInTheDocument();
  });

  it('handles data point clicks', () => {
    const mockOnClick = jest.fn();
    render(<BarChart {...defaultProps} onDataPointClick={mockOnClick} />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.onClick).toBeDefined();
  });

  it('transforms category data correctly', () => {
    render(<BarChart {...defaultProps} groupBy="category" />);

    const chart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.labels).toEqual(['frontend', 'backend']);
    expect(chartData.datasets[0].data).toEqual([80, 70]);
  });

  it('applies theme colors to chart data', () => {
    render(<BarChart {...defaultProps} />);

    const chart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.datasets[0].backgroundColor).toContain(lightTheme.colors.primary[0]);
  });

  it('configures percentage format for category grouping', () => {
    render(<BarChart {...defaultProps} groupBy="category" />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.scales.y.max).toBe(100);
  });

  it('handles loading state when theme is not provided', () => {
    render(<BarChart {...defaultProps} theme={undefined} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('handles loading state when config is not provided', () => {
    render(<BarChart {...defaultProps} config={undefined} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('enables animations when isVisible is true', () => {
    render(<BarChart {...defaultProps} isVisible={true} />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.animation).toBeTruthy();
  });

  it('disables animations when isVisible is false', () => {
    render(<BarChart {...defaultProps} isVisible={false} />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.animation).toBeFalsy();
  });

  it('shows data labels when showValues is true', () => {
    render(<BarChart {...defaultProps} showValues={true} />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.plugins.datalabels).toBeTruthy();
  });

  it('hides data labels when showValues is false', () => {
    render(<BarChart {...defaultProps} showValues={false} />);

    const chart = screen.getByTestId('bar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.plugins.datalabels).toBeFalsy();
  });
});