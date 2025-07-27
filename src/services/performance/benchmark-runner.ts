import {
  PerformanceBenchmark,
  PerformanceBenchmarkResult,
  PerformanceAlert,
  PerformanceEntry
} from './types';
import { performanceStorage } from './performance-storage';

export class BenchmarkRunner {
  private benchmarks: PerformanceBenchmark[] = [];
  private baselineData: Map<string, number[]> = new Map();
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.initializeDefaultBenchmarks();
  }

  private initializeDefaultBenchmarks(): void {
    this.benchmarks = [
      {
        operation: 'page-load',
        target: 2000,
        warning: 3000,
        critical: 5000
      },
      {
        operation: 'ai-processing',
        target: 5000,
        warning: 8000,
        critical: 15000
      },
      {
        operation: 'pdf-generation',
        target: 3000,
        warning: 5000,
        critical: 10000
      },
      {
        operation: 'chart-render',
        target: 500,
        warning: 1000,
        critical: 2000
      },
      {
        operation: 'component-render',
        target: 100,
        warning: 200,
        critical: 500
      },
      {
        operation: 'db-query',
        target: 50,
        warning: 100,
        critical: 300
      },
      {
        operation: 'worker-task',
        target: 1000,
        warning: 2000,
        critical: 5000
      }
    ];
  }

  public setBenchmarks(benchmarks: PerformanceBenchmark[]): void {
    this.benchmarks = benchmarks;
  }

  public getBenchmarks(): PerformanceBenchmark[] {
    return [...this.benchmarks];
  }

  public async runBenchmarks(entries: PerformanceEntry[]): Promise<PerformanceBenchmarkResult[]> {
    const results: PerformanceBenchmarkResult[] = [];

    for (const benchmark of this.benchmarks) {
      const operationEntries = entries.filter(entry => entry.operation === benchmark.operation);

      if (operationEntries.length === 0) {
        continue;
      }

      const averageDuration = this.calculateAverageDuration(operationEntries);
      const result = this.evaluateBenchmark(benchmark, averageDuration);

      results.push(result);

      // Check for alerts
      if (result.status === 'warning' || result.status === 'critical') {
        await this.createAlert(benchmark, result);
      }

      // Update baseline data
      this.updateBaseline(benchmark.operation, averageDuration);
    }

    return results;
  }

  private calculateAverageDuration(entries: PerformanceEntry[]): number {
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return totalDuration / entries.length;
  }

  private evaluateBenchmark(
    benchmark: PerformanceBenchmark,
    currentValue: number
  ): PerformanceBenchmarkResult {
    let status: 'pass' | 'warning' | 'critical';
    let improvement = 0;

    if (currentValue <= benchmark.target) {
      status = 'pass';
    } else if (currentValue <= benchmark.warning) {
      status = 'warning';
      improvement = ((currentValue - benchmark.target) / benchmark.target) * 100;
    } else {
      status = 'critical';
      improvement = ((currentValue - benchmark.target) / benchmark.target) * 100;
    }

    return {
      operation: benchmark.operation,
      current: currentValue,
      target: benchmark.target,
      status,
      improvement
    };
  }

  private async createAlert(
    benchmark: PerformanceBenchmark,
    result: PerformanceBenchmarkResult
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'threshold',
      severity: result.status === 'critical' ? 'critical' : 'medium',
      message: `${benchmark.operation} performance exceeded ${result.status} threshold: ${result.current.toFixed(2)}ms (target: ${benchmark.target}ms)`,
      operation: benchmark.operation,
      value: result.current,
      threshold: result.status === 'critical' ? benchmark.critical : benchmark.warning,
      timestamp: new Date()
    };

    try {
      await performanceStorage.storeAlert(alert);
      this.notifyAlertCallbacks(alert);
    } catch (error) {
      console.error('Failed to store performance alert:', error);
    }
  }

  private updateBaseline(operation: string, value: number): void {
    const baseline = this.baselineData.get(operation) || [];
    baseline.push(value);

    // Keep only last 100 measurements for baseline
    if (baseline.length > 100) {
      baseline.shift();
    }

    this.baselineData.set(operation, baseline);
  }

  public async detectRegressions(entries: PerformanceEntry[]): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    for (const [operation, baseline] of this.baselineData.entries()) {
      if (baseline.length < 10) continue; // Need at least 10 measurements

      const recentEntries = entries
        .filter(entry => entry.operation === operation)
        .slice(-5); // Last 5 measurements

      if (recentEntries.length < 3) continue;

      const baselineAverage = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
      const recentAverage = recentEntries.reduce((sum, entry) => sum + entry.duration, 0) / recentEntries.length;

      // Detect significant regression (>20% increase)
      const regressionThreshold = baselineAverage * 1.2;

      if (recentAverage > regressionThreshold) {
        const alert: PerformanceAlert = {
          id: `regression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'regression',
          severity: recentAverage > baselineAverage * 1.5 ? 'high' : 'medium',
          message: `Performance regression detected in ${operation}: ${recentAverage.toFixed(2)}ms vs baseline ${baselineAverage.toFixed(2)}ms`,
          operation,
          value: recentAverage,
          threshold: regressionThreshold,
          timestamp: new Date()
        };

        alerts.push(alert);

        try {
          await performanceStorage.storeAlert(alert);
          this.notifyAlertCallbacks(alert);
        } catch (error) {
          console.error('Failed to store regression alert:', error);
        }
      }
    }

    return alerts;
  }

  public async detectAnomalies(entries: PerformanceEntry[]): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const operationGroups = this.groupEntriesByOperation(entries);

    for (const [operation, operationEntries] of operationGroups.entries()) {
      if (operationEntries.length < 10) continue;

      const durations = operationEntries.map(entry => entry.duration);
      const { mean, stdDev } = this.calculateStatistics(durations);

      // Detect outliers (values beyond 2 standard deviations)
      const outliers = operationEntries.filter(entry =>
        Math.abs(entry.duration - mean) > 2 * stdDev
      );

      for (const outlier of outliers) {
        const alert: PerformanceAlert = {
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'anomaly',
          severity: Math.abs(outlier.duration - mean) > 3 * stdDev ? 'high' : 'low',
          message: `Performance anomaly detected in ${operation}: ${outlier.duration.toFixed(2)}ms (mean: ${mean.toFixed(2)}ms, stddev: ${stdDev.toFixed(2)}ms)`,
          operation,
          value: outlier.duration,
          threshold: mean + 2 * stdDev,
          timestamp: new Date()
        };

        alerts.push(alert);

        try {
          await performanceStorage.storeAlert(alert);
          this.notifyAlertCallbacks(alert);
        } catch (error) {
          console.error('Failed to store anomaly alert:', error);
        }
      }
    }

    return alerts;
  }

  private groupEntriesByOperation(entries: PerformanceEntry[]): Map<string, PerformanceEntry[]> {
    const groups = new Map<string, PerformanceEntry[]>();

    for (const entry of entries) {
      const existing = groups.get(entry.operation) || [];
      existing.push(entry);
      groups.set(entry.operation, existing);
    }

    return groups;
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
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

  public getBaselineData(): Map<string, number[]> {
    return new Map(this.baselineData);
  }

  public clearBaseline(operation?: string): void {
    if (operation) {
      this.baselineData.delete(operation);
    } else {
      this.baselineData.clear();
    }
  }

  public exportBenchmarkResults(results: PerformanceBenchmarkResult[]): string {
    const report = {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        warnings: results.filter(r => r.status === 'warning').length,
        critical: results.filter(r => r.status === 'critical').length
      }
    };

    return JSON.stringify(report, null, 2);
  }
}

// Singleton instance
export const benchmarkRunner = new BenchmarkRunner();