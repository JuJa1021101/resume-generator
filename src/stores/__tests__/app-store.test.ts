import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../app-store';

// No need to mock crypto.randomUUID since we have a fallback

describe('useAppStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store state
    useAppStore.setState({
      isInitialized: false,
      isLoading: false,
      theme: 'light',
      language: 'zh-CN',
      performanceMetrics: null,
      error: null,
      sessionId: expect.any(String),
      lastActivity: null,
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.theme).toBe('light');
      expect(result.current.language).toBe('zh-CN');
      expect(result.current.error).toBe(null);
    });

    it('should initialize app successfully', async () => {
      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('theme management', () => {
    it('should update theme', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should apply theme to document', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('language management', () => {
    it('should update language', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLanguage('en-US');
      });

      expect(result.current.language).toBe('en-US');
    });
  });

  describe('performance metrics', () => {
    it('should update performance metrics', () => {
      const { result } = renderHook(() => useAppStore());

      const metrics = {
        loadTime: 1000,
        aiProcessingTime: 2000,
      };

      act(() => {
        result.current.updatePerformanceMetrics(metrics);
      });

      expect(result.current.performanceMetrics).toMatchObject(metrics);
    });

    it('should merge performance metrics', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({ loadTime: 1000 });
      });

      act(() => {
        result.current.updatePerformanceMetrics({ aiProcessingTime: 2000 });
      });

      expect(result.current.performanceMetrics).toMatchObject({
        loadTime: 1000,
        aiProcessingTime: 2000,
      });
    });
  });

  describe('error handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('session management', () => {
    it('should update activity', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateActivity();
      });

      expect(result.current.lastActivity).toBeInstanceOf(Date);
    });

    it('should reset session', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Test error');
        result.current.resetSession();
      });

      expect(result.current.sessionId).toEqual(expect.any(String));
      expect(result.current.error).toBe(null);
      expect(result.current.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('persistence', () => {
    it('should persist theme and language to localStorage', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setLanguage('en-US');
      });

      // Check if data is persisted
      const persistedData = JSON.parse(localStorage.getItem('app-store') || '{}');
      expect(persistedData.state.theme).toBe('dark');
      expect(persistedData.state.language).toBe('en-US');
    });
  });
});