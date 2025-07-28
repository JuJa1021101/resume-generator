import { MatchResult } from '../../types';

// Base chart configuration
export interface ChartConfig {
  width: number;
  height: number;
  responsive: boolean;
  maintainAspectRatio: boolean;
  animations: boolean;
  theme: ChartTheme;
  interactive: boolean;
}

// Chart theme configuration
export interface ChartTheme {
  name: 'light' | 'dark';
  colors: {
    primary: string[];
    secondary: string[];
    background: string;
    text: string;
    grid: string;
    accent: string;
  };
  fonts: {
    family: string;
    size: {
      small: number;
      medium: number;
      large: number;
    };
  };
}

// Base props for all chart components
export interface ChartProps {
  data: MatchResult;
  config?: Partial<ChartConfig>;
  className?: string;
  onDataPointClick?: (data: any) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
}

// Radar chart specific props
export interface RadarChartProps extends ChartProps {
  showLabels?: boolean;
  showGrid?: boolean;
  maxValue?: number;
  fillOpacity?: number;
}

// Bar chart specific props
export interface BarChartProps extends ChartProps {
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  groupBy?: 'category' | 'priority';
  sortBy?: 'importance' | 'gap' | 'name';
}

// Trend chart specific props
export interface TrendChartProps extends ChartProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  showTrendLine?: boolean;
  compareWith?: MatchResult[];
}

// Chart data transformation interfaces
export interface RadarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    pointBackgroundColor: string;
    pointBorderColor: string;
    pointRadius: number;
    fill: boolean;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
    borderRadius?: number;
  }[];
}

// D3 specific types
export interface D3ChartData {
  name: string;
  value: number;
  category: string;
  color?: string;
  metadata?: any;
}

export interface D3ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Export configuration
export interface ExportConfig {
  format: 'png' | 'svg' | 'pdf';
  quality?: number;
  filename?: string;
  includeTitle?: boolean;
  includeData?: boolean;
}

// Animation configuration
export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
  stagger?: number;
}