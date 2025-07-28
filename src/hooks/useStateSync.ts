import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import { useUserStore } from '../stores/user-store';
import { useJobStore } from '../stores/job-store';
import { useAnalysisStore } from '../stores/analysis-store';
import { useUIStore } from '../stores/ui-store';

export function useStateSync() {
  const appStore = useAppStore();
  const userStore = useUserStore();
  const jobStore = useJobStore();
  const analysisStore = useAnalysisStore();
  const uiStore = useUIStore();

  // Sync theme between app store and UI store
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => {
        uiStore.updateChartPreferences({ theme: state.theme });
      }
    );
    return unsubscribe;
  }, [uiStore]);

  // Sync user preferences with app settings
  useEffect(() => {
    const unsubscribe = useUserStore.subscribe(
      (state) => {
        if (state.preferences.theme !== appStore.theme) {
          appStore.setTheme(state.preferences.theme);
        }
        if (state.preferences.language !== appStore.language) {
          appStore.setLanguage(state.preferences.language);
        }
      }
    );
    return unsubscribe;
  }, [appStore]);

  // Sync analysis completion with user history
  useEffect(() => {
    const unsubscribe = useAnalysisStore.subscribe(
      (state) => {
        if (state.currentAnalysis && userStore.currentUser) {
          const historyItem = {
            id: state.currentAnalysis.id,
            jobId: state.currentAnalysis.jobId,
            result: state.currentAnalysis,
            createdAt: state.currentAnalysis.createdAt,
          };
          userStore.addToHistory(historyItem);
        }
      }
    );
    return unsubscribe;
  }, [userStore]);

  // Sync job analysis with analysis store
  useEffect(() => {
    const unsubscribe = useJobStore.subscribe(
      (state) => {
        if (state.currentAnalysis) {
          // Create match result from AI analysis
          const matchResult = {
            overallScore: state.currentAnalysis.matchScore,
            categoryScores: [],
            gaps: [],
            strengths: state.currentAnalysis.suggestions.filter((s: string) => s.includes('优势')),
            recommendations: state.currentAnalysis.suggestions,
          };
          analysisStore.setCurrentMatchResult(matchResult);
        }
      }
    );
    return unsubscribe;
  }, [analysisStore]);

  // Sync loading states between stores
  useEffect(() => {
    const unsubscribeApp = useAppStore.subscribe(
      (state) => {
        uiStore.setGlobalLoading(state.isLoading);
      }
    );

    const unsubscribeJob = useJobStore.subscribe(
      (state) => {
        uiStore.setLoadingState('job-analysis', state.isAnalyzing);
        analysisStore.setAnalyzing(state.isAnalyzing);
      }
    );

    const unsubscribeAnalysis = useAnalysisStore.subscribe(
      (state) => {
        uiStore.setLoadingState('resume-generation', state.isGeneratingResume);
      }
    );

    return () => {
      unsubscribeApp();
      unsubscribeJob();
      unsubscribeAnalysis();
    };
  }, [uiStore, analysisStore]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return;

      try {
        const newValue = JSON.parse(event.newValue);

        switch (event.key) {
          case 'app-store':
            if (newValue.state.theme !== appStore.theme) {
              appStore.setTheme(newValue.state.theme);
            }
            if (newValue.state.language !== appStore.language) {
              appStore.setLanguage(newValue.state.language);
            }
            break;

          case 'user-store':
            if (newValue.state.currentUser !== userStore.currentUser) {
              if (newValue.state.currentUser) {
                userStore.setUser(newValue.state.currentUser);
              } else {
                userStore.clearUser();
              }
            }
            break;

          case 'analysis-store':
            if (newValue.state.analysisHistory.length !== analysisStore.analysisHistory.length) {
              // Sync analysis history across tabs
              newValue.state.analysisHistory.forEach((analysis: any) => {
                if (!analysisStore.getHistoryById(analysis.id)) {
                  analysisStore.addToHistory(analysis);
                }
              });
            }
            break;
        }
      } catch (error) {
        console.warn('Failed to sync state across tabs:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [appStore, userStore, analysisStore]);

  // Data transfer utilities
  const transferJobToAnalysis = useCallback((jobId: string) => {
    const job = jobStore.recentJobs.find(j => j.id === jobId);
    if (job) {
      jobStore.setCurrentJob(job);
      if (job.aiAnalysis) {
        jobStore.setCurrentAnalysis(job.aiAnalysis);
      }
    }
  }, [jobStore]);

  const transferAnalysisToResults = useCallback((analysisId: string) => {
    const analysis = analysisStore.getHistoryById(analysisId);
    if (analysis) {
      analysisStore.setCurrentAnalysis(analysis);
    }
  }, [analysisStore]);

  const shareDataBetweenPages = useCallback((key: string, data: unknown) => {
    uiStore.setFormData(key, data);
  }, [uiStore]);

  const getSharedData = useCallback((key: string) => {
    return uiStore.formData[key];
  }, [uiStore.formData]);

  return {
    transferJobToAnalysis,
    transferAnalysisToResults,
    shareDataBetweenPages,
    getSharedData,
  };
}