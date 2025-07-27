/**
 * Worker工具函数 - 数据传输优化和通用功能
 * 提供数据序列化、压缩、分块传输等优化功能
 */

// 数据传输优化接口
export interface TransferOptions {
  compress?: boolean;
  chunk?: boolean;
  chunkSize?: number;
  transferable?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface ChunkedData {
  id: string;
  totalChunks: number;
  currentChunk: number;
  data: ArrayBuffer | string;
  metadata?: unknown;
}

export interface CompressionResult {
  compressed: ArrayBuffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// 数据序列化工具
export class DataSerializer {
  /**
   * 序列化数据为可传输格式
   */
  static serialize(data: unknown, options: TransferOptions = {}): ArrayBuffer | string {
    try {
      const jsonString = JSON.stringify(data, this.replacer);

      if (options.compress) {
        return this.compress(jsonString);
      }

      if (options.transferable) {
        return new TextEncoder().encode(jsonString).buffer;
      }

      return jsonString;
    } catch (error) {
      throw new Error(`数据序列化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 反序列化数据
   */
  static deserialize(data: ArrayBuffer | string): unknown {
    try {
      let jsonString: string;

      if (data instanceof ArrayBuffer) {
        jsonString = new TextDecoder().decode(data);
      } else {
        jsonString = data;
      }

      return JSON.parse(jsonString, this.reviver);
    } catch (error) {
      throw new Error(`数据反序列化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * JSON序列化替换器 - 处理特殊类型
   */
  private static replacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }

    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }

    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) };
    }

    if (value instanceof ArrayBuffer) {
      return { __type: 'ArrayBuffer', value: Array.from(new Uint8Array(value)) };
    }

    if (value instanceof Error) {
      return {
        __type: 'Error',
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    return value;
  }

  /**
   * JSON反序列化恢复器 - 恢复特殊类型
   */
  private static reviver(key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null && '__type' in value) {
      const typedValue = value as { __type: string; value: unknown };

      switch (typedValue.__type) {
        case 'Date':
          return new Date(typedValue.value as string);

        case 'Map':
          return new Map(typedValue.value as [unknown, unknown][]);

        case 'Set':
          return new Set(typedValue.value as unknown[]);

        case 'ArrayBuffer':
          return new Uint8Array(typedValue.value as number[]).buffer;

        case 'Error':
          const errorData = typedValue as unknown as {
            name: string;
            message: string;
            stack?: string;
          };
          const error = new Error(errorData.message);
          error.name = errorData.name;
          if (errorData.stack) {
            error.stack = errorData.stack;
          }
          return error;
      }
    }

    return value;
  }

  /**
   * 简单压缩算法 (LZ77变体)
   */
  private static compress(data: string): ArrayBuffer {
    const dictionary = new Map<string, number>();
    const result: number[] = [];
    let dictSize = 256;

    // 初始化字典
    for (let i = 0; i < 256; i++) {
      dictionary.set(String.fromCharCode(i), i);
    }

    let current = '';
    for (const char of data) {
      const combined = current + char;
      if (dictionary.has(combined)) {
        current = combined;
      } else {
        result.push(dictionary.get(current)!);
        dictionary.set(combined, dictSize++);
        current = char;
      }
    }

    if (current) {
      result.push(dictionary.get(current)!);
    }

    return new Uint16Array(result).buffer;
  }

  /**
   * 解压缩
   */
  static decompress(compressed: ArrayBuffer): string {
    const data = new Uint16Array(compressed);
    const dictionary: string[] = [];

    // 初始化字典
    for (let i = 0; i < 256; i++) {
      dictionary[i] = String.fromCharCode(i);
    }

    let result = '';
    let previous = String.fromCharCode(data[0]);
    result += previous;

    for (let i = 1; i < data.length; i++) {
      const code = data[i];
      let current: string;

      if (dictionary[code]) {
        current = dictionary[code];
      } else if (code === dictionary.length) {
        current = previous + previous[0];
      } else {
        throw new Error('解压缩错误：无效的压缩数据');
      }

      result += current;
      dictionary.push(previous + current[0]);
      previous = current;
    }

    return result;
  }
}

// 分块传输管理器
export class ChunkManager {
  private chunks = new Map<string, Map<number, ChunkedData>>();
  private assembledData = new Map<string, unknown>();

  /**
   * 将大数据分块
   */
  static createChunks(
    data: unknown,
    chunkSize: number = 64 * 1024, // 64KB默认块大小
    options: TransferOptions = {}
  ): ChunkedData[] {
    const serialized = DataSerializer.serialize(data, options);
    const dataBuffer = typeof serialized === 'string'
      ? new TextEncoder().encode(serialized).buffer
      : serialized;

    const chunks: ChunkedData[] = [];
    const totalSize = dataBuffer.byteLength;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const id = this.generateChunkId();

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunkData = dataBuffer.slice(start, end);

      chunks.push({
        id,
        totalChunks,
        currentChunk: i,
        data: chunkData,
        metadata: i === 0 ? { originalSize: totalSize, options } : undefined
      });
    }

