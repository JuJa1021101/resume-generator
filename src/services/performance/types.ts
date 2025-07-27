// Performance monitoring types
export interface WebVitalsMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte

  // Additional metrics
  tti: number; // Time to Interactive
  tbt: number; // Total Blocking Time
  si: number; // Speed Index
}

export interface CustomPerformanceMetrics {
  // AI processing metrics
  aiProcessingTime: number;
  modelLoadTime: number;
  analysisTime: number;

  // UI metrics
  componentRenderTime: number;
  chartRenderTime: number;
  pdfGenerationTime: number;

  // Data metrics
  cacheHitRate: number;
  dbQueryTime: number;
  workerResponseTime: number;

  // Memory metrics
  heapUsed: number;
  heapTotal: number;
  jsHeapSizeLimit: number;
}

export interface PerformanceEntry {
  id: string;
  timestamp: number;
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
  webVitals?: Partial<WebVitalsMetrics>;
  customMetrics?: Partial<CustomPerformanceMetrics>;
}

export interface PerformanceBenchmark {
  operation: string;
  target: number; // Target time in ms
  warning: number; // Warning threshold in ms
  critical: number; // Critical threshold in ms
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: PerformanceSummary;
  webVitals: WebVitalsMetrics;
  customMetrics: CustomPerformanceMetrics;
  entries: PerformanceEntry[];
  benchmarks: PerformanceBenchmarkResult[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceSummary {
  totalEntries: number;
  averageLoadTime: number;
  averageAIProcessingTime: number;
  cacheEfficiency: number;
  performanceScore: number; // 0-100
  regressionDetected: boolean;
}

export interface PerformanceBenchmarkResult {
  operation: string;
  current: number;
  target: number;
  status: 'pass' | 'warning' | 'critical';
  improvement: number; // Percentage improvement needed
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'regression' | 'warning';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface PerformanceConfig {
  enableWebVitals: boolean;
  enableCustomMetrics: boolean;
  enableAutoReporting: boolean;
  reportingInterval: number; // in ms
  maxEntries: number;
  benchmarks: PerformanceBenchmark[];
}

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'threshold' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  operation: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

// Event types for performance tracking
export type PerformanceEventType =
  | 'page-load'
  | 'component-render'
  | 'ai-processing'
  | 'pdf-generation'
  | 'chart-render'
  | 'cache-operation'
  | 'db-query'
  | 'worker-task'
  | 'user-interaction';

export interface PerformanceEvent {
  type: PerformanceEventType;
  name: string;
  startTime: number;
  endTime?: number;
  metadata?: Record<string, unknown>;
}