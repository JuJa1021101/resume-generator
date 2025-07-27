import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { useToast } from '../useToast';
import { errorHandler } from '../../utils/error-handler';

// Mock the toast hook
jest.mock('../useToast');
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock the error handler
jest.mock('../../utils/error-handler');
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;

describe('useErrorHandler', () => {
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();
  const mockShowInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: jest.fn(),
      hideToast: jest.fn(),
      clearAllToasts: jest.fn(),
      showSuccess: jest.fn(),
      showError: mockShowError,
      showWarning: mockShowWarning,
      showInfo: mockShowInfo,
    });

    mockErrorHandler.addErrorListener = jest.fn();
    mockErrorHandler.removeErrorListener = jest.fn();
    mockErrorHandler.handleError = jest.fn().mockReturnValue('error-id-123');
    mockErrorHandler.getErrorReport = jest.fn();
    mockErrorHandler.retryOperation = jest.fn();
    mockErrorHandler.clearAllErrors = jest.fn();
  });

  it('should initialize with empty errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.errors).toEqual([]);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should handle errors and return error ID', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      const errorId = result.current.handleError(new Error('Test error'));
      expect(errorId).toBe('error-id-123');
    });

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.any(Error),
      undefined
    );
  });

  it('should handle errors with context', () => {
    const { result } = renderHook(() => useErrorHandler());
    const context = { component: 'TestComponent' };

    act(() => {
      result.current.handleError('Test error', context);
    });

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      'Test error',
      context
    );
  });

  it('should add and remove error listeners', () => {
    const { unmount } = renderHook(() => useErrorHandler());

    expect(mockErrorHandler.addErrorListener).toHaveBeenCalledWith(
      expect.any(Function)
    );

    unmount();

    expect(mockErrorHandler.removeErrorListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('should update errors when error listener is called', () => {
    let errorListener: (error: any) => void;

    mockErrorHandler.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
    });

    const { result } = renderHook(() => useErrorHandler());

    const mockError = {
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 0,
      maxRetries: 3,
    };

    act(() => {
      errorListener!(mockError);
    });

    expect(result.current.errors).toContain(mockError);
  });

  it('should show toast notifications for errors', () => {
    let errorListener: (error: any) => void;

    mockErrorHandler.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
    });

    renderHook(() => useErrorHandler({ showToasts: true }));

    const mockError = {
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 0,
      maxRetries: 3,
    };

    act(() => {
      errorListener!(mockError);
    });

    expect(mockShowError).toHaveBeenCalledWith(
      '网络错误',
      expect.stringContaining('网络连接出现问题')
    );
  });

  it('should show different toast types based on severity', () => {
    let errorListener: (error: any) => void;

    mockErrorHandler.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
    });

    renderHook(() => useErrorHandler({ showToasts: true }));

    // High severity error
    act(() => {
      errorListener!({
        id: 'error-1',
        type: 'AI_PROCESSING',
        severity: 'HIGH',
        message: 'AI error',
        context: { timestamp: new Date() },
        resolved: false,
        retryCount: 0,
        maxRetries: 3,
      });
    });

    expect(mockShowError).toHaveBeenCalled();

    // Medium severity error
    act(() => {
      errorListener!({
        id: 'error-2',
        type: 'TIMEOUT',
        severity: 'MEDIUM',
        message: 'Timeout error',
        context: { timestamp: new Date() },
        resolved: false,
        retryCount: 0,
        maxRetries: 3,
      });
    });

    expect(mockShowWarning).toHaveBeenCalled();

    // Low severity error
    act(() => {
      errorListener!({
        id: 'error-3',
        type: 'VALIDATION',
        severity: 'LOW',
        message: 'Validation error',
        context: { timestamp: new Date() },
        resolved: false,
        retryCount: 0,
        maxRetries: 3,
      });
    });

    expect(mockShowInfo).toHaveBeenCalled();
  });

  it('should retry errors', async () => {
    mockErrorHandler.getErrorReport.mockReturnValue({
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 1,
      maxRetries: 3,
    });

    mockErrorHandler.retryOperation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useErrorHandler());

    await act(async () => {
      await result.current.retryError('error-1');
    });

    expect(mockErrorHandler.retryOperation).toHaveBeenCalledWith(
      expect.any(Function),
      'error-1'
    );
  });

  it('should not retry errors that exceed max retries', async () => {
    mockErrorHandler.getErrorReport.mockReturnValue({
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 3,
      maxRetries: 3,
    });

    const { result } = renderHook(() => useErrorHandler());

    await act(async () => {
      await result.current.retryError('error-1');
    });

    expect(mockErrorHandler.retryOperation).not.toHaveBeenCalled();
  });

  it('should clear individual errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    // Add an error first
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    act(() => {
      result.current.clearError('error-1');
    });

    expect(result.current.errors.find(e => e.id === 'error-1')).toBeUndefined();
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.clearAllErrors();
    });

    expect(result.current.errors).toEqual([]);
    expect(mockErrorHandler.clearAllErrors).toHaveBeenCalled();
  });

  it('should handle retry failures gracefully', async () => {
    mockErrorHandler.getErrorReport.mockReturnValue({
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 1,
      maxRetries: 3,
    });

    mockErrorHandler.retryOperation.mockRejectedValue(new Error('Retry failed'));

    const { result } = renderHook(() => useErrorHandler());

    await act(async () => {
      await result.current.retryError('error-1');
    });

    expect(result.current.isRetrying).toBe(false);
  });

  it('should disable toasts when showToasts is false', () => {
    let errorListener: (error: any) => void;

    mockErrorHandler.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
    });

    renderHook(() => useErrorHandler({ showToasts: false }));

    const mockError = {
      id: 'error-1',
      type: 'NETWORK',
      severity: 'HIGH',
      message: 'Network error',
      context: { timestamp: new Date() },
      resolved: false,
      retryCount: 0,
      maxRetries: 3,
    };

    act(() => {
      errorListener!(mockError);
    });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockShowWarning).not.toHaveBeenCalled();
    expect(mockShowInfo).not.toHaveBeenCalled();
  });
});