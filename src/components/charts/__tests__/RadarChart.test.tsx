import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RadarChart from '../RadarChart';
import { lightTheme, defaultChartConfig } from '../utils/chartThemes';
import { MatchResult } from '../../../types';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Radar: React.forwardRef(({ data, options, ...props }: any, ref: any) => (
    <div
      data-testid="radar-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      ref={ref}
      {...props}
    >
      Radar Chart
    </div>
  )),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  RadialLinearScale: {},
  PointElement: {},
  LineElement: {},
  Filler: {},
  Tooltip: {},
  Legend: {},
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('RadarChart', () => {
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
      {
        category: 'database',
        score: 60,
        maxScore: 100,
        skillCount: 5,
        matchedSkills: 3,
      },
    ],
    gaps: [],
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

  it('renders radar chart correctly', () => {
    render(<RadarChart {...defaultProps} />);

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('displays overall score', () => {
    render(<RadarChart {...defaultProps} />);

    expect(screen.getByText('总体匹配度: 75%')).toBeInTheDocument();
  });

  it('shows category labels when showLabels is true', () => {
    render(<RadarChart {...defaultProps} showLabels={true} />);

    expect(screen.getByText(/frontend: 80%/)).toBeInTheDocument();
    expect(screen.getByText(/backend: 70%/)).toBeInTheDocument();
    expect(screen.getByText(/database: 60%/)).toBeInTheDocument();
  });

  it('hides category labels when showLabels is false', () => {
    render(<RadarChart {...defaultProps} showLabels={false} />);

    expect(screen.queryByText(/frontend: 80%/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RadarChart {...defaultProps} className="custom-radar" />
    );

    expect(container.firstChild).toHaveClass('custom-radar');
  });

  it('handles data point clicks', () => {
    const mockOnClick = jest.fn();
    render(<RadarChart {...defaultProps} onDataPointClick={mockOnClick} />);

    const chart = screen.getByTestId('radar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.onClick).toBeDefined();
  });

  it('shows export button when onExport is provided', () => {
    const mockOnExport = jest.fn();
    render(<RadarChart {...defaultProps} onExport={mockOnExport} />);

    expect(screen.getByTitle('导出为PNG')).toBeInTheDocument();
  });

  it('handles export button click', () => {
    const mockOnExport = jest.fn();
    render(<RadarChart {...defaultProps} onExport={mockOnExport} />);

    const exportButton = screen.getByTitle('导出为PNG');
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith('png');
  });

  it('transforms data correctly for radar chart', () => {
    render(<RadarChart {...defaultProps} />);

    const chart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.labels).toEqual(['frontend', 'backend', 'database']);
    expect(chartData.datasets[0].data).toEqual([80, 70, 60]);
  });

  it('applies fill opacity correctly', () => {
    render(<RadarChart {...defaultProps} fillOpacity={0.5} />);

    const chart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.datasets[0].backgroundColor).toContain('0.5');
  });

  it('sets max value correctly', () => {
    render(<RadarChart {...defaultProps} maxValue={120} />);

    const chart = screen.getByTestId('radar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.scales.r.max).toBe(120);
  });

  it('handles loading state when theme is not provided', () => {
    render(<RadarChart {...defaultProps} theme={undefined} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('handles loading state when config is not provided', () => {
    render(<RadarChart {...defaultProps} config={undefined} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('applies theme colors to chart data', () => {
    render(<RadarChart {...defaultProps} />);

    const chart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.datasets[0].borderColor).toBe(lightTheme.colors.primary[0]);
  });

  it('configures chart options based on theme', () => {
    render(<RadarChart {...defaultProps} />);

    const chart = screen.getByTestId('radar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.plugins.legend.labels.color).toBe(lightTheme.colors.text);
    expect(chartOptions.scales.r.pointLabels.color).toBe(lightTheme.colors.text);
  });

  it('enables animations when isVisible is true', () => {
    render(<RadarChart {...defaultProps} isVisible={true} />);

    const chart = screen.getByTestId('radar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.animation).toBeTruthy();
  });

  it('disables animations when isVisible is false', () => {
    render(<RadarChart {...defaultProps} isVisible={false} />);

    const chart = screen.getByTestId('radar-chart');
    const chartOptions = JSON.parse(chart.getAttribute('data-chart-options') || '{}');

    expect(chartOptions.animation).toBeFalsy();
  });
});