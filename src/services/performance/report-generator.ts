import {
  PerformanceReport,
  PerformanceSummary,
  PerformanceEntry,
  PerformanceBenchmarkResult,
  PerformanceRecommendation,
  WebVitalsMetrics,
  CustomPerformanceMetrics
} from './types';
import { webVitalsMonitor } from './web-vitals-monitor';
import { customMetricsCollector } from './custom-metrics-collector';
import { benchmarkRunner } from './benchmark-runner';
import { performanceStorage } from './performance-storage';

export class ReportGenerator {
  public async generateReport(
    startTime: Date,
    endTime: Date
  ): Promise<PerformanceReport> {
    const entries = await performanceStorage.getEntries(
      startTime.getTime(),
      endTime.getTime()
    );

    const webVitals = webVitalsMonitor.getMetrics();
    const customMetrics = customMetricsCollector.getMetrics();
    const benchmarkResults = await benchmarkRunner.runBenchmarks(entries);

    const summary = this.generateSummary(entries, benchmarkResults);
    const recommendations = this.generateRecommendations(
      entries,
      benchmarkResults,
      webVitals,
      customMetrics
    );

    const report: PerformanceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      timeRange: { start: startTime, end: endTime },
      summary,
      webVitals: this.fillWebVitalsDefaults(webVitals),
      customMetrics: this.fillCustomMetricsDefaults(customMetrics),
      entries,
      benchmarks: benchmarkResults,
      recommendations
    };

    // Store the report
    await performanceStorage.storeReport(report);