    return chunks;
  }

  /**
   * 接收分块数据
   */
  receiveChunk(chunk: ChunkedData): { complete: boolean; data?: unknown } {
    const { id, totalChunks, currentChunk } = chunk;

    if (!this.chunks.has(id)) {
      this.chunks.set(id, new Map());
    }

    const chunkMap = this.chunks.get(id)!;
    chunkMap.set(currentChunk, chunk);

    // 检查是否所有分块都已接收
    if (chunkMap.size === totalChunks) {
      const assembledData = this.assembleChunks(id);
      this.chunks.delete(id);
      return { complete: true, data: assembledData };
    }

    return { complete: false };
  }

  /**
   * 组装分块数据
   */
  private assembleChunks(id: string): unknown {
    const chunkMap = this.chunks.get(id);
    if (!chunkMap) {
      throw new Error(`未找到分块数据: ${id}`);
    }

    const sortedChunks = Array.from(chunkMap.values())
      .sort((a, b) => a.currentChunk - b.currentChunk);

    // 计算总大小
    const totalSize = sortedChunks.reduce((sum, chunk) => {
      return sum + (chunk.data as ArrayBuffer).byteLength;
    }, 0);

    // 合并数据
    const assembled = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of sortedChunks) {
      const chunkArray = new Uint8Array(chunk.data as ArrayBuffer);
      assembled.set(chunkArray, offset);
      offset += chunkArray.length;
    }

    // 获取原始选项
    const firstChunk = sortedChunks[0];
    const options = firstChunk.metadata?.options as TransferOptions || {};

    // 反序列化
    if (options.compress) {
      const decompressed = DataSerializer.decompress(assembled.buffer);
      return DataSerializer.deserialize(decompressed);
    } else {
      return DataSerializer.deserialize(assembled.buffer);
    }
  }

  /**
   * 生成分块ID
   */
  private static generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理过期的分块数据
   */
  cleanup(maxAge: number = 5 * 60 * 1000): void { // 5分钟默认过期时间
    const now = Date.now();

    for (const [id, chunkMap] of this.chunks.entries()) {
      const firstChunk = chunkMap.values().next().value as ChunkedData;
      if (firstChunk && firstChunk.metadata) {
        const createdAt = (firstChunk.metadata as any).createdAt || 0;
        if (now - createdAt > maxAge) {
          this.chunks.delete(id);
        }
      }
    }
  }
}

// 性能监控工具
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceEntry[]>();
  private observers = new Map<string, PerformanceObserver>();

  /**
   * 开始性能测量
   */
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * 结束性能测量
   */
  endMeasure(name: string): PerformanceMeasure {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, 'measure')[0] as PerformanceMeasure;

    // 保存测量结果
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(measure);

    return measure;
  }

  /**
   * 获取性能统计
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
  } | null {
    const entries = this.metrics.get(name);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map(entry => entry.duration);

    return {
      count: entries.length,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: durations.reduce((sum, d) => sum + d, 0)
    };
  }

  /**
   * 监控特定类型的性能条目
   */
  observe(entryTypes: string[], callback: (entries: PerformanceEntry[]) => void): void {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });

    observer.observe({ entryTypes });

    const observerId = entryTypes.join(',');
    this.observers.set(observerId, observer);
  }

  /**
   * 停止监控
   */
  stopObserving(entryTypes: string[]): void {
    const observerId = entryTypes.join(',');
    const observer = this.observers.get(observerId);

    if (observer) {
      observer.disconnect();
      this.observers.delete(observerId);
    }
  }

  /**
   * 清理性能数据
   */
  clear(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    return null;
  }
}

// 错误处理工具
export class ErrorHandler {
  private errorLog: Array<{
    timestamp: Date;
    error: Error;
    context?: unknown;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  /**
   * 记录错误
   */
  logError(
    error: Error,
    context?: unknown,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    this.errorLog.push({
      timestamp: new Date(),
      error,
      context,
      severity
    });

    // 保持错误日志大小在合理范围内
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }

    // 根据严重程度决定是否立即处理
    if (severity === 'critical') {
      console.error('Critical error:', error, context);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    recent: number; // 最近1小时的错误数
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const bySeverity = this.errorLog.reduce((acc, entry) => {
      acc[entry.severity] = (acc[entry.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = this.errorLog.filter(
      entry => entry.timestamp.getTime() > oneHourAgo
    ).length;

    return {
      total: this.errorLog.length,
      bySeverity,
      recent
    };
  }

  /**
   * 清理错误日志
   */
  clearErrors(): void {
    this.errorLog = [];
  }

  /**
   * 创建可恢复的错误处理器
   */
  static createRecoverableHandler<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await operation();
          resolve(result);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < maxRetries) {
            // 指数退避
            const delay = backoffMs * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      reject(lastError!);
    });
  }
}

// 导出单例实例
export const chunkManager = new ChunkManager();
export const performanceMonitor = new PerformanceMonitor();
export const errorHandler = new ErrorHandler();

// 工具函数
export function isTransferableSupported(): boolean {
  try {
    const buffer = new ArrayBuffer(1);
    const worker = new Worker('data:application/javascript,', { type: 'module' });
    worker.postMessage(buffer, [buffer]);
    worker.terminate();
    return buffer.byteLength === 0; // 如果支持Transferable，buffer应该被转移
  } catch {
    return false;
  }
}

export function estimateDataSize(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
}

export function shouldUseChunking(data: unknown, threshold: number = 1024 * 1024): boolean {
  return estimateDataSize(data) > threshold;
}