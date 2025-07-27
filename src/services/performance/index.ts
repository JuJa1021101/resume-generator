// Performance monitoring service exports
export { performanceMonitor } from './performance-monitor';
export { webVitalsMonitor } from './web-vitals-monitor';
export { customMetricsCollector } from './custom-metrics-collector';
export { performanceStorage } from './performance-storage';
export { benchmarkRunner } from './benchmark-runner';
export { reportGenerator } from './report-generator';

// Type exports
export type {
  WebVitalsMetrics,
  CustomPerformanceMetrics,
  PerformanceEntry,
  PerformanceBenchmark,
  PerformanceBenchmarkResult,
  PerformanceReport,
  PerformanceSummary,
  PerformanceRecommendation,
  PerformanceAlert,
  PerformanceConfig,
  PerformanceEvent,
  PerformanceEventType
} from './types';

// Performance monitoring utilities
export const createPerformanceDecorator = (
  type: string,
  name: string,
  metadata?: Record<string, unknown>
) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const eventId = performanceMonitor.startEvent(type as any, `${name}.${propertyKey}`, metadata);

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endEvent(eventId);
        return result;
      } catch (error) {
        performanceMonitor.endEvent(eventId);
        throw error;
      }
    };

    return descriptor;
  };
};

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startEvent: performanceMonitor.startEvent.bind(performanceMonitor),
    endEvent: performanceMonitor.endEvent.bind(performanceMonitor),
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getWebVitals: performanceMonitor.getWebVitals.bind(performanceMonitor),
    getCustomMetrics: performanceMonitor.getCustomMetrics.bind(performanceMonitor),
    getPerformanceScore: performanceMonitor.getPerformanceScore.bind(performanceMonitor)
  };
};