import { PerformanceMonitor } from '../performance-monitor';
import { performanceStorage } from '../performance-storage';
import { webVitalsMonitor } from '../web-vitals-monitor';
import { customMetricsCollector } from '../custom-metrics-collector';
import { benchmarkRunner } from '../benchmark-runner';

// Mock dependencies
jest.mock('../performance-storage');
jest.mock('../web-vitals-monitor');
jest.mock('../custom-metrics-collector');
jest.mock('../benchmark-runner');

const mockPerformanceStorage = performanceStorage as jest.Mocked<typeof performanceStorage>;
const mockWebVitalsMonitor = webVitalsMonitor as jest.Mocked<typeof webVitalsMonitor>;
const mockCustomMetricsCollector = customMetricsCollector as jest.Mocked<typeof customMetricsCollector>;
const mockBenchmarkRunner = benchmarkRunner as jest.Mocked<typeof benchmarkRunner>;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new PerformanceMonitor();

    // Setup default mocks
    mockPerformanceStorage.initialize.mockResolvedValue();
    mockPerformanceStorage.getConfig.mockResolvedValue(null);
    mockPerformanceStorage.storeConfig.mockResolvedValue();
    mockPerformanceStorage.storeEntry.mockResolvedValue();
    mockWebVitalsMonitor.getMetrics.mockReturnValue({});
    mockCustomMetricsCollector.getMetrics.mockReturnValue({});
    mockWebVitalsMonitor.getPerformanceScore.mockReturnValue(85);
  });

  describe('initialization', () => {
    it('should initialize successfully with default config', async () => {
      await monitor.initialize();

      expect(mockPerformanceStorage.initialize).toHaveBeenCalled();
      expect(mockPerformanceStorage.storeConfig).toHaveBeenCalled();
      expect(mockBenchmarkRunner.setBenchmarks).toHaveBeenCalled();
    });

    it('should initialize with custom config', async () => {
      const customConfig = {
        enableWebVitals: false,
        maxEntries: 500
      };

      await monitor.initialize(customConfig);

      expect(mockPerformanceStorage.storeConfig).toHaveBeenCalledWith(
        expect.objectContaining(customConfig)
      );
    });

    it('should load saved config', async () => {
      const savedConfig = {
        enableWebVitals: true,
        enableCustomMetrics: true,
        enableAutoReporting: false,
        reportingInterval: 10000,
        maxEntries: 2000,
        benchmarks: []
      };

      mockPerformanceStorage.getConfig.mockResolvedValue(savedConfig);

      await monitor.initialize();

      expect(monitor.getConfig()).toMatchObject(savedConfig);
    });

    it('should handle initialization errors', async () => {
      mockPerformanceStorage.initialize.mockRejectedValue(new Error('Storage error'));

      await expect(monitor.initialize()).rejects.toThrow('Storage error');
    });

    it('should not initialize twice', async () => {
      await monitor.initialize();
      await monitor.initialize();

      expect(mockPerformanceStorage.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('event tracking', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it('should start and end events', () => {
      mockCustomMetricsCollector.startEvent.mockReturnValue('event-123');
      mockCustomMetricsCollector.endEvent.mockReturnValue(500);

      const eventId = monitor.startEvent('ai-processing', 'test-analysis');
      expect(eventId).toBe('event-123');
      expect(mockCustomMetricsCollector.startEvent).toHaveBeenCalledWith(
        'ai-processing',
        'test-analysis',
        undefined
      );

      const duration = monitor.endEvent(eventId);
      expect(duration).toBe(500);
      expect(mockCustomMetricsCollector.endEvent).toHaveBeenCalledWith(eventId);
    });

    it('should handle events when not initialized', () => {
      const uninitializedMonitor = new PerformanceMonitor();

      const eventId = uninitializedMonitor.startEvent('ai-processing', 'test');
      expect(eventId).toBe('');

      const duration = uninitializedMonitor.endEvent('some-id');
      expect(duration).toBeNull();
    });

    it('should measure functions', () => {
      const testFn = jest.fn(() => 'result');
      mockCustomMetricsCollector.measureFunction.mockReturnValue('result');

      const result = monitor.measureFunction(testFn, 'component-render', 'TestComponent');

      expect(result).toBe('result');
      expect(mockCustomMetricsCollector.measureFunction).toHaveBeenCalledWith(
        testFn,
        'component-render',
        'TestComponent',
        undefined
      );
    });

    it('should measure async functions', async () => {
      const testFn = jest.fn(async () => 'async-result');
      mockCustomMetricsCollector.measureAsync.mockResolvedValue('async-result');

      const result = await monitor.measureAsync(testFn, 'ai-processing', 'AsyncTest');

      expect(result).toBe('async-result');
      expect(mockCustomMetricsCollector.measureAsync).toHaveBeenCalledWith(
        testFn,
        'ai-processing',
        'AsyncTest',
        undefined
      );
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it('should update configuration', async () => {
      const updates = {
        enableWebVitals: false,
        maxEntries: 2000
      };

      await monitor.updateConfig(updates);

      expect(mockPerformanceStorage.storeConfig).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      );
    });

    it('should update benchmarks when config changes', async () => {
      const newBenchmarks = [
        { operation: 'test-op', target: 1000, warning: 1500, critical: 2000 }
      ];

      await monitor.updateConfig({ benchmarks: newBenchmarks });

      expect(mockBenchmarkRunner.setBenchmarks).toHaveBeenCalledWith(newBenchmarks);
    });

    it('should get current configuration', () => {
      const config = monitor.getConfig();
      expect(config).toBeDefined();
      expect(config.enableWebVitals).toBeDefined();
      expect(config.enableCustomMetrics).toBeDefined();
    });
  });

  describe('data access', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it('should get performance entries', async () => {
      const mockEntries = [
        { id: '1', timestamp: 1000, operation: 'test', duration: 100 }
      ];
      mockPerformanceStorage.getEntries.mockResolvedValue(mockEntries as any);

      const entries = await monitor.getEntries(1000, 2000, 'test');

      expect(entries).toBe(mockEntries);
      expect(mockPerformanceStorage.getEntries).toHaveBeenCalledWith(1000, 2000, 'test');
    });

    it('should get alerts', async () => {
      const mockAlerts = [
        { id: '1', type: 'threshold', severity: 'high', message: 'Test alert' }
      ];
      mockPerformanceStorage.getAlerts.mockResolvedValue(mockAlerts as any);

      const alerts = await monitor.getAlerts('high', 10);

      expect(alerts).toBe(mockAlerts);
      expect(mockPerformanceStorage.getAlerts).toHaveBeenCalledWith('high', 10);
    });

    it('should get web vitals', () => {
      const mockVitals = { fcp: 1500, lcp: 2500 };
      mockWebVitalsMonitor.getMetrics.mockReturnValue(mockVitals);

      const vitals = monitor.getWebVitals();

      expect(vitals).toBe(mockVitals);
    });

    it('should get custom metrics', () => {
      const mockMetrics = { aiProcessingTime: 3000 };
      mockCustomMetricsCollector.getMetrics.mockReturnValue(mockMetrics);

      const metrics = monitor.getCustomMetrics();

      expect(metrics).toBe(mockMetrics);
    });

    it('should get performance score', () => {
      const score = monitor.getPerformanceScore();

      expect(score).toBe(85);
      expect(mockWebVitalsMonitor.getPerformanceScore).toHaveBeenCalled();
    });
  });

  describe('alert handling', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it('should register alert callbacks', () => {
      const callback = jest.fn();
      monitor.onAlert(callback);

      // Simulate alert from benchmark runner
      const mockAlert = {
        id: 'alert-1',
        type: 'threshold' as const,
        severity: 'high' as const,
        message: 'Test alert',
        operation: 'test-op',
        value: 2000,
        threshold: 1500,
        timestamp: new Date()
      };

      // Get the callback that was registered with benchmarkRunner
      const benchmarkCallback = mockBenchmarkRunner.onAlert.mock.calls[0][0];
      benchmarkCallback(mockAlert);

      expect(callback).toHaveBeenCalledWith(mockAlert);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it('should clear all data', async () => {
      await monitor.clearData();

      expect(mockPerformanceStorage.clearAllData).toHaveBeenCalled();
      expect(mockCustomMetricsCollector.clearMetrics).toHaveBeenCalled();
      expect(mockBenchmarkRunner.clearBaseline).toHaveBeenCalled();
    });

    it('should get storage stats', async () => {
      const mockStats = {
        entriesCount: 100,
        reportsCount: 5,
        alertsCount: 10,
        estimatedSize: 50000
      };
      mockPerformanceStorage.getStorageStats.mockResolvedValue(mockStats);

      const stats = await monitor.getStorageStats();

      expect(stats).toBe(mockStats);
    });

    it('should destroy properly', () => {
      monitor.destroy();

      expect(mockWebVitalsMonitor.disconnect).toHaveBeenCalled();
      expect(mockCustomMetricsCollector.destroy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      await monitor.initialize();

      mockPerformanceStorage.storeEntry.mockRejectedValue(new Error('Storage error'));

      // Should not throw when storing entry fails
      const eventId = monitor.startEvent('test', 'test');
      monitor.endEvent(eventId);

      // Error should be logged but not thrown
      expect(mockPerformanceStorage.storeEntry).toHaveBeenCalled();
    });

    it('should handle report generation errors', async () => {
      await monitor.initialize({ enableAutoReporting: true, reportingInterval: 1000 });

      // Mock report generation to fail
      jest.spyOn(console, 'error').mockImplementation();

      // Fast forward time to trigger auto reporting
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      // Should handle errors gracefully
      expect(console.error).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});