import {
  PerformanceConfig,
  PerformanceEntry,
  PerformanceEventType,
  PerformanceAlert,
  PerformanceReport
} from './types';
import { webVitalsMonitor } from './web-vitals-monitor';
import { customMetricsCollector } from './custom-metrics-collector';
import { performanceStorage } from './performance-storage';
import { benchmarkRunner } from './benchmark-runner';
import { reportGenerator } from './report-generator';

// Main performance monitoring service
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private isInitialized = false;
  private reportingInterval?: number;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): PerformanceConfig {
    return {
      enableWebVitals: true,
      enableCustomMetrics: true,
      enableAutoReporting: true,
      reportingInterval: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      benchmarks: [
        { operation: 'page-load', target: 2000, warning: 3000, critical: 5000 },
        { operation: 'ai-processing', target: 5000, warning: 8000, critical: 15000 },
        { operation: 'pdf-generation', target: 3000, warning: 5000, critical: 10000 },
        { operation: 'chart-render', target: 500, warning: 1000, critical: 2000 },
        { operation: 'component-render', target: 100, warning: 200, critical: 500 },
        { operation: 'db-query', target: 50, warning: 100, critical: 300 },
        { operation: 'worker-task', target: 1000, warning: 2000, critical: 5000 }
      ]
    };
  }

  public async initialize(config?: Partial<PerformanceConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Performance monitor already initialized');
      return;
    }

    try {
      // Initialize storage
      await performanceStorage.initialize();

      // Load saved config or use provided config
      const savedConfig = await performanceStorage.getConfig();
      this.config = { ...this.config, ...savedConfig, ...config };

      // Save updated config
      await performanceStorage.storeConfig(this.config);

      // Set up benchmarks
      benchmarkRunner.setBenchmarks(this.config.benchmarks);

      // Set up alert handling
      benchmarkRunner.onAlert((alert) => this.handleAlert(alert));

      // Set up Web Vitals monitoring
      if (this.config.enableWebVitals) {
        webVitalsMonitor.onMetricsUpdate((metrics) => {
          this.recordEntry('web-vitals-update', 0, { webVitals: metrics });
        });
      }

      // Set up custom metrics monitoring
      if (this.config.enableCustomMetrics) {
        customMetricsCollector.onMetricsUpdate((metrics) => {
          this.recordEntry('custom-metrics-update', 0, { customMetrics: metrics });
        });
      }

      // Set up auto reporting
      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      }

      this.isInitialized = true;
      console.log('Performance monitor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize performance monitor:', error);
      throw error;
    }
  }

  private startAutoReporting(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    this.reportingInterval = window.setInterval(async () => {
      try {
        await this.generateAndStoreReport();
      } catch (error) {
        console.error('Auto reporting failed:', error);
      }
    }, this.config.reportingInterval);
  }

  private async generateAndStoreReport(): Promise<void> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.config.reportingInterval);

    await reportGenerator.generateReport(startTime, endTime);

    // Check for regressions and anomalies
    const entries = await performanceStorage.getEntries(startTime.getTime(), endTime.getTime());
    await benchmarkRunner.detectRegressions(entries);
    await benchmarkRunner.detectAnomalies(entries);
  }

  // Public API methods
  public startEvent(
    type: PerformanceEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): string {
    if (!this.isInitialized) {
      console.warn('Performance monitor not initialized');
      return '';
    }

    return customMetricsCollector.startEvent(type, name, metadata);
  }

  public endEvent(eventId: string): number | null {
    if (!this.isInitialized) {
      console.warn('Performance monitor not initialized');
      return null;
    }

    const duration = customMetricsCollector.endEvent(eventId);

    if (duration !== null) {
      // Record the completed event
      this.recordEntry(`event-${eventId}`, duration);
    }

    return duration;
  }

  public measureFunction<T>(
    fn: () => T | Promise<T>,
    type: PerformanceEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): T | Promise<T> {
    if (!this.isInitialized) {
      console.warn('Performance monitor not initialized');
      return fn();
    }

    return customMetricsCollector.measureFunction(fn, type, name, metadata);
  }

  public async measureAsync<T>(
    fn: () => Promise<T>,
    type: PerformanceEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isInitialized) {
      console.warn('Performance monitor not initialized');
      return fn();
    }

    return customMetricsCollector.measureAsync(fn, type, name, metadata);
  }

  private async recordEntry(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const entry: PerformanceEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      operation,
      duration,
      metadata,
      webVitals: this.config.enableWebVitals ? webVitalsMonitor.getMetrics() : undefined,
      customMetrics: this.config.enableCustomMetrics ? customMetricsCollector.getMetrics() : undefined
    };

    try {
      await performanceStorage.storeEntry(entry);
    } catch (error) {
      console.error('Failed to store performance entry:', error);
    }
  }

  // Reporting methods
  public async generateReport(startTime?: Date, endTime?: Date): Promise<PerformanceReport> {
    if (!this.isInitialized) {
      throw new Error('Performance monitor not initialized');
    }

    const end = endTime || new Date();
    const start = startTime || new Date(end.getTime() - 24 * 60 * 60 * 1000); // Default to last 24 hours

    return reportGenerator.generateReport(start, end);
  }

  public async getDailyReport(): Promise<PerformanceReport> {
    return reportGenerator.generateDailyReport();
  }

  public async getWeeklyReport(): Promise<PerformanceReport> {
    return reportGenerator.generateWeeklyReport();
  }

  // Configuration methods
  public async updateConfig(updates: Partial<PerformanceConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await performanceStorage.storeConfig(this.config);

    // Update benchmarks if changed
    if (updates.benchmarks) {
      benchmarkRunner.setBenchmarks(updates.benchmarks);
    }

    // Restart auto reporting if interval changed
    if (updates.enableAutoReporting !== undefined || updates.reportingInterval) {
      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      } else if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
        this.reportingInterval = undefined;
      }
    }
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  // Alert handling
  private async handleAlert(alert: PerformanceAlert): Promise<void> {
    console.warn('Performance alert:', alert);
    this.notifyAlertCallbacks(alert);
  }

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private notifyAlertCallbacks(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  // Data access methods
  public async getEntries(
    startTime?: number,
    endTime?: number,
    operation?: string
  ): Promise<PerformanceEntry[]> {
    return performanceStorage.getEntries(startTime, endTime, operation);
  }

  public async getAlerts(severity?: string, limit?: number): Promise<PerformanceAlert[]> {
    return performanceStorage.getAlerts(severity, limit);
  }

  public getWebVitals() {
    return webVitalsMonitor.getMetrics();
  }

  public getCustomMetrics() {
    return customMetricsCollector.getMetrics();
  }

  public getPerformanceScore(): number {
    return webVitalsMonitor.getPerformanceScore();
  }

  // Utility methods
  public async clearData(): Promise<void> {
    await performanceStorage.clearAllData();
    customMetricsCollector.clearMetrics();
    benchmarkRunner.clearBaseline();
  }

  public async getStorageStats() {
    return performanceStorage.getStorageStats();
  }

  public destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    webVitalsMonitor.disconnect();
    customMetricsCollector.destroy();

    this.isInitialized = false;
    this.alertCallbacks = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();