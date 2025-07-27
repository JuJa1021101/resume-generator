import { performanceMonitor } from '../performance-monitor';
import { performanceStorage } from '../performance-storage';

// Integration tests for the complete performance monitoring system
describe('Performance Monitoring Integration', () => {
  beforeEach(async () => {
    // Clear any existing data
    try {
      await performanceStorage.clearAllData();
    } catch (error) {
      // Ignore errors if storage not initialized
    }
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  describe('end-to-end performance tracking', () => {
    it('should track complete AI processing workflow', async () => {
      // Initialize the performance monitor
      await performanceMonitor.initialize({
        enableWebVitals: true,
        enableCustomMetrics: true,
        enableAutoReporting: false,
        maxEntries: 100
      });

      // Simulate AI processing workflow
      const analysisId = performanceMonitor.startEvent('ai-processing', 'job-analysis', {
        jobId: 'job-123',
        userId: 'user-456'
      });

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = performanceMonitor.endEvent(analysisId);
      expect(duration).toBeGreaterThan(90);

      // Check that metrics were updated
      const customMetrics = performanceMonitor.getCustomMetrics();
      expect(customMetrics.aiProcessingTime).toBeGreaterThan(90);

      // Check that entry was stored
      const entries = await performanceMonitor.getEntries();
      expect(entries.length).toBeGreaterThan(0);

      const aiEntry = entries.find(e => e.operation.includes('ai-processing'));
      expect(aiEntry).toBeDefined();
      expect(aiEntry?.duration).toBeGreaterThan(90);
    });

    it('should track multiple concurrent operations', async () => {
      await performanceMonitor.initialize();

      // Start multiple operations
      const operations = [
        performanceMonitor.startEvent('component-render', 'Dashboard'),
        performanceMonitor.startEvent('chart-render', 'SkillsChart'),
        performanceMonitor.startEvent('db-query', 'user-data')
      ];

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // End all operations
      const durations = operations.map(id => performanceMonitor.endEvent(id));

      // All should have recorded durations
      durations.forEach(duration => {
        expect(duration).toBeGreaterThan(40);
      });

      // Check metrics were updated
      const metrics = performanceMonitor.getCustomMetrics();
      expect(metrics.componentRenderTime).toBeGreaterThan(0);
      expect(metrics.chartRenderTime).toBeGreaterThan(0);
      expect(metrics.dbQueryTime).toBeGreaterThan(0);
    });

    it('should generate and store performance report', async () => {
      await performanceMonitor.initialize();

      // Generate some performance data
      for (let i = 0; i < 5; i++) {
        const eventId = performanceMonitor.startEvent('ai-processing', `analysis-${i}`);
        await new Promise(resolve => setTimeout(resolve, 20));
        performanceMonitor.endEvent(eventId);
      }

      // Generate a report
      const report = await performanceMonitor.generateReport();

      expect(report).toBeDefined();
      expect(report.entries.length).toBeGreaterThan(0);
      expect(report.summary.totalEntries).toBeGreaterThan(0);
      expect(report.summary.averageAIProcessingTime).toBeGreaterThan(0);
      expect(report.webVitals).toBeDefined();
      expect(report.customMetrics).toBeDefined();
    });

    it('should handle cache operations and calculate hit rate', async () => {
      await performanceMonitor.initialize();

      // Simulate cache operations
      const operations = [
        { hit: true },
        { miss: true },
        { hit: true },
        { hit: true },
        { miss: true }
      ];

      for (const op of operations) {
        const eventId = performanceMonitor.startEvent('cache-operation', 'model-cache', op);
        performanceMonitor.endEvent(eventId);
      }

      const metrics = performanceMonitor.getCustomMetrics();
      expect(metrics.cacheHitRate).toBeCloseTo(60, 0); // 3 hits out of 5 = 60%
    });
  });

  describe('performance benchmarking', () => {
    it('should evaluate performance against benchmarks', async () => {
      const customBenchmarks = [
        { operation: 'ai-processing', target: 100, warning: 200, critical: 500 },
        { operation: 'chart-render', target: 50, warning: 100, critical: 200 }
      ];

      await performanceMonitor.initialize({
        benchmarks: customBenchmarks
      });

      // Create operations that exceed benchmarks
      const slowAiId = performanceMonitor.startEvent('ai-processing', 'slow-analysis');
      await new Promise(resolve => setTimeout(resolve, 300)); // Exceeds warning threshold
      performanceMonitor.endEvent(slowAiId);

      const fastChartId = performanceMonitor.startEvent('chart-render', 'fast-chart');
      await new Promise(resolve => setTimeout(resolve, 30)); // Within target
      performanceMonitor.endEvent(fastChartId);

      // Generate report to trigger benchmark evaluation
      const report = await performanceMonitor.generateReport();

      expect(report.benchmarks.length).toBeGreaterThan(0);

      const aiBenchmark = report.benchmarks.find(b => b.operation === 'ai-processing');
      expect(aiBenchmark?.status).toBe('warning'); // Should exceed warning threshold

      const chartBenchmark = report.benchmarks.find(b => b.operation === 'chart-render');
      expect(chartBenchmark?.status).toBe('pass'); // Should be within target
    });
  });

  describe('error handling and recovery', () => {
    it('should handle storage failures gracefully', async () => {
      await performanceMonitor.initialize();

      // Mock storage failure
      const originalStoreEntry = performanceStorage.storeEntry;
      performanceStorage.storeEntry = jest.fn().mockRejectedValue(new Error('Storage full'));

      // Should not throw error
      const eventId = performanceMonitor.startEvent('ai-processing', 'test');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(() => performanceMonitor.endEvent(eventId)).not.toThrow();

      // Restore original method
      performanceStorage.storeEntry = originalStoreEntry;
    });

    it('should continue working after configuration updates', async () => {
      await performanceMonitor.initialize();

      // Track some events
      let eventId = performanceMonitor.startEvent('ai-processing', 'before-config');
      performanceMonitor.endEvent(eventId);

      // Update configuration
      await performanceMonitor.updateConfig({
        maxEntries: 500,
        enableAutoReporting: true
      });

      // Should still work after config update
      eventId = performanceMonitor.startEvent('ai-processing', 'after-config');
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = performanceMonitor.endEvent(eventId);

      expect(duration).toBeGreaterThan(0);

      const entries = await performanceMonitor.getEntries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('data persistence and retrieval', () => {
    it('should persist data across monitor instances', async () => {
      // First instance
      await performanceMonitor.initialize();

      const eventId = performanceMonitor.startEvent('ai-processing', 'persistent-test');
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMonitor.endEvent(eventId);

      // Get entries from first instance
      const entriesBefore = await performanceMonitor.getEntries();
      expect(entriesBefore.length).toBeGreaterThan(0);

      performanceMonitor.destroy();

      // Create new instance
      const newMonitor = new (performanceMonitor.constructor as any)();
      await newMonitor.initialize();

      // Should be able to retrieve data from previous instance
      const entriesAfter = await newMonitor.getEntries();
      expect(entriesAfter.length).toBe(entriesBefore.length);

      newMonitor.destroy();
    });

    it('should handle large amounts of performance data', async () => {
      await performanceMonitor.initialize({ maxEntries: 50 });

      // Generate more entries than maxEntries
      for (let i = 0; i < 60; i++) {
        const eventId = performanceMonitor.startEvent('ai-processing', `bulk-test-${i}`);
        performanceMonitor.endEvent(eventId);
      }

      // Should not exceed maxEntries due to cleanup
      const entries = await performanceMonitor.getEntries();
      expect(entries.length).toBeLessThanOrEqual(50);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical resume generation workflow', async () => {
      await performanceMonitor.initialize();

      // Simulate complete resume generation workflow
      const workflow = [
        { type: 'page-load', name: 'dashboard', duration: 1500 },
        { type: 'user-interaction', name: 'jd-input', duration: 50 },
        { type: 'ai-processing', name: 'jd-analysis', duration: 3000 },
        { type: 'component-render', name: 'results-display', duration: 200 },
        { type: 'chart-render', name: 'skills-radar', duration: 300 },
        { type: 'pdf-generation', name: 'resume-export', duration: 2000 }
      ];

      for (const step of workflow) {
        const eventId = performanceMonitor.startEvent(step.type as any, step.name);
        await new Promise(resolve => setTimeout(resolve, Math.min(step.duration / 10, 100)));
        performanceMonitor.endEvent(eventId);
      }

      // Generate comprehensive report
      const report = await performanceMonitor.generateReport();

      expect(report.entries.length).toBe(workflow.length);
      expect(report.summary.totalEntries).toBe(workflow.length);
      expect(report.recommendations.length).toBeGreaterThan(0);

      // Check that all workflow steps were captured
      workflow.forEach(step => {
        const entry = report.entries.find(e => e.operation.includes(step.name));
        expect(entry).toBeDefined();
      });
    });
  });
});