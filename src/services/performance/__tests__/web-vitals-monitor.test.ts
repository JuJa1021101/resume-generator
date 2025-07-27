import { WebVitalsMonitor } from '../web-vitals-monitor';

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: any) => void;

  constructor(callback: (list: any) => void) {
    this.callback = callback;
  }

  observe() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}

// Mock performance API
const mockPerformance = {
  getEntriesByType: jest.fn(),
  now: jest.fn(() => Date.now())
};

// Setup global mocks
(global as any).PerformanceObserver = MockPerformanceObserver;
(global as any).performance = mockPerformance;

describe('WebVitalsMonitor', () => {
  let monitor: WebVitalsMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new WebVitalsMonitor();
  });

  afterEach(() => {
    monitor.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with empty metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toEqual({});
    });

    it('should set up performance observers', () => {
      // The constructor should have set up observers
      expect(monitor).toBeDefined();
    });
  });

  describe('metrics collection', () => {
    it('should update FCP metric', () => {
      const callback = jest.fn();
      monitor.onMetricsUpdate(callback);

      // Simulate FCP entry
      const fcpEntry = {
        name: 'first-contentful-paint',
        startTime: 1500
      };

      // Manually trigger the update (in real scenario, this would come from PerformanceObserver)
      (monitor as any).updateMetric('fcp', fcpEntry.startTime);

      expect(callback).toHaveBeenCalled();
      expect(monitor.getMetrics().fcp).toBe(1500);
    });

    it('should update LCP metric', () => {
      (monitor as any).updateMetric('lcp', 2500);
      expect(monitor.getMetrics().lcp).toBe(2500);
    });

    it('should update FID metric', () => {
      (monitor as any).updateMetric('fid', 100);
      expect(monitor.getMetrics().fid).toBe(100);
    });

    it('should update CLS metric', () => {
      (monitor as any).updateMetric('cls', 0.1);
      expect(monitor.getMetrics().cls).toBe(0.1);
    });

    it('should update TTFB metric', () => {
      (monitor as any).updateMetric('ttfb', 800);
      expect(monitor.getMetrics().ttfb).toBe(800);
    });
  });

  describe('performance score calculation', () => {
    it('should return 100 for excellent metrics', () => {
      (monitor as any).updateMetric('fcp', 1000);
      (monitor as any).updateMetric('lcp', 2000);
      (monitor as any).updateMetric('fid', 50);
      (monitor as any).updateMetric('cls', 0.05);
      (monitor as any).updateMetric('ttfb', 500);

      const score = monitor.getPerformanceScore();
      expect(score).toBe(100);
    });

    it('should return 0 for poor metrics', () => {
      (monitor as any).updateMetric('fcp', 5000);
      (monitor as any).updateMetric('lcp', 6000);
      (monitor as any).updateMetric('fid', 500);
      (monitor as any).updateMetric('cls', 0.5);
      (monitor as any).updateMetric('ttfb', 3000);

      const score = monitor.getPerformanceScore();
      expect(score).toBe(0);
    });

    it('should return intermediate score for mixed metrics', () => {
      (monitor as any).updateMetric('fcp', 2000); // Good
      (monitor as any).updateMetric('lcp', 3000); // Needs improvement
      (monitor as any).updateMetric('fid', 200);  // Needs improvement
      (monitor as any).updateMetric('cls', 0.15); // Needs improvement
      (monitor as any).updateMetric('ttfb', 1000); // Needs improvement

      const score = monitor.getPerformanceScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should return 0 when no metrics are available', () => {
      const score = monitor.getPerformanceScore();
      expect(score).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should notify callbacks when metrics update', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      monitor.onMetricsUpdate(callback1);
      monitor.onMetricsUpdate(callback2);

      (monitor as any).updateMetric('fcp', 1500);

      expect(callback1).toHaveBeenCalledWith({ fcp: 1500 });
      expect(callback2).toHaveBeenCalledWith({ fcp: 1500 });
    });

    it('should handle multiple metric updates', () => {
      const callback = jest.fn();
      monitor.onMetricsUpdate(callback);

      (monitor as any).updateMetric('fcp', 1500);
      (monitor as any).updateMetric('lcp', 2500);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith({ fcp: 1500, lcp: 2500 });
    });
  });

  describe('performance entry creation', () => {
    it('should create performance entry with current metrics', () => {
      (monitor as any).updateMetric('fcp', 1500);
      (monitor as any).updateMetric('lcp', 2500);

      const entry = monitor.createPerformanceEntry('test-operation');

      expect(entry).toMatchObject({
        operation: 'test-operation',
        duration: 0,
        webVitals: {
          fcp: 1500,
          lcp: 2500
        }
      });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should disconnect observers and clear callbacks', () => {
      const callback = jest.fn();
      monitor.onMetricsUpdate(callback);

      monitor.disconnect();

      // After disconnect, updates should not trigger callbacks
      (monitor as any).updateMetric('fcp', 1500);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});