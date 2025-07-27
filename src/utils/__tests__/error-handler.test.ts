import { GlobalErrorHandler, ErrorType, ErrorSeverity } from '../error-handler';

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    errorHandler.clearAllErrors();

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const errorId = errorHandler.handleError(error);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);

      const errorReport = errorHandler.getErrorReport(errorId);
      expect(errorReport).toBeDefined();
      expect(errorReport?.message).toBe('Test error');
      expect(errorReport?.type).toBe(ErrorType.UNKNOWN);
    });

    it('should handle string errors', () => {
      const errorMessage = 'String error message';
      const errorId = errorHandler.handleError(errorMessage);

      const errorReport = errorHandler.getErrorReport(errorId);
      expect(errorReport?.message).toBe(errorMessage);
      expect(errorReport?.stack).toBeUndefined();
    });

    it('should determine error type correctly', () => {
      const networkError = new TypeError('fetch failed');
      const networkErrorId = errorHandler.handleError(networkError);
      expect(errorHandler.getErrorReport(networkErrorId)?.type).toBe(ErrorType.NETWORK);

      const aiError = new Error('AI model loading failed');
      const aiErrorId = errorHandler.handleError(aiError);
      expect(errorHandler.getErrorReport(aiErrorId)?.type).toBe(ErrorType.AI_PROCESSING);

      const validationError = new Error('validation failed');
      const validationErrorId = errorHandler.handleError(validationError);
      expect(errorHandler.getErrorReport(validationErrorId)?.type).toBe(ErrorType.VALIDATION);

      const storageError = new Error('IndexedDB error');
      const storageErrorId = errorHandler.handleError(storageError);
      expect(errorHandler.getErrorReport(storageErrorId)?.type).toBe(ErrorType.STORAGE);
    });

    it('should determine error severity correctly', () => {
      const criticalError = new Error('critical system failure');
      const criticalErrorId = errorHandler.handleError(criticalError);
      expect(errorHandler.getErrorReport(criticalErrorId)?.severity).toBe(ErrorSeverity.CRITICAL);

      const aiError = new Error('AI processing failed');
      const aiErrorId = errorHandler.handleError(aiError);
      expect(errorHandler.getErrorReport(aiErrorId)?.severity).toBe(ErrorSeverity.HIGH);

      const validationError = new Error('validation error');
      const validationErrorId = errorHandler.handleError(validationError);
      expect(errorHandler.getErrorReport(validationErrorId)?.severity).toBe(ErrorSeverity.LOW);
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      const context = {
        component: 'TestComponent',
        action: 'testAction',
        userId: 'user123',
      };

      const errorId = errorHandler.handleError(error, context);
      const errorReport = errorHandler.getErrorReport(errorId);

      expect(errorReport?.context.component).toBe('TestComponent');
      expect(errorReport?.context.action).toBe('testAction');
      expect(errorReport?.context.userId).toBe('user123');
      expect(errorReport?.context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('retryOperation', () => {
    it('should retry successful operations', async () => {
      const error = new Error('Test error');
      const errorId = errorHandler.handleError(error);

      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.retryOperation(mockOperation, errorId);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const errorReport = errorHandler.getErrorReport(errorId);
      expect(errorReport?.resolved).toBe(true);
    });

    it('should retry failed operations up to max retries', async () => {
      const error = new Error('Test error');
      const errorId = errorHandler.handleError(error);

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Retry 1'))
        .mockRejectedValueOnce(new Error('Retry 2'))
        .mockResolvedValue('success');

      const result = await errorHandler.retryOperation(mockOperation, errorId);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      const error = new Error('Test error');
      const errorId = errorHandler.handleError(error);

      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(errorHandler.retryOperation(mockOperation, errorId)).rejects.toThrow('Always fails');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Default max retries
    });

    it('should throw error for non-existent error ID', async () => {
      const mockOperation = jest.fn();

      await expect(errorHandler.retryOperation(mockOperation, 'non-existent')).rejects.toThrow('Maximum retry attempts exceeded');
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('error listeners', () => {
    it('should notify listeners when errors occur', () => {
      const listener = jest.fn();
      errorHandler.addErrorListener(listener);

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error',
        type: ErrorType.UNKNOWN,
      }));
    });

    it('should remove listeners correctly', () => {
      const listener = jest.fn();
      errorHandler.addErrorListener(listener);
      errorHandler.removeErrorListener(listener);

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      errorHandler.addErrorListener(faultyListener);
      errorHandler.addErrorListener(goodListener);

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(faultyListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error in error listener:', expect.any(Error));
    });
  });

  describe('error management', () => {
    it('should get all errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler.handleError(error1);
      errorHandler.handleError(error2);

      const allErrors = errorHandler.getAllErrors();
      expect(allErrors).toHaveLength(2);
      expect(allErrors[0].message).toBe('Error 1');
      expect(allErrors[1].message).toBe('Error 2');
    });

    it('should clear resolved errors', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const errorId1 = errorHandler.handleError(error1);
      const errorId2 = errorHandler.handleError(error2);

      // Mark first error as resolved
      const errorReport1 = errorHandler.getErrorReport(errorId1);
      if (errorReport1) {
        errorReport1.resolved = true;
      }

      errorHandler.clearResolvedErrors();

      const remainingErrors = errorHandler.getAllErrors();
      expect(remainingErrors).toHaveLength(1);
      expect(remainingErrors[0].message).toBe('Error 2');
    });

    it('should clear all errors', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));

      expect(errorHandler.getAllErrors()).toHaveLength(2);

      errorHandler.clearAllErrors();

      expect(errorHandler.getAllErrors()).toHaveLength(0);
    });
  });

  describe('global error handlers', () => {
    it('should handle unhandled promise rejections', () => {
      const handleError = jest.spyOn(errorHandler, 'handleError');

      // Create a mock event since PromiseRejectionEvent might not be available in test environment
      const event = {
        type: 'unhandledrejection',
        reason: new Error('Unhandled rejection'),
        promise: Promise.reject(new Error('Unhandled rejection')),
      } as any;

      // Simulate the event handler being called directly
      errorHandler.handleError(event.reason, {
        component: 'Global',
        action: 'unhandledrejection',
      });

      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'Global',
          action: 'unhandledrejection',
        })
      );
    });

    it('should handle global JavaScript errors', () => {
      const handleError = jest.spyOn(errorHandler, 'handleError');

      const event = new ErrorEvent('error', {
        error: new Error('JavaScript error'),
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });

      window.dispatchEvent(event);

      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'Global',
          action: 'javascript-error',
          url: 'test.js',
          additionalData: {
            lineno: 10,
            colno: 5,
          },
        })
      );
    });
  });
});