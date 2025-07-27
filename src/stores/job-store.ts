import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { JobDescription, AIAnalysisResult } from '../types';

export interface JobState {
  // Current job being analyzed
  currentJob: JobDescription | null;

  // Job input state
  jobInput: string;
  isAnalyzing: boolean;
  analysisProgress: number;

  // Recent jobs
  recentJobs: JobDescription[];

  // Analysis results
  currentAnalysis: AIAnalysisResult | null;
}

export interface JobActions {
  // Job input management
  setJobInput: (input: string) => void;
  clearJobInput: () => void;

  // Job analysis
  setCurrentJob: (job: JobDescription) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;
  setCurrentAnalysis: (analysis: AIAnalysisResult) => void;

  // Recent jobs management
  addToRecentJobs: (job: JobDescription) => void;
  removeFromRecentJobs: (jobId: string) => void;
  clearRecentJobs: () => void;

  // Reset state
  resetJobState: () => void;
}

const initialState: JobState = {
  currentJob: null,
  jobInput: '',
  isAnalyzing: false,
  analysisProgress: 0,
  recentJobs: [],
  currentAnalysis: null,
};

export const useJobStore = create<JobState & JobActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Job input management
      setJobInput: (input: string) => set({ jobInput: input }),

      clearJobInput: () => set({
        jobInput: '',
        currentJob: null,
        currentAnalysis: null,
        analysisProgress: 0
      }),

      // Job analysis
      setCurrentJob: (job: JobDescription) => {
        set({ currentJob: job });

        // Add to recent jobs if not already there
        const recentJobs = get().recentJobs;
        const existingIndex = recentJobs.findIndex(j => j.id === job.id);

        if (existingIndex === -1) {
          const updatedRecentJobs = [job, ...recentJobs].slice(0, 10); // Keep last 10
          set({ recentJobs: updatedRecentJobs });
        } else {
          // Move to front if already exists
          const updatedRecentJobs = [
            job,
            ...recentJobs.filter(j => j.id !== job.id)
          ];
          set({ recentJobs: updatedRecentJobs });
        }
      },

      setAnalyzing: (analyzing: boolean) => {
        set({ isAnalyzing: analyzing });
        if (!analyzing) {
          set({ analysisProgress: 0 });
        }
      },

      setAnalysisProgress: (progress: number) => {
        set({ analysisProgress: Math.max(0, Math.min(100, progress)) });
      },

      setCurrentAnalysis: (analysis: AIAnalysisResult) => {
        set({ currentAnalysis: analysis });
      },

      // Recent jobs management
      addToRecentJobs: (job: JobDescription) => {
        const recentJobs = get().recentJobs;
        const existingIndex = recentJobs.findIndex(j => j.id === job.id);

        let updatedRecentJobs: JobDescription[];
        if (existingIndex === -1) {
          updatedRecentJobs = [job, ...recentJobs].slice(0, 10);
        } else {
          updatedRecentJobs = [
            job,
            ...recentJobs.filter(j => j.id !== job.id)
          ];
        }

        set({ recentJobs: updatedRecentJobs });
      },

      removeFromRecentJobs: (jobId: string) => {
        const recentJobs = get().recentJobs;
        const updatedRecentJobs = recentJobs.filter(job => job.id !== jobId);
        set({ recentJobs: updatedRecentJobs });
      },

      clearRecentJobs: () => set({ recentJobs: [] }),

      // Reset state
      resetJobState: () => set(initialState),
    }),
    {
      name: 'job-store',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for job data
      partialize: (state) => ({
        recentJobs: state.recentJobs,
        jobInput: state.jobInput,
      }),
    }
  )
);