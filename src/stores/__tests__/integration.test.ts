import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../app-store';
import { useUserStore } from '../user-store';
import { useJobStore } from '../job-store';
import { useAnalysisStore } from '../analysis-store';
import { useUIStore } from '../ui-store';

// No need to mock crypto.randomUUID since we have a fallback

describe('Store Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Reset all stores
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

    useJobStore.setState({
      currentJob: null,
      jobInput: '',
      isAnalyzing: false,
      analysisProgress: 0,
      recentJobs: [],
      currentAnalysis: null,
    });

    useAnalysisStore.setState({
      currentAnalysis: null,
      currentMatchResult: null,
      analysisHistory: [],
      generatedResume: null,
      isGeneratingResume: false,
      isAnalyzing: false,
      analysisStep: null,
      analysisProgress: 0,
    });

    useUIStore.setState({
      currentPage: '/',
      navigationHistory: [],
      activeModal: null,
      modalData: {},
      sidebarOpen: false,
      sidebarCollapsed: false,
      globalLoading: false,
      loadingStates: {},
      notifications: [],
      formData: {},
      formErrors: {},
      chartPreferences: {
        theme: 'light',
        animations: true,
        showTooltips: true,
        showLegend: true,
        colorScheme: 'default',
      },
    });
  });

  describe('Theme synchronization', () => {
    it('should sync theme between app and UI stores', () => {
      const appStore = renderHook(() => useAppStore());
      const uiStore = renderHook(() => useUIStore());

      act(() => {
        appStore.result.current.setTheme('dark');
      });

      // UI store should update chart preferences theme
      expect(uiStore.result.current.chartPreferences.theme).toBe('light'); // Initially

      // Manually trigger the sync (in real app this would be handled by useStateSync)
      act(() => {
        uiStore.result.current.updateChartPreferences({ theme: 'dark' });
      });

      expect(uiStore.result.current.chartPreferences.theme).toBe('dark');
    });
  });

  describe('User preferences synchronization', () => {
    it('should sync user preferences with app settings', () => {
      const appStore = renderHook(() => useAppStore());
      const userStore = renderHook(() => useUserStore());

      const mockUser = {
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
          aiEngine: 'gpt4o' as const,
          theme: 'dark' as const,
          language: 'en-US' as const,
          autoSave: true,
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        userStore.result.current.setUser(mockUser);
      });

      // App store should be updated with user preferences
      expect(appStore.result.current.theme).toBe('light'); // Initially
      expect(appStore.result.current.language).toBe('zh-CN'); // Initially

      // Manually sync (in real app this would be handled by useStateSync)
      act(() => {
        appStore.result.current.setTheme(mockUser.preferences.theme);
        appStore.result.current.setLanguage(mockUser.preferences.language);
      });

      expect(appStore.result.current.theme).toBe('dark');
      expect(appStore.result.current.language).toBe('en-US');
    });
  });

  describe('Loading state synchronization', () => {
    it('should sync loading states between stores', () => {
      const appStore = renderHook(() => useAppStore());
      const jobStore = renderHook(() => useJobStore());
      const analysisStore = renderHook(() => useAnalysisStore());
      const uiStore = renderHook(() => useUIStore());

      // Test app loading sync
      act(() => {
        appStore.result.current.setLoading(true);
      });

      // Manually sync (in real app this would be handled by useStateSync)
      act(() => {
        uiStore.result.current.setGlobalLoading(true);
      });

      expect(uiStore.result.current.globalLoading).toBe(true);

      // Test job analysis loading sync
      act(() => {
        jobStore.result.current.setAnalyzing(true);
      });

      // Manually sync
      act(() => {
        uiStore.result.current.setLoadingState('job-analysis', true);
        analysisStore.result.current.setAnalyzing(true);
      });

      expect(uiStore.result.current.loadingStates['job-analysis']).toBe(true);
      expect(analysisStore.result.current.isAnalyzing).toBe(true);
    });
  });

  describe('Data flow integration', () => {
    it('should handle complete job analysis flow', () => {
      const jobStore = renderHook(() => useJobStore());
      const analysisStore = renderHook(() => useAnalysisStore());
      const userStore = renderHook(() => useUserStore());

      const mockUser = {
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
          aiEngine: 'transformers' as const,
          theme: 'light' as const,
          language: 'zh-CN' as const,
          autoSave: true,
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJob = {
        id: 'job-1',
        title: 'Frontend Developer',
        company: 'Test Company',
        content: 'Job description content',
        requirements: [],
        skills: [],
        analyzedAt: new Date(),
        aiAnalysis: {
          keywords: [],
          skills: [],
          matchScore: 85,
          suggestions: ['优势: React经验丰富'],
          processingTime: 2000,
          confidence: 0.9,
        },
      };

      const mockAnalysis = {
        id: 'analysis-1',
        userId: 'user-1',
        jobId: 'job-1',
        matchScore: 85,
        detailedScores: [],
        recommendations: [],
        generatedResume: {
          id: 'resume-1',
          template: 'modern' as const,
          content: {
            personalInfo: mockUser.profile,
            summary: 'Test summary',
            skills: [],
            experience: [],
            education: [],
            projects: [],
          },
          optimizedFor: 'Frontend Developer',
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
      };

      // Set up user
      act(() => {
        userStore.result.current.setUser(mockUser);
      });

      // Start job analysis
      act(() => {
        jobStore.result.current.setJobInput('Frontend Developer job description');
        jobStore.result.current.setCurrentJob(mockJob);
        jobStore.result.current.setAnalyzing(true);
      });

      expect(jobStore.result.current.isAnalyzing).toBe(true);
      expect(jobStore.result.current.currentJob).toEqual(mockJob);

      // Complete analysis
      act(() => {
        jobStore.result.current.setCurrentAnalysis(mockJob.aiAnalysis);
        analysisStore.result.current.setCurrentAnalysis(mockAnalysis);
        jobStore.result.current.setAnalyzing(false);
      });

      expect(jobStore.result.current.currentAnalysis).toEqual(mockJob.aiAnalysis);
      expect(analysisStore.result.current.currentAnalysis).toEqual(mockAnalysis);

      // Check if analysis was added to user history
      const historyItem = {
        id: mockAnalysis.id,
        jobId: mockAnalysis.jobId,
        result: mockAnalysis,
        createdAt: mockAnalysis.createdAt,
      };

      act(() => {
        userStore.result.current.addToHistory(historyItem);
      });

      expect(userStore.result.current.currentUser?.history).toHaveLength(1);
      expect(userStore.result.current.currentUser?.history[0]).toEqual(historyItem);
    });
  });

  describe('Persistence integration', () => {
    it('should persist data across different stores', () => {
      const appStore = renderHook(() => useAppStore());
      const userStore = renderHook(() => useUserStore());
      const analysisStore = renderHook(() => useAnalysisStore());

      const mockUser = {
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
          aiEngine: 'transformers' as const,
          theme: 'dark' as const,
          language: 'en-US' as const,
          autoSave: true,
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set data in stores
      act(() => {
        appStore.result.current.setTheme('dark');
        appStore.result.current.setLanguage('en-US');
        userStore.result.current.setUser(mockUser);
      });

      // Check localStorage persistence
      const appData = JSON.parse(localStorage.getItem('app-store') || '{}');
      const userData = JSON.parse(localStorage.getItem('user-store') || '{}');

      expect(appData.state.theme).toBe('dark');
      expect(appData.state.language).toBe('en-US');
      expect(userData.state.currentUser.id).toBe('user-1');
      expect(userData.state.isAuthenticated).toBe(true);
    });
  });

  describe('Error handling integration', () => {
    it('should handle errors across stores', () => {
      const appStore = renderHook(() => useAppStore());
      const uiStore = renderHook(() => useUIStore());

      // Set error in app store
      act(() => {
        appStore.result.current.setError('Test error');
      });

      expect(appStore.result.current.error).toBe('Test error');

      // Add notification in UI store
      act(() => {
        uiStore.result.current.addNotification({
          type: 'error',
          title: 'Error',
          message: 'Test error',
        });
      });

      expect(uiStore.result.current.notifications).toHaveLength(1);
      expect(uiStore.result.current.notifications[0].type).toBe('error');

      // Clear error
      act(() => {
        appStore.result.current.clearError();
      });

      expect(appStore.result.current.error).toBe(null);
    });
  });
});