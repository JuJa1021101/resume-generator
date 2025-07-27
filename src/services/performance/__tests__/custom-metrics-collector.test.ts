import { CustomMetricsCollector } from '../custom-metrics-collector';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
};

(global as any).performance = mockPerformance;

describe('CustomMetricsCollector', () => {
  let collector: CustomMetricsCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    collector = new CustomMetricsCollector();
  });

  afterEach(() => {
    collector.destroy();
    jest.useRealTimers();
  });

  describe('event tracking', () => {
    it('should start and end events', () => {
      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const eventId = collector.startEvent('ai-processing', 'test-analysis');
      expect(eventId).toBeDefined();

      const duration = collector.endEvent(eventId);
      expect(duration).toBe(500);
    });

    it('should return null for non-existent event', () => {
      const duration = collector.endEvent('non-existent-id');
      expect(duration).toBeNull();
    });

    it('should track active events', () => {
      const eventId1 = collector.startEvent('ai-processing', 'analysis-1');
      const eventId2 = collector.startEvent('chart-render', 'chart-1');

      const activeEvents = collector.getActiveEvents();
      expect(activeEvents).toHaveLength(2);
      expect(activeEvents[0].name).toBe('analysis-1');
      expect(activeEvents[1].name).toBe('chart-1');
    });
  });

  describe('metric updates by event type', () => {
    it('should update AI processing metrics', () => {
      // Clear any existing metrics
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const eventId = collector.startEvent('ai-processing', 'analysis');
      expect(eventId).toBeDefined();

      const duration = collector.endEvent(eventId);
      expect(duration).toBe(500);

      const metrics = collector.getMetrics();
      expect(metrics.aiProcessingTime).toBe(500);
    });

    it('should update model load time for AI processing with model-load metadata', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const eventId = collector.startEvent('ai-processing', 'model-load', { operation: 'model-load' });
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(1000);

      const metrics = collector.getMetrics();
      expect(metrics.modelLoadTime).toBe(1000);
    });

    it('should update component render time', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const eventId = collector.startEvent('component-render', 'MyComponent');
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(100);

      const metrics = collector.getMetrics();
      expect(metrics.componentRenderTime).toBe(100);
    });

    it('should update chart render time', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

      const eventId = collector.startEvent('chart-render', 'BarChart');
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(200);

      const metrics = collector.getMetrics();
      expect(metrics.chartRenderTime).toBe(200);
    });

    it('should update PDF generation time', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(3000);

      const eventId = collector.startEvent('pdf-generation', 'resume-export');
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(2000);

      const metrics = collector.getMetrics();
      expect(metrics.pdfGenerationTime).toBe(2000);
    });

    it('should update database query time', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1050);

      const eventId = collector.startEvent('db-query', 'user-data');
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(50);

      const metrics = collector.getMetrics();
      expect(metrics.dbQueryTime).toBe(50);
    });

    it('should update worker response time', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1800);

      const eventId = collector.startEvent('worker-task', 'ai-analysis');
      const duration = collector.endEvent(eventId);
      expect(duration).toBe(800);

      const metrics = collector.getMetrics();
      expect(metrics.workerResponseTime).toBe(800);
    });
  });

  describe('cache hit rate tracking', () => {
    it('should update cache hit rate for cache hits', () => {
      const eventId = collector.startEvent('cache-operation', 'get-model', { hit: true });
      collector.endEvent(eventId);

      const metrics = collector.getMetrics();
      expect(metrics.cacheHitRate).toBe(100);
    });

    it('should update cache hit rate for cache misses', () => {
      const eventId = collector.startEvent('cache-operation', 'get-model', { miss: true });
      collector.endEvent(eventId);

      const metrics = collector.getMetrics();
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should calculate average cache hit rate', () => {
      // First hit
      let eventId = collector.startEvent('cache-operation', 'get-model-1', { hit: true });
      collector.endEvent(eventId);

      // Then miss
      eventId = collector.startEvent('cache-operation', 'get-model-2', { miss: true });
      collector.endEvent(eventId);

      // Then hit
      eventId = collector.startEvent('cache-operation', 'get-model-3', { hit: true });
      collector.endEvent(eventId);

      const metrics = collector.getMetrics();
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('memory monitoring', () => {
    it('should monitor memory usage', () => {
      collector.clearMetrics();

      // Fast-forward time to trigger memory monitoring
      jest.advanceTimersByTime(5000);

      const metrics = collector.getMetrics();
      expect(metrics.heapUsed).toBe(50 * 1024 * 1024);
      expect(metrics.heapTotal).toBe(100 * 1024 * 1024);
      expect(metrics.jsHeapSizeLimit).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should handle missing memory API gracefully', () => {
      // Remove memory from performance
      delete (performance as any).memory;

      const newCollector = new CustomMetricsCollector();
      jest.advanceTimersByTime(5000);

      const metrics = newCollector.getMetrics();
      expect(metrics.heapUsed).toBeUndefined();

      newCollector.destroy();
    });
  });

  describe('function measurement', () => {
    it('should measure synchronous function', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

      const testFn = jest.fn(() => 'result');
      const result = collector.measureFunction(testFn, 'component-render', 'TestComponent');

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();

      const metrics = collector.getMetrics();
      expect(metrics.componentRenderTime).toBe(200);
    });

    it('should measure asynchronous function', async () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const testFn = jest.fn(async () => {
        return 'async-result';
      });

      const result = await collector.measureFunction(testFn, 'ai-processing', 'AsyncAnalysis');

      expect(result).toBe('async-result');
      expect(testFn).toHaveBeenCalled();

      const metrics = collector.getMetrics();
      expect(metrics.aiProcessingTime).toBe(500);
    });

    it('should handle function errors', () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const testFn = jest.fn(() => {
        throw new Error('Test error');
      });

      expect(() => {
        collector.measureFunction(testFn, 'component-render', 'ErrorComponent');
      }).toThrow('Test error');

      // Should still record the metric
      const metrics = collector.getMetrics();
      expect(metrics.componentRenderTime).toBe(100);
    });

    it('should measure async function with measureAsync', async () => {
      collector.clearMetrics();

      mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const testFn = jest.fn(async () => 'async-result');
      const result = await collector.measureAsync(testFn, 'ai-processing', 'AsyncTest');

      expect(result).toBe('async-result');
      const metrics = collector.getMetrics();
      expect(metrics.aiProcessingTime).toBe(1000);
    });
  });

  describe('callbacks', () => {
    it('should notify callbacks on metric updates', () => {
      const callback = jest.fn();
      collector.onMetricsUpdate(callback);

      const eventId = collector.startEvent('ai-processing', 'test');
      collector.endEvent(eventId);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear metrics', () => {
      const eventId = collector.startEvent('ai-processing', 'test');
      collector.endEvent(eventId);

      collector.clearMetrics();

      const metrics = collector.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });

    it('should destroy properly', () => {
      const callback = jest.fn();
      collector.onMetricsUpdate(callback);

      collector.destroy();

      // Should not trigger callbacks after destroy
      const eventId = collector.startEvent('ai-processing', 'test');
      collector.endEvent(eventId);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});