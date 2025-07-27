import { renderHook, act } from '@testing-library/react';
import { useStateSync } from '../useStateSync';
import { useAppStore } from '../../stores/app-store';
import { useUserStore } from '../../stores/user-store';
import { useJobStore } from '../../stores/job-store';
import { useAnalysisStore } from '../../stores/analysis-store';
import { useUIStore } from '../../stores/ui-store';

// No need to mock crypto.randomUUID since we have a fallback

describe('useStateSync', () => {
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

  it('should provide data transfer utilities', () => {
    const { result } = renderHook(() => useStateSync());

    expect(typeof result.current.transferJobToAnalysis).toBe('function');
    expect(typeof result.current.transferAnalysisToResults).toBe('function');
    expect(typeof result.current.shareDataBetweenPages).toBe('function');
    expect(typeof result.current.getSharedData).toBe('function');
  });

  it('should transfer job to analysis', () => {
    const { result } = renderHook(() => useStateSync());

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
        suggestions: [],
        processingTime: 2000,
        confidence: 0.9,
      },
    };

    // Add job to recent jobs
    act(() => {
      useJobStore.getState().addToRecentJobs(mockJob);
    });

    // Transfer job to analysis
    act(() => {
      result.current.transferJobToAnalysis('job-1');
    });

    const jobState = useJobStore.getState();
    expect(jobState.currentJob).toEqual(mockJob);
    expect(jobState.currentAnalysis).toEqual(mockJob.aiAnalysis);
  });

  it('should transfer analysis to results', () => {
    const { result } = renderHook(() => useStateSync());

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
          personalInfo: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '123-456-7890',
            location: 'Test City',
            linkedin: '',
            github: '',
            website: '',
          },
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

    // Add analysis to history
    act(() => {
      useAnalysisStore.getState().addToHistory(mockAnalysis);
    });

    // Transfer analysis to results
    act(() => {
      result.current.transferAnalysisToResults('analysis-1');
    });

    const analysisState = useAnalysisStore.getState();
    expect(analysisState.currentAnalysis).toEqual(mockAnalysis);
  });

  it('should share and get data between pages', () => {
    const { result } = renderHook(() => useStateSync());

    const testData = { key: 'value', number: 42 };

    act(() => {
      result.current.shareDataBetweenPages('testKey', testData);
    });

    const retrievedData = result.current.getSharedData('testKey');
    expect(retrievedData).toEqual(testData);

    // Check if data is stored in UI store
    const uiState = useUIStore.getState();
    expect(uiState.formData.testKey).toEqual(testData);
  });

  it('should handle non-existent job transfer', () => {
    const { result } = renderHook(() => useStateSync());

    // Try to transfer non-existent job
    act(() => {
      result.current.transferJobToAnalysis('non-existent-job');
    });

    const jobState = useJobStore.getState();
    expect(jobState.currentJob).toBe(null);
  });

  it('should handle non-existent analysis transfer', () => {
    const { result } = renderHook(() => useStateSync());

    // Try to transfer non-existent analysis
    act(() => {
      result.current.transferAnalysisToResults('non-existent-analysis');
    });

    const analysisState = useAnalysisStore.getState();
    expect(analysisState.currentAnalysis).toBe(null);
  });

  it('should return undefined for non-existent shared data', () => {
    const { result } = renderHook(() => useStateSync());

    const retrievedData = result.current.getSharedData('non-existent-key');
    expect(retrievedData).toBeUndefined();
  });
});