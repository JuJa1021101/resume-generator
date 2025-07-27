import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserPreferences, PerformanceMetrics } from '../types';

export interface AppState {
  // Application state
  isInitialized: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';

  // Performance tracking
  performanceMetrics: PerformanceMetrics | null;

  // Error handling
  error: string | null;

  // Session management
  sessionId: string;
  lastActivity: Date | null;
}

export interface AppActions {
  // Initialization
  initialize: () => Promise<void>;
  setLoading: (loading: boolean) => void;

  // Theme and language
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'zh-CN' | 'en-US') => void;

  // Performance tracking
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Session management
  updateActivity: () => void;
  resetSession: () => void;
}

// Fallback for crypto.randomUUID in test environments
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const initialState: AppState = {
  isInitialized: false,
  isLoading: false,
  theme: 'light',
  language: 'zh-CN',
  performanceMetrics: null,
  error: null,
  sessionId: generateUUID(),
  lastActivity: null,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Initialization
      initialize: async () => {
        set({ isLoading: true });
        try {
          // Initialize application services
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate initialization
          set({
            isInitialized: true,
            isLoading: false,
            lastActivity: new Date()
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Initialization failed',
            isLoading: false
          });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Theme and language
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        // Apply theme to document
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      setLanguage: (language: 'zh-CN' | 'en-US') => set({ language }),

      // Performance tracking
      updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
        const current = get().performanceMetrics;
        set({
          performanceMetrics: {
            loadTime: 0,
            aiProcessingTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            ...current,
            ...metrics,
          }
        });
      },

      // Error handling
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      // Session management
      updateActivity: () => set({ lastActivity: new Date() }),

      resetSession: () => set({
        sessionId: generateUUID(),
        lastActivity: new Date(),
        error: null
      }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sessionId: state.sessionId,
      }),
    }
  )
);