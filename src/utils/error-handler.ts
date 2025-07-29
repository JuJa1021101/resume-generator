// import { AppError } from '../types';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AI_PROCESSING = 'AI_PROCESSING',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  additionalData?: Record<string, unknown>;
}

export interface ErrorReport {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  resolved: boolean;
  retryCount: number;
  maxRetries: number;
}

// Global error handler class
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorListeners: Array<(error: ErrorReport) => void> = [];
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Progressive delays

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        component: 'Global',
        action: 'unhandledrejection',
        timestamp: new Date(),
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        component: 'Global',
        action: 'javascript-error',
        url: event.filename,
        timestamp: new Date(),
        additionalData: {
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Resource loading failed: ${(event.target as any)?.src || 'unknown'}`), {
          component: 'Global',
          action: 'resource-error',
          timestamp: new Date(),
        });
      }
    }, true);
  }

  handleError(error: Error | string | unknown, context: Partial<ErrorContext> = {}): string {
    const errorId = this.generateErrorId();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const errorType = this.determineErrorType(error, errorMessage);
    const severity = this.determineSeverity(errorType, errorMessage);

    const errorReport: ErrorReport = {
      id: errorId,
      type: errorType,
      severity,
      message: errorMessage,
      stack: errorStack,
      context: {
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        ...context,
      },
      resolved: false,
      retryCount: 0,
      maxRetries: this.maxRetries,
    };

    this.errorReports.set(errorId, errorReport);
    this.notifyListeners(errorReport);
    this.logError(errorReport);

    return errorId;
  }

  private determineErrorType(error: unknown, message: string): ErrorType {
    if (error instanceof TypeError && message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('AI') || message.includes('model') || message.includes('analysis')) {
      return ErrorType.AI_PROCESSING;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('storage') || message.includes('IndexedDB')) {
      return ErrorType.STORAGE;
    }
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorType.PERMISSION;
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return ErrorType.TIMEOUT;
    }
    return ErrorType.UNKNOWN;
  }

  private determineSeverity(type: ErrorType, message: string): ErrorSeverity {
    if (type === ErrorType.NETWORK && message.includes('offline')) {
      return ErrorSeverity.MEDIUM;
    }
    if (type === ErrorType.AI_PROCESSING) {
      return ErrorSeverity.HIGH;
    }
    if (type === ErrorType.STORAGE) {
      return ErrorSeverity.HIGH;
    }
    if (type === ErrorType.VALIDATION) {
      return ErrorSeverity.LOW;
    }
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    return ErrorSeverity.MEDIUM;
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    errorId: string,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    const errorReport = this.errorReports.get(errorId);
    if (!errorReport || errorReport.retryCount >= errorReport.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    try {
      const result = await operation();
      errorReport.resolved = true;
      this.errorReports.set(errorId, errorReport);
      return result;
    } catch (error) {
      errorReport.retryCount++;
      this.errorReports.set(errorId, errorReport);

      if (errorReport.retryCount < errorReport.maxRetries) {
        const delay = this.retryDelays[errorReport.retryCount - 1] || 4000;
        await this.delay(delay);
        return this.retryOperation(operation, errorId, context);
      }

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addErrorListener(listener: (error: ErrorReport) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: ErrorReport) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  private notifyListeners(error: ErrorReport): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  private logError(error: ErrorReport): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;

    if (logLevel === 'error') {
      console.error(logMessage, error);
    } else if (logLevel === 'warn') {
      console.warn(logMessage, error);
    } else {
      console.log(logMessage, error);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'log';
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  getAllErrors(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  clearResolvedErrors(): void {
    for (const [id, error] of this.errorReports.entries()) {
      if (error.resolved) {
        this.errorReports.delete(id);
      }
    }
  }

  clearAllErrors(): void {
    this.errorReports.clear();
  }
}

// Utility functions for common error scenarios
export const errorHandler = GlobalErrorHandler.getInstance();

export function handleNetworkError(error: Error, context?: Partial<ErrorContext>): string {
  return errorHandler.handleError(error, {
    ...context,
    component: context?.component || 'Network',
    action: context?.action || 'request',
  });
}

export function handleAIError(error: Error, context?: Partial<ErrorContext>): string {
  return errorHandler.handleError(error, {
    ...context,
    component: context?.component || 'AI',
    action: context?.action || 'processing',
  });
}

export function handleValidationError(error: Error, context?: Partial<ErrorContext>): string {
  return errorHandler.handleError(error, {
    ...context,
    component: context?.component || 'Validation',
    action: context?.action || 'validate',
  });
}

export function handleStorageError(error: Error, context?: Partial<ErrorContext>): string {
  return errorHandler.handleError(error, {
    ...context,
    component: context?.component || 'Storage',
    action: context?.action || 'operation',
  });
}