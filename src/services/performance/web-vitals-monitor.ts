import { WebVitalsMetrics, PerformanceEntry } from './types';

// Web Vitals monitoring service
export class WebVitalsMonitor {
  private metrics: Partial<WebVitalsMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private callbacks: Array<(metrics: Partial<WebVitalsMetrics>) => void> = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.updateMetric('fcp', fcpEntry.startTime);
      }
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        this.updateMetric('lcp', lcpEntry.startTime);
      }
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      const fidEntry = entries[0];
      if (fidEntry) {
        this.updateMetric('fid', fidEntry.processingStart - fidEntry.startTime);
      }
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0;
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.updateMetric('cls', clsValue);
    });

    // Time to First Byte (TTFB)
    this.observePerformanceEntry('navigation', (entries) => {
      const navEntry = entries[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.updateMetric('ttfb', navEntry.responseStart - navEntry.fetchStart);
      }
    });

    // Additional metrics
    this.calculateAdditionalMetrics();
  }

  private observePerformanceEntry(
    entryType: string,
    callback: (entries: any[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries() as any[]);
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private calculateAdditionalMetrics(): void {
    // Time to Interactive (TTI) - simplified calculation
    setTimeout(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const tti = navEntry.domInteractive - navEntry.fetchStart;
        this.updateMetric('tti', tti);
      }
    }, 1000);

    // Total Blocking Time (TBT) - simplified calculation
    this.observePerformanceEntry('longtask', (entries) => {
      let tbt = 0;
      for (const entry of entries) {
        if (entry.duration > 50) {
          tbt += entry.duration - 50;
        }
      }
      this.updateMetric('tbt', tbt);
    });
  }

  private updateMetric(key: keyof WebVitalsMetrics, value: number): void {
    this.metrics[key] = value;
    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.metrics));
  }

  public onMetricsUpdate(callback: (metrics: Partial<WebVitalsMetrics>) => void): void {
    this.callbacks.push(callback);
  }

  public getMetrics(): Partial<WebVitalsMetrics> {
    return { ...this.metrics };
  }

  public getPerformanceScore(): number {
    const weights = {
      fcp: 0.15,
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      ttfb: 0.1
    };

    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };

    let score = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      const value = this.metrics[metric as keyof WebVitalsMetrics];
      if (value !== undefined) {
        const threshold = thresholds[metric as keyof typeof thresholds];
        let metricScore = 100;

        if (value > threshold.poor) {
          metricScore = 0;
        } else if (value > threshold.good) {
          metricScore = 50 * (1 - (value - threshold.good) / (threshold.poor - threshold.good));
        }

        score += metricScore * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  }

  public createPerformanceEntry(operation: string): PerformanceEntry {
    return {
      id: `perf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      operation,
      duration: 0,
      webVitals: this.getMetrics()
    };
  }

  public disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.callbacks = [];
  }
}

// Singleton instance
export const webVitalsMonitor = new WebVitalsMonitor();