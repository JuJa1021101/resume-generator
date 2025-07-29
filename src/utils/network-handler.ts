import { errorHandler } from './error-handler';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export class NetworkHandler {
  private static instance: NetworkHandler;
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine };
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private statusListeners: Array<(status: NetworkStatus) => void> = [];
  private maxQueueSize = 50;
  private maxRetries = 3;

  private constructor() {
    this.setupNetworkListeners();
    this.updateNetworkInfo();
  }

  static getInstance(): NetworkHandler {
    if (!NetworkHandler.instance) {
      NetworkHandler.instance = new NetworkHandler();
    }
    return NetworkHandler.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.updateNetworkInfo();
      this.notifyStatusListeners();
      this.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.notifyStatusListeners();
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateNetworkInfo();
        this.notifyStatusListeners();
      });
    }
  }

  private updateNetworkInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkStatus = {
        ...this.networkStatus,
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
  }

  async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = this.maxRetries
  ): Promise<Response> {
    if (!this.networkStatus.isOnline) {
      return this.queueRequest(url, options, maxRetries);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        errorHandler.handleError(error, {
          component: 'NetworkHandler',
          action: 'fetch',
          additionalData: { url, method: options.method || 'GET' },
        });

        // Retry logic for network errors
        if (maxRetries > 0 && this.shouldRetry(error)) {
          await this.delay(this.getRetryDelay(this.maxRetries - maxRetries));
          return this.fetchWithRetry(url, options, maxRetries - 1);
        }

        // Queue request if offline
        if (!this.networkStatus.isOnline) {
          return this.queueRequest(url, options, maxRetries);
        }
      }

      throw error;
    }
  }

  private shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'fetch',
      'network',
      'timeout',
      'abort',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
    ];

    return retryableErrors.some(errorType =>
      error.message.toLowerCase().includes(errorType)
    );
  }

  private getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 10000); // Max 10s delay
  }

  private async queueRequest(
    url: string,
    options: RequestInit,
    maxRetries: number
  ): Promise<Response> {
    if (this.requestQueue.size >= this.maxQueueSize) {
      // Remove oldest request
      const oldestId = this.requestQueue.keys().next().value;
      if (oldestId) {
        this.requestQueue.delete(oldestId);
      }
    }

    const requestId = this.generateRequestId();
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      options,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
    };

    this.requestQueue.set(requestId, queuedRequest);

    // Return a promise that will resolve when the request is processed
    return new Promise((resolve, reject) => {
      const checkQueue = () => {
        if (this.networkStatus.isOnline) {
          this.processQueuedRequest(requestId)
            .then(resolve)
            .catch(reject);
        } else {
          setTimeout(checkQueue, 1000);
        }
      };
      checkQueue();
    });
  }

  private async processQueuedRequests(): Promise<void> {
    const requests = Array.from(this.requestQueue.values());

    for (const request of requests) {
      try {
        await this.processQueuedRequest(request.id);
      } catch (error) {
        console.error(`Failed to process queued request ${request.id}:`, error);
      }
    }
  }

  private async processQueuedRequest(requestId: string): Promise<Response> {
    const request = this.requestQueue.get(requestId);
    if (!request) {
      throw new Error(`Queued request ${requestId} not found`);
    }

    try {
      const response = await this.fetchWithRetry(
        request.url,
        request.options,
        request.maxRetries - request.retryCount
      );

      this.requestQueue.delete(requestId);
      return response;
    } catch (error) {
      request.retryCount++;

      if (request.retryCount >= request.maxRetries) {
        this.requestQueue.delete(requestId);
      }

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  addStatusListener(listener: (status: NetworkStatus) => void): void {
    this.statusListeners.push(listener);
  }

  removeStatusListener(listener: (status: NetworkStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  getQueuedRequestsCount(): number {
    return this.requestQueue.size;
  }

  clearQueue(): void {
    this.requestQueue.clear();
  }

  // Utility method to check if connection is fast enough for heavy operations
  isConnectionFast(): boolean {
    const { effectiveType, downlink } = this.networkStatus;

    if (effectiveType === '4g' || effectiveType === '5g') {
      return true;
    }

    if (downlink && downlink > 1.5) {
      return true;
    }

    return false;
  }
}

export const networkHandler = NetworkHandler.getInstance();