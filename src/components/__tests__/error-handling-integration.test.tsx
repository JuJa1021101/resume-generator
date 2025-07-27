import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../feedback/Toast';

// Mock the hooks
jest.mock('../../hooks/useToast');
jest.mock('../../utils/error-handler');
jest.mock('../../utils/network-handler');

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>No error</div>;
};

// Test component that uses error handler
const ErrorHandlerComponent = () => {
  const { handleError, errors, retryError, clearError } = useErrorHandler();

  const triggerError = () => {
    handleError(new Error('Manual error'), { component: 'TestComponent' });
  };

  return (
    <div>
      <button onClick={triggerError}>Trigger Error</button>
      <div data-testid="error-count">{errors.length}</div>
      {errors.map(error => (
        <div key={error.id} data-testid={`error-${error.id}`}>
          <span>{error.message}</span>
          <button onClick={() => retryError(error.id)}>Retry</button>
          <button onClick={() => clearError(error.id)}>Clear</button>
        </div>
      ))}
    </div>
  );
};

describe('Error Handling Integration', () => {
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();
  const mockShowInfo = jest.fn();
  const mockHideToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: jest.fn(),
      hideToast: mockHideToast,
      clearAllToasts: jest.fn(),
      showSuccess: jest.fn(),
      showError: mockShowError,
      showWarning: mockShowWarning,
      showInfo: mockShowInfo,
    });

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorBoundary Integration', () => {
    it('should catch and display component errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
      expect(screen.getByText(/应用遇到了意外错误/)).toBeInTheDocument();
      expect(screen.getByText(/重试/)).toBeInTheDocument();
      expect(screen.getByText('刷新页面')).toBeInTheDocument();
    });

    it('should allow retry functionality', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('出现了一些问题')).toBeInTheDocument();

      const retryButton = screen.getByText(/重试/);
      fireEvent.click(retryButton);

      // Simulate successful retry by not throwing error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should show reload and home buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('刷新页面')).toBeInTheDocument();
      expect(screen.getByText('返回首页')).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('错误详情 (开发模式)')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should call custom error handler when provided', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
      expect(screen.queryByText('出现了一些问题')).not.toBeInTheDocument();
    });
  });

  describe('Toast Integration', () => {
    it('should render toast container with toasts', () => {
      const mockToasts = [
        {
          id: 'toast-1',
          type: 'error' as const,
          title: 'Error occurred',
          message: 'Something went wrong',
          onClose: mockHideToast,
        },
      ];

      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        showToast: jest.fn(),
        hideToast: mockHideToast,
        clearAllToasts: jest.fn(),
        showSuccess: jest.fn(),
        showError: mockShowError,
        showWarning: mockShowWarning,
        showInfo: mockShowInfo,
      });

      render(<ToastContainer toasts={mockToasts} onClose={mockHideToast} />);

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle toast close events', () => {
      const mockToasts = [
        {
          id: 'toast-1',
          type: 'info' as const,
          title: 'Info message',
          onClose: mockHideToast,
        },
      ];

      render(<ToastContainer toasts={mockToasts} onClose={mockHideToast} />);

      const closeButton = screen.getByLabelText('关闭通知');
      fireEvent.click(closeButton);

      expect(mockHideToast).toHaveBeenCalledWith('toast-1');
    });
  });

  describe('Full Error Flow Integration', () => {
    it('should handle complete error flow from trigger to resolution', async () => {
      // Create a component that uses the error handler
      const TestApp = () => {
        const { toasts, hideToast } = useToast();

        return (
          <ErrorBoundary>
            <ErrorHandlerComponent />
            <ToastContainer toasts={toasts} onClose={hideToast} />
          </ErrorBoundary>
        );
      };

      render(<TestApp />);

      // Initially no errors
      expect(screen.getByTestId('error-count')).toHaveTextContent('0');

      // Trigger an error
      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);

      // Should show error in the component
      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      });

      // Should display error message
      expect(screen.getByText('Manual error')).toBeInTheDocument();

      // Should have retry and clear buttons
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();

      // Clear the error
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      });
    });

    it('should handle network errors with offline indicator', () => {
      // Mock network handler to simulate offline state
      jest.doMock('../../utils/network-handler', () => ({
        networkHandler: {
          getNetworkStatus: () => ({ isOnline: false }),
          addStatusListener: jest.fn(),
          removeStatusListener: jest.fn(),
          getQueuedRequestsCount: () => 2,
        },
      }));

      const { OfflineIndicator } = require('../feedback/OfflineIndicator');

      render(<OfflineIndicator />);

      expect(screen.getByText(/离线模式/)).toBeInTheDocument();
      expect(screen.getByText(/2 个请求待处理/)).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper ARIA attributes across components', () => {
      const mockToasts = [
        {
          id: 'toast-1',
          type: 'error' as const,
          title: 'Accessibility test',
          onClose: mockHideToast,
        },
      ];

      render(
        <div>
          <ErrorBoundary>
            <div>Normal content</div>
          </ErrorBoundary>
          <ToastContainer toasts={mockToasts} onClose={mockHideToast} />
        </div>
      );

      // Toast should have proper ARIA attributes
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');

      // Toast container should have assertive live region
      const container = screen.getByLabelText('', { selector: '[aria-live="assertive"]' });
      expect(container).toBeInTheDocument();
    });

    it('should handle keyboard navigation in error states', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText(/重试/);
      const reloadButton = screen.getByText('刷新页面');

      // Buttons should be focusable
      retryButton.focus();
      expect(retryButton).toHaveFocus();

      // Tab navigation should work
      fireEvent.keyDown(retryButton, { key: 'Tab' });
      expect(reloadButton).toHaveFocus();
    });
  });
});