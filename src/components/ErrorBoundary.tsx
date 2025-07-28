import { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { errorHandler } from '../utils/error-handler';
import { networkHandler } from '../utils/network-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle error with global error handler
    const errorId = errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, errorId: string) {
    try {
      // In a real app, you would send this to your error reporting service
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      console.log('Error report:', errorReport);
      // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  handleRetry = async () => {
    if (this.state.retryCount >= this.maxRetries || this.state.isRetrying) {
      return;
    }

    this.setState({ isRetrying: true });

    try {
      // If there's an errorId, try to retry the operation
      if (this.state.errorId) {
        const errorReport = errorHandler.getErrorReport(this.state.errorId);
        if (errorReport && !errorReport.resolved) {
          // Attempt to retry the failed operation
          await errorHandler.retryOperation(
            async () => {
              // This is a generic retry - in practice, you'd want to retry the specific operation
              return Promise.resolve();
            },
            this.state.errorId
          );
        }
      }

      // Reset error state
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorSuggestion(): string {
    const { error } = this.state;
    if (!error) return '请尝试刷新页面或稍后再试。';

    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接出现问题，请检查网络连接后重试。';
    }

    if (message.includes('chunk') || message.includes('loading')) {
      return '资源加载失败，请刷新页面重新加载。';
    }

    if (message.includes('memory') || message.includes('heap')) {
      return '内存不足，请关闭其他标签页后重试。';
    }

    return '应用遇到了意外错误，请尝试刷新页面或稍后再试。';
  }

  private isNetworkError(): boolean {
    const { error } = this.state;
    if (!error) return false;

    const message = error.message.toLowerCase();
    return message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection');
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.isNetworkError();
      const networkStatus = networkHandler.getNetworkStatus();
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />

            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isNetworkError ? '网络连接问题' : '出现了一些问题'}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {this.getErrorSuggestion()}
            </p>

            {/* Network status indicator */}
            {isNetworkError && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  网络状态: {networkStatus.isOnline ? '在线' : '离线'}
                  {networkStatus.effectiveType && ` (${networkStatus.effectiveType})`}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {this.state.isRetrying ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      重试中...
                    </>
                  ) : (
                    `重试 (${this.maxRetries - this.state.retryCount} 次机会)`
                  )}
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                刷新页面
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                返回首页
              </button>
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  错误详情 (开发模式)
                </summary>
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto whitespace-pre-wrap">
                    <strong>Error:</strong> {this.state.error.toString()}
                    {this.state.error.stack && (
                      <>
                        <br /><br />
                        <strong>Stack:</strong><br />
                        {this.state.error.stack}
                      </>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <br /><br />
                        <strong>Component Stack:</strong>
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            )}

            {/* Error ID for support */}
            {this.state.errorId && (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                错误ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
