import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '../user-store';
import { User, UserProfile, AnalysisHistory } from '../../types';

const mockUser: User = {
  id: 'user-1',
  profile: {
    name: 'Test User',
    email: 'test@example.com',
    phone: '123-456-7890',
    location: 'Test City',
    summary: 'Test summary',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    interests: [],
  },
  preferences: {
    aiEngine: 'transformers',
    theme: 'light',
    language: 'zh-CN',
    autoSave: true,
  },
  history: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useUserStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUserStore.setState({
      currentUser: null,
      isAuthenticated: false,
      preferences: {
        aiEngine: 'transformers',
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
      },
      sessionData: {},
    });
  });

  describe('user management', () => {
    it('should set user and authenticate', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.preferences).toEqual(mockUser.preferences);
    });

    it('should update user profile', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      const profileUpdate: Partial<UserProfile> = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      act(() => {
        result.current.updateProfile(profileUpdate);
      });

      expect(result.current.currentUser?.profile.name).toBe('Updated Name');
      expect(result.current.currentUser?.profile.email).toBe('updated@example.com');
      expect(result.current.currentUser?.updatedAt).toBeInstanceOf(Date);
    });

    it('should update preferences', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      act(() => {
        result.current.updatePreferences({
          theme: 'dark',
          aiEngine: 'gpt4o',
        });
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.aiEngine).toBe('gpt4o');
      expect(result.current.currentUser?.preferences.theme).toBe('dark');
    });

    it('should clear user', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.currentUser).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.sessionData).toEqual({});
    });
  });

  describe('history management', () => {
    const mockHistoryItem: AnalysisHistory = {
      id: 'history-1',
      jobId: 'job-1',
      result: {
        id: 'analysis-1',
        userId: 'user-1',
        jobId: 'job-1',
        matchScore: 85,
        detailedScores: [],
        recommendations: [],
        generatedResume: {
          id: 'resume-1',
          template: 'modern',
          content: {
            personalInfo: mockUser.profile,
            summary: 'Test summary',
            skills: [],
            experience: [],
            education: [],
            projects: [],
          },
          optimizedFor: 'Test Job',
          generatedAt: new Date(),
        },
        performanceMetrics: {
          loadTime: 1000,
          aiProcessingTime: 2000,
          renderTime: 500,
          memoryUsage: 50,
          cacheHitRate: 0.8,
        },
        createdAt: new Date(),
      },
      createdAt: new Date(),
    };

    it('should add to history', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      act(() => {
        result.current.addToHistory(mockHistoryItem);
      });

      expect(result.current.currentUser?.history).toHaveLength(1);
      expect(result.current.currentUser?.history[0]).toEqual(mockHistoryItem);
    });

    it('should limit history to 50 items', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      // Add 51 items
      act(() => {
        for (let i = 0; i < 51; i++) {
          result.current.addToHistory({
            ...mockHistoryItem,
            id: `history-${i}`,
          });
        }
      });

      expect(result.current.currentUser?.history).toHaveLength(50);
    });

    it('should remove from history', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
        result.current.addToHistory(mockHistoryItem);
      });

      act(() => {
        result.current.removeFromHistory('history-1');
      });

      expect(result.current.currentUser?.history).toHaveLength(0);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
        result.current.addToHistory(mockHistoryItem);
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.currentUser?.history).toHaveLength(0);
    });
  });

  describe('session data', () => {
    it('should set and get session data', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setSessionData('testKey', 'testValue');
      });

      expect(result.current.getSessionData('testKey')).toBe('testValue');
      expect(result.current.sessionData.testKey).toBe('testValue');
    });

    it('should clear session data', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setSessionData('testKey', 'testValue');
        result.current.clearSessionData();
      });

      expect(result.current.sessionData).toEqual({});
    });
  });

  describe('persistence', () => {
    it('should persist user data to localStorage', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      const persistedData = JSON.parse(localStorage.getItem('user-store') || '{}');
      expect(persistedData.state.currentUser.id).toBe(mockUser.id);
      expect(persistedData.state.currentUser.profile.name).toBe(mockUser.profile.name);
      expect(persistedData.state.isAuthenticated).toBe(true);
    });
  });
});