    return report;
  }

  private generateSummary(
    entries: PerformanceEntry[],
    benchmarkResults: PerformanceBenchmarkResult[]
  ): PerformanceSummary {
    const loadTimeEntries = entries.filter(e => e.operation === 'page-load');
    const aiProcessingEntries = entries.filter(e => e.operation === 'ai-processing');
    const cacheEntries = entries.filter(e => e.operation === 'cache-operation');

    const averageLoadTime = loadTimeEntries.length > 0
      ? loadTimeEntries.reduce((sum, e) => sum + e.duration, 0) / loadTimeEntries.length
      : 0;

    const averageAIProcessingTime = aiProcessingEntries.length > 0
      ? aiProcessingEntries.reduce((sum, e) => sum + e.duration, 0) / aiProcessingEntries.length
      : 0;

    // Calculate cache efficiency from custom metrics
    const customMetrics = customMetricsCollector.getMetrics();
    const cacheEfficiency = customMetrics.cacheHitRate || 0;

    // Calculate performance score based on benchmarks
    const performanceScore = this.calculatePerformanceScore(benchmarkResults);

    // Detect regression by comparing with previous report
    const regressionDetected = await this.detectRegression(entries);

    return {
      totalEntries: entries.length,
      averageLoadTime,
      averageAIProcessingTime,
      cacheEfficiency,
      performanceScore,
      regressionDetected
    };
  }

  private calculatePerformanceScore(benchmarkResults: PerformanceBenchmarkResult[]): number {
    if (benchmarkResults.length === 0) return 0;

    let totalScore = 0;
    const weights = {
      'page-load': 0.25,
      'ai-processing': 0.20,
      'pdf-generation': 0.15,
      'chart-render': 0.15,
      'component-render': 0.10,
      'db-query': 0.10,
      'worker-task': 0.05
    };

    for (const result of benchmarkResults) {
      const weight = weights[result.operation as keyof typeof weights] || 0.05;
      let score = 100;

      if (result.status === 'critical') {
        score = 0;
      } else if (result.status === 'warning') {
        score = 50;
      }

      totalScore += score * weight;
    }

    // Add Web Vitals score
    const webVitalsScore = webVitalsMonitor.getPerformanceScore();
    totalScore = (totalScore * 0.7) + (webVitalsScore * 0.3);

    return Math.round(totalScore);
  }

  private async detectRegression(entries: PerformanceEntry[]): Promise<boolean> {
    try {
      const previousReport = await performanceStorage.getLatestReport();
      if (!previousReport) return false;

      const currentAverage = entries.length > 0
        ? entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
        : 0;

      const previousAverage = previousReport.entries.length > 0
        ? previousReport.entries.reduce((sum, e) => sum + e.duration, 0) / previousReport.entries.length
        : 0;

      // Consider it a regression if current average is 15% higher than previous
      return currentAverage > previousAverage * 1.15;
    } catch (error) {
      console.error('Error detecting regression:', error);
      return false;
    }
  }

  private generateRecommendations(
    entries: PerformanceEntry[],
    benchmarkResults: PerformanceBenchmarkResult[],
    webVitals: Partial<WebVitalsMetrics>,
    customMetrics: Partial<CustomPerformanceMetrics>
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Web Vitals recommendations
    if (webVitals.fcp && webVitals.fcp > 3000) {
      recommendations.push({
        type: 'optimization',
        title: 'Improve First Contentful Paint',
        description: 'FCP is above 3 seconds. Consider optimizing critical resources, reducing server response time, and eliminating render-blocking resources.',
        impact: 'high',
        effort: 'medium',
        actionable: true
      });
    }

    if (webVitals.lcp && webVitals.lcp > 4000) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Largest Contentful Paint',
        description: 'LCP is above 4 seconds. Optimize images, preload key resources, and improve server response times.',
        impact: 'high',
        effort: 'medium',
        actionable: true
      });
    }

    if (webVitals.cls && webVitals.cls > 0.25) {
      recommendations.push({
        type: 'optimization',
        title: 'Reduce Cumulative Layout Shift',
        description: 'CLS is above 0.25. Add size attributes to images and videos, avoid inserting content above existing content.',
        impact: 'medium',
        effort: 'low',
        actionable: true
      });
    }

    // Custom metrics recommendations
    if (customMetrics.aiProcessingTime && customMetrics.aiProcessingTime > 10000) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize AI Processing Performance',
        description: 'AI processing time is above 10 seconds. Consider model optimization, caching strategies, or switching to a faster model.',
        impact: 'high',
        effort: 'high',
        actionable: true
      });
    }

    if (customMetrics.cacheHitRate && customMetrics.cacheHitRate < 70) {
      recommendations.push({
        type: 'optimization',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is below 70%. Review caching strategies and consider increasing cache size or improving cache keys.',
        impact: 'medium',
        effort: 'medium',
        actionable: true
      });
    }

    if (customMetrics.heapUsed && customMetrics.jsHeapSizeLimit &&
      customMetrics.heapUsed > customMetrics.jsHeapSizeLimit * 0.8) {
      recommendations.push({
        type: 'warning',
        title: 'High Memory Usage Detected',
        description: 'Memory usage is above 80% of the limit. Check for memory leaks and optimize data structures.',
        impact: 'high',
        effort: 'high',
        actionable: true
      });
    }

    // Benchmark-based recommendations
    for (const result of benchmarkResults) {
      if (result.status === 'critical') {
        recommendations.push({
          type: 'optimization',
          title: `Critical Performance Issue: ${result.operation}`,
          description: `${result.operation} is performing ${result.improvement.toFixed(1)}% slower than target. Immediate optimization required.`,
          impact: 'high',
          effort: 'high',
          actionable: true
        });
      } else if (result.status === 'warning') {
        recommendations.push({
          type: 'optimization',
          title: `Performance Warning: ${result.operation}`,
          description: `${result.operation} is ${result.improvement.toFixed(1)}% slower than target. Consider optimization.`,
          impact: 'medium',
          effort: 'medium',
          actionable: true
        });
      }
    }

    // General recommendations based on patterns
    const slowOperations = entries
      .filter(e => e.duration > 1000)
      .reduce((acc, e) => {
        acc[e.operation] = (acc[e.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    for (const [operation, count] of Object.entries(slowOperations)) {
      if (count > 5) {
        recommendations.push({
          type: 'optimization',
          title: `Frequent Slow Operations: ${operation}`,
          description: `${operation} has been slow ${count} times. Consider investigating and optimizing this operation.`,
          impact: 'medium',
          effort: 'medium',
          actionable: true
        });
      }
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  private fillWebVitalsDefaults(webVitals: Partial<WebVitalsMetrics>): WebVitalsMetrics {
    return {
      fcp: webVitals.fcp || 0,
      lcp: webVitals.lcp || 0,
      fid: webVitals.fid || 0,
      cls: webVitals.cls || 0,
      ttfb: webVitals.ttfb || 0,
      tti: webVitals.tti || 0,
      tbt: webVitals.tbt || 0,
      si: webVitals.si || 0
    };
  }

  private fillCustomMetricsDefaults(customMetrics: Partial<CustomPerformanceMetrics>): CustomPerformanceMetrics {
    return {
      aiProcessingTime: customMetrics.aiProcessingTime || 0,
      modelLoadTime: customMetrics.modelLoadTime || 0,
      analysisTime: customMetrics.analysisTime || 0,
      componentRenderTime: customMetrics.componentRenderTime || 0,
      chartRenderTime: customMetrics.chartRenderTime || 0,
      pdfGenerationTime: customMetrics.pdfGenerationTime || 0,
      cacheHitRate: customMetrics.cacheHitRate || 0,
      dbQueryTime: customMetrics.dbQueryTime || 0,
      workerResponseTime: customMetrics.workerResponseTime || 0,
      heapUsed: customMetrics.heapUsed || 0,
      heapTotal: customMetrics.heapTotal || 0,
      jsHeapSizeLimit: customMetrics.jsHeapSizeLimit || 0
    };
  }

  public async generateDailyReport(): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    return this.generateReport(startTime, endTime);
  }

  public async generateWeeklyReport(): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    return this.generateReport(startTime, endTime);
  }

  public exportReportAsJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  public exportReportAsCSV(report: PerformanceReport): string {
    const headers = [
      'Timestamp',
      'Operation',
      'Duration (ms)',
      'Web Vitals FCP',
      'Web Vitals LCP',
      'Web Vitals FID',
      'Web Vitals CLS',
      'Cache Hit Rate',
      'Memory Used (MB)'
    ];

    const rows = report.entries.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.operation,
      entry.duration.toString(),
      entry.webVitals?.fcp?.toString() || '',
      entry.webVitals?.lcp?.toString() || '',
      entry.webVitals?.fid?.toString() || '',
      entry.webVitals?.cls?.toString() || '',
      entry.customMetrics?.cacheHitRate?.toString() || '',
      entry.customMetrics?.heapUsed ? (entry.customMetrics.heapUsed / 1024 / 1024).toFixed(2) : ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Singleton instance
export const reportGenerator = new ReportGenerator();