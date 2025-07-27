import { useCallback, useEffect, useState } from 'react';
import { errorHandler, ErrorReport, ErrorType } from '../utils/error-handler';
import { useToast } from './useToast';

export interface UseErrorHandlerOptions {
  showToasts?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

export interface UseErrorHandlerReturn {
  errors: ErrorReport[];
  handleError: (error: Error | string, context?: any) => string;
  retryError: (errorId: string) => Promise<void>;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  isRetrying: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    showToasts = true,
    autoRetry = false,
    maxRetries = 3,
  } = options;

  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const { showError, showWarning, showInfo } = useToast();

  // Subscribe to error updates
  useEffect(() => {
    const handleErrorUpdate = (error: ErrorReport) => {
      setErrors(prev => {
        const existing = prev.find(e => e.id === error.id);
        if (existing) {
          return prev.map(e => e.id === error.id ? error : e);
        }
        return [...prev, error];
      });

      // Show toast notification if enabled
      if (showToasts) {
        showErrorToast(error);
      }

      // Auto-retry if enabled and conditions are met
      if (autoRetry && shouldAutoRetry(error)) {
        setTimeout(() => {
          retryError(error.id);
        }, getRetryDelay(error.retryCount));
      }
    };

    errorHandler.addErrorListener(handleErrorUpdate);

    return () => {
      errorHandler.removeErrorListener(handleErrorUpdate);
    };
  }, [showToasts, autoRetry, maxRetries]);

  const showErrorToast = useCallback((error: ErrorReport) => {
    const title = getErrorTitle(error.type);
    const message = getErrorMessage(error);

    switch (error.severity) {
      case 'CRITICAL':
      case 'HIGH':
        showError(title, message);
        break;
      case 'MEDIUM':
        showWarning(title, message);
        break;
      case 'LOW':
        showInfo(title, message);
        break;
    }
  }, [showError, showWarning, showInfo]);

  const handleError = useCallback((error: Error | string, context?: any): string => {
    return errorHandler.handleError(error, context);
  }, []);

  const retryError = useCallback(async (errorId: string): Promise<void> => {
    const error = errorHandler.getErrorReport(errorId);
    if (!error || error.retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);

    try {
      await errorHandler.retryOperation(
        async () => {
          // This is a placeholder - in practice, you'd want to retry the specific operation
          // that failed. This could be passed as part of the error context.
          return Promise.resolve();
        },
        errorId
      );

      // Update local state
      setErrors(prev => prev.filter(e => e.id !== errorId));
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [maxRetries]);

  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
    errorHandler.clearAllErrors();
  }, []);

  return {
    errors,
    handleError,
    retryError,
    clearError,
    clearAllErrors,
    isRetrying,
  };
}

// Helper functions
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return '网络错误';
    case ErrorType.AI_PROCESSING:
      return 'AI处理错误';
    case ErrorType.VALIDATION:
      return '验证错误';
    case ErrorType.STORAGE:
      return '存储错误';
    case ErrorType.PERMISSION:
      return '权限错误';
    case ErrorType.TIMEOUT:
      return '超时错误';
    default:
      return '系统错误';
  }
}

function getErrorMessage(error: ErrorReport): string {
  const baseMessage = error.message;

  // Provide user-friendly messages based on error type
  switch (error.type) {
    case ErrorType.NETWORK:
      if (baseMessage.includes('offline')) {
        return '网络连接已断开，请检查网络设置';
      }
      if (baseMessage.includes('timeout')) {
        return '网络请求超时，请稍后重试';
      }
      return '网络连接出现问题，请检查网络设置';

    case ErrorType.AI_PROCESSING:
      if (baseMessage.includes('quota')) {
        return 'AI服务配额已用完，请稍后重试';
      }
      if (baseMessage.includes('model')) {
        return 'AI模型加载失败，请刷新页面重试';
      }
      return 'AI处理出现问题，请稍后重试';

    case ErrorType.STORAGE:
      if (baseMessage.includes('quota')) {
        return '存储空间不足，请清理缓存后重试';
      }
      return '数据存储出现问题，请刷新页面重试';

    case ErrorType.VALIDATION:
      return '输入数据格式不正确，请检查后重试';

    case ErrorType.PERMISSION:
      return '权限不足，请检查浏览器设置';

    case ErrorType.TIMEOUT:
      return '操作超时，请稍后重试';

    default:
      return baseMessage || '出现未知错误，请刷新页面重试';
  }
}

function shouldAutoRetry(error: ErrorReport): boolean {
  // Don't auto-retry validation errors or permission errors
  if (error.type === ErrorType.VALIDATION || error.type === ErrorType.PERMISSION) {
    return false;
  }

  // Don't auto-retry if already at max retries
  if (error.retryCount >= error.maxRetries) {
    return false;
  }

  // Auto-retry network errors and timeouts
  return error.type === ErrorType.NETWORK || error.type === ErrorType.TIMEOUT;
}

function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, retryCount), 10000);
}