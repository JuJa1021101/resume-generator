import { CustomPerformanceMetrics, PerformanceEvent, PerformanceEventType } from './types';

// Custom performance metrics collector
export class CustomMetricsCollector {
  private metrics: Partial<CustomPerformanceMetrics> = {};
  private activeEvents: Map<string, PerformanceEvent> = new Map();
  private callbacks: Array<(metrics: Partial<CustomPerformanceMetrics>) => void> = [];
  private memoryMonitorInterval?: number;

  constructor() {
    this.initializeMemoryMonitoring();
  }

  private initializeMemoryMonitoring(): void {
    // Monitor memory usage every 5 seconds
    this.memoryMonitorInterval = window.setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.updateMetrics({
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }
    }, 5000);
  }

  public startEvent(type: PerformanceEventType, name: string, metadata?: Record<string, unknown>): string {
    const eventId = `${type}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const event: PerformanceEvent = {
      type,
      name,
      startTime: performance.now(),
      metadata
    };

    this.activeEvents.set(eventId, event);
    return eventId;
  }

  public endEvent(eventId: string): number | null {
    const event = this.activeEvents.get(eventId);
    if (!event) {
      console.warn(`Performance event ${eventId} not found`);
      return null;
    }

    event.endTime = performance.now();
    const duration = event.endTime - event.startTime;

    // Update relevant metrics based on event type
    this.updateMetricsByEventType(event.type, duration, event.metadata);

    this.activeEvents.delete(eventId);
    return duration;
  }

  private updateMetricsByEventType(
    type: PerformanceEventType,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    switch (type) {
      case 'ai-processing':
        this.updateMetrics({ aiProcessingTime: duration });
        if (metadata?.operation === 'model-load') {
          this.updateMetrics({ modelLoadTime: duration });
        } else if (metadata?.operation === 'analysis') {
          this.updateMetrics({ analysisTime: duration });
        }
        break;

      case 'component-render':
        this.updateMetrics({ componentRenderTime: duration });
        break;

      case 'chart-render':
        this.updateMetrics({ chartRenderTime: duration });
        break;

      case 'pdf-generation':
        this.updateMetrics({ pdfGenerationTime: duration });
        break;

      case 'db-query':
        this.updateMetrics({ dbQueryTime: duration });
        break;

      case 'worker-task':
        this.updateMetrics({ workerResponseTime: duration });
        break;

      case 'cache-operation':
        if (metadata?.hit) {
          this.updateCacheHitRate(true);
        } else if (metadata?.miss) {
          this.updateCacheHitRate(false);
        }
        break;
    }
  }

  private updateCacheHitRate(hit: boolean): void {
    const currentRate = this.metrics.cacheHitRate || 0;
    const currentCount = (this.metrics as any)._cacheOperations || 0;
    const newCount = currentCount + 1;
    const newRate = hit
      ? (currentRate * currentCount + 100) / newCount
      : (currentRate * currentCount) / newCount;

    this.updateMetrics({
      cacheHitRate: newRate,
      ...(({ _cacheOperations: newCount } as any))
    });
  }

  private updateMetrics(updates: Partial<CustomPerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...updates };
    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.metrics));
  }

  public onMetricsUpdate(callback: (metrics: Partial<CustomPerformanceMetrics>) => void): void {
    this.callbacks.push(callback);
  }

  public getMetrics(): Partial<CustomPerformanceMetrics> {
    return { ...this.metrics };
  }

  public measureFunction<T>(
    fn: () => T | Promise<T>,
    type: PerformanceEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): T | Promise<T> {
    const eventId = this.startEvent(type, name, metadata);

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.finally(() => {
          this.endEvent(eventId);
        });
      } else {
        this.endEvent(eventId);
        return result;
      }
    } catch (error) {
      this.endEvent(eventId);
      throw error;
    }
  }

  public measureAsync<T>(
    fn: () => Promise<T>,
    type: PerformanceEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const eventId = this.startEvent(type, name, metadata);

    return fn().finally(() => {
      this.endEvent(eventId);
    });
  }

  public getActiveEvents(): PerformanceEvent[] {
    return Array.from(this.activeEvents.values());
  }

  public clearMetrics(): void {
    this.metrics = {};
    this.activeEvents.clear();
  }

  public destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    this.clearMetrics();
    this.callbacks = [];
  }
}

// Singleton instance
export const customMetricsCollector = new CustomMetricsCollector();