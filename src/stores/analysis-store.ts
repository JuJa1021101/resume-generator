import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AnalysisResult, MatchResult, GeneratedResume } from '../types';

export interface AnalysisState {
  // Current analysis
  currentAnalysis: AnalysisResult | null;
  currentMatchResult: MatchResult | null;

  // Analysis history
  analysisHistory: AnalysisResult[];

  // Resume generation
  generatedResume: GeneratedResume | null;
  isGeneratingResume: boolean;

  // Analysis state
  isAnalyzing: boolean;
  analysisStep: 'parsing' | 'matching' | 'generating' | 'complete' | null;
  analysisProgress: number;
}

export interface AnalysisActions {
  // Current analysis management
  setCurrentAnalysis: (analysis: AnalysisResult) => void;
  setCurrentMatchResult: (matchResult: MatchResult) => void;
  clearCurrentAnalysis: () => void;

  // Analysis process management
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisStep: (step: 'parsing' | 'matching' | 'generating' | 'complete' | null) => void;
  setAnalysisProgress: (progress: number) => void;

  // History management
  addToHistory: (analysis: AnalysisResult) => void;
  removeFromHistory: (analysisId: string) => void;
  clearHistory: () => void;
  getHistoryById: (analysisId: string) => AnalysisResult | undefined;

  // Resume generation
  setGeneratedResume: (resume: GeneratedResume) => void;
  setGeneratingResume: (generating: boolean) => void;
  clearGeneratedResume: () => void;

  // Reset state
  resetAnalysisState: () => void;
}

const initialState: AnalysisState = {
  currentAnalysis: null,
  currentMatchResult: null,
  analysisHistory: [],
  generatedResume: null,
  isGeneratingResume: false,
  isAnalyzing: false,
  analysisStep: null,
  analysisProgress: 0,
};

export const useAnalysisStore = create<AnalysisState & AnalysisActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Current analysis management
      setCurrentAnalysis: (analysis: AnalysisResult) => {
        set({ currentAnalysis: analysis });

        // Auto-add to history
        const history = get().analysisHistory;
        const existingIndex = history.findIndex(a => a.id === analysis.id);

        if (existingIndex === -1) {
          const updatedHistory = [analysis, ...history].slice(0, 100); // Keep last 100
          set({ analysisHistory: updatedHistory });
        }
      },

      setCurrentMatchResult: (matchResult: MatchResult) => {
        set({ currentMatchResult: matchResult });
      },

      clearCurrentAnalysis: () => {
        set({
          currentAnalysis: null,
          currentMatchResult: null,
          generatedResume: null,
          analysisStep: null,
          analysisProgress: 0,
        });
      },

      // Analysis process management
      setAnalyzing: (analyzing: boolean) => {
        set({ isAnalyzing: analyzing });
        if (!analyzing) {
          set({
            analysisStep: null,
            analysisProgress: 0
          });
        }
      },

      setAnalysisStep: (step: 'parsing' | 'matching' | 'generating' | 'complete' | null) => {
        set({ analysisStep: step });

        // Auto-update progress based on step
        const progressMap = {
          parsing: 25,
          matching: 50,
          generating: 75,
          complete: 100,
        };

        if (step && step in progressMap) {
          set({ analysisProgress: progressMap[step] });
        }
      },

      setAnalysisProgress: (progress: number) => {
        set({ analysisProgress: Math.max(0, Math.min(100, progress)) });
      },

      // History management
      addToHistory: (analysis: AnalysisResult) => {
        const history = get().analysisHistory;
        const existingIndex = history.findIndex(a => a.id === analysis.id);

        let updatedHistory: AnalysisResult[];
        if (existingIndex === -1) {
          updatedHistory = [analysis, ...history].slice(0, 100);
        } else {
          updatedHistory = [
            analysis,
            ...history.filter(a => a.id !== analysis.id)
          ];
        }

        set({ analysisHistory: updatedHistory });
      },

      removeFromHistory: (analysisId: string) => {
        const history = get().analysisHistory;
        const updatedHistory = history.filter(analysis => analysis.id !== analysisId);
        set({ analysisHistory: updatedHistory });
      },

      clearHistory: () => set({ analysisHistory: [] }),

      getHistoryById: (analysisId: string) => {
        const history = get().analysisHistory;
        return history.find(analysis => analysis.id === analysisId);
      },

      // Resume generation
      setGeneratedResume: (resume: GeneratedResume) => {
        set({ generatedResume: resume });
      },

      setGeneratingResume: (generating: boolean) => {
        set({ isGeneratingResume: generating });
      },

      clearGeneratedResume: () => {
        set({ generatedResume: null });
      },

      // Reset state
      resetAnalysisState: () => set(initialState),
    }),
    {
      name: 'analysis-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        analysisHistory: state.analysisHistory,
      }),
    }
  )
);