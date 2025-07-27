import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserProfile, UserPreferences, AnalysisHistory } from '../types';

export interface UserState {
  // User data
  currentUser: User | null;
  isAuthenticated: boolean;

  // User preferences
  preferences: UserPreferences;

  // Session data
  sessionData: Record<string, unknown>;
}

export interface UserActions {
  // User management
  setUser: (user: User) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  clearUser: () => void;

  // History management
  addToHistory: (historyItem: AnalysisHistory) => void;
  removeFromHistory: (historyId: string) => void;
  clearHistory: () => void;

  // Session data
  setSessionData: (key: string, value: unknown) => void;
  getSessionData: (key: string) => unknown;
  clearSessionData: () => void;
}

const defaultPreferences: UserPreferences = {
  aiEngine: 'transformers',
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
};

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  preferences: defaultPreferences,
  sessionData: {},
};

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // User management
      setUser: (user: User) => {
        set({
          currentUser: user,
          isAuthenticated: true,
          preferences: {
            ...defaultPreferences,
            ...user.preferences
          }
        });
      },

      updateProfile: (profileUpdate: Partial<UserProfile>) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedUser: User = {
          ...currentUser,
          profile: {
            ...currentUser.profile,
            ...profileUpdate,
          },
          updatedAt: new Date(),
        };

        set({ currentUser: updatedUser });
      },

      updatePreferences: (preferencesUpdate: Partial<UserPreferences>) => {
        const currentUser = get().currentUser;
        const newPreferences = {
          ...get().preferences,
          ...preferencesUpdate,
        };

        set({ preferences: newPreferences });

        if (currentUser) {
          const updatedUser: User = {
            ...currentUser,
            preferences: newPreferences,
            updatedAt: new Date(),
          };
          set({ currentUser: updatedUser });
        }
      },

      clearUser: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          preferences: defaultPreferences,
          sessionData: {},
        });
      },

      // History management
      addToHistory: (historyItem: AnalysisHistory) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedHistory = [historyItem, ...currentUser.history].slice(0, 50); // Keep last 50 items
        const updatedUser: User = {
          ...currentUser,
          history: updatedHistory,
          updatedAt: new Date(),
        };

        set({ currentUser: updatedUser });
      },

      removeFromHistory: (historyId: string) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedHistory = currentUser.history.filter(item => item.id !== historyId);
        const updatedUser: User = {
          ...currentUser,
          history: updatedHistory,
          updatedAt: new Date(),
        };

        set({ currentUser: updatedUser });
      },

      clearHistory: () => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updatedUser: User = {
          ...currentUser,
          history: [],
          updatedAt: new Date(),
        };

        set({ currentUser: updatedUser });
      },

      // Session data
      setSessionData: (key: string, value: unknown) => {
        set(state => ({
          sessionData: {
            ...state.sessionData,
            [key]: value,
          }
        }));
      },

      getSessionData: (key: string) => {
        return get().sessionData[key];
      },

      clearSessionData: () => {
        set({ sessionData: {} });
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        preferences: state.preferences,
      }),
    }
  )
);