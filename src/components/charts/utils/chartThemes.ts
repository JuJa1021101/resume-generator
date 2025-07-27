import { ChartTheme } from '../types';

// Light theme configuration
export const lightTheme: ChartTheme = {
  name: 'light',
  colors: {
    primary: [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
    ],
    secondary: [
      '#93C5FD', // blue-300
      '#6EE7B7', // emerald-300
      '#FCD34D', // amber-300
      '#FCA5A5', // red-300
      '#C4B5FD', // violet-300
      '#67E8F9', // cyan-300
      '#BEF264', // lime-300
      '#FDBA74', // orange-300
    ],
    background: '#FFFFFF',
    text: '#1F2937', // gray-800
    grid: '#E5E7EB', // gray-200
    accent: '#6366F1', // indigo-500
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    size: {
      small: 12,
      medium: 14,
      large: 16,
    },
  },
};

// Dark theme configuration
export const darkTheme: ChartTheme = {
  name: 'dark',
  colors: {
    primary: [
      '#60A5FA', // blue-400
      '#34D399', // emerald-400
      '#FBBF24', // amber-400
      '#F87171', // red-400
      '#A78BFA', // violet-400
      '#22D3EE', // cyan-400
      '#A3E635', // lime-400
      '#FB923C', // orange-400
    ],
    secondary: [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
    ],
    background: '#1F2937', // gray-800
    text: '#F9FAFB', // gray-50
    grid: '#374151', // gray-700
    accent: '#818CF8', // indigo-400
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    size: {
      small: 12,
      medium: 14,
      large: 16,
    },
  },
};

// Default chart configuration
export const defaultChartConfig = {
  width: 400,
  height: 300,
  responsive: true,
  maintainAspectRatio: true,
  animations: true,
  theme: lightTheme,
  interactive: true,
};

// Get theme by name
export const getTheme = (themeName: 'light' | 'dark'): ChartTheme => {
  return themeName === 'dark' ? darkTheme : lightTheme;
};

// Generate color palette for data
export const generateColorPalette = (
  count: number,
  theme: ChartTheme,
  type: 'primary' | 'secondary' = 'primary'
): string[] => {
  const colors = theme.colors[type];
  const palette: string[] = [];

  for (let i = 0; i < count; i++) {
    palette.push(colors[i % colors.length]);
  }

  return palette;
};

// Create gradient colors
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  startColor: string,
  endColor: string,
  direction: 'horizontal' | 'vertical' = 'vertical'
): CanvasGradient => {
  const gradient = direction === 'vertical'
    ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);

  return gradient;
};