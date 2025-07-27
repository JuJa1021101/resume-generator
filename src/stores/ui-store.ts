import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UIState {
  // Navigation state
  currentPage: string;
  navigationHistory: string[];

  // Modal and overlay state
  activeModal: string | null;
  modalData: Record<string, unknown>;

  // Sidebar and layout
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;

  // Notifications
  notifications: Notification[];

  // Form state
  formData: Record<string, unknown>;
  formErrors: Record<string, string[]>;

  // Chart and visualization preferences
  chartPreferences: ChartPreferences;
}

export interface UIActions {
  // Navigation
  setCurrentPage: (page: string) => void;
  navigateBack: () => void;
  clearNavigationHistory: () => void;

  // Modal management
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setModalData: (data: unknown) => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Loading states
  setGlobalLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  clearLoadingStates: () => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Form management
  setFormData: (key: string, value: unknown) => void;
  setFormErrors: (key: string, errors: string[]) => void;
  clearFormData: (key?: string) => void;
  clearFormErrors: (key?: string) => void;

  // Chart preferences
  updateChartPreferences: (preferences: Partial<ChartPreferences>) => void;

  // Reset UI state
  resetUIState: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

interface ChartPreferences {
  theme: 'light' | 'dark';
  animations: boolean;
  showTooltips: boolean;
  showLegend: boolean;
  colorScheme: 'default' | 'colorblind' | 'monochrome';
}

const defaultChartPreferences: ChartPreferences = {
  theme: 'light',
  animations: true,
  showTooltips: true,
  showLegend: true,
  colorScheme: 'default',
};

const initialState: UIState = {
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
  chartPreferences: defaultChartPreferences,
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setCurrentPage: (page: string) => {
        const currentPage = get().currentPage;
        const history = get().navigationHistory;

        set({
          currentPage: page,
          navigationHistory: [currentPage, ...history].slice(0, 10), // Keep last 10 pages
        });
      },

      navigateBack: () => {
        const history = get().navigationHistory;
        if (history.length > 0) {
          const [previousPage, ...remainingHistory] = history;
          set({
            currentPage: previousPage,
            navigationHistory: remainingHistory,
          });
        }
      },

      clearNavigationHistory: () => set({ navigationHistory: [] }),

      // Modal management
      openModal: (modalId: string, data?: unknown) => {
        set({
          activeModal: modalId,
          modalData: data ? { [modalId]: data } : {},
        });
      },

      closeModal: () => {
        set({
          activeModal: null,
          modalData: {},
        });
      },

      setModalData: (data: unknown) => {
        const activeModal = get().activeModal;
        if (activeModal) {
          set({
            modalData: {
              ...get().modalData,
              [activeModal]: data,
            },
          });
        }
      },

      // Sidebar
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      toggleSidebarCollapse: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // Loading states
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),

      setLoadingState: (key: string, loading: boolean) => {
        set(state => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        }));
      },

      clearLoadingStates: () => set({ loadingStates: {} }),

      // Notifications
      addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
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

        const newNotification: Notification = {
          ...notification,
          id: generateUUID(),
          timestamp: new Date(),
        };

        set(state => ({
          notifications: [newNotification, ...state.notifications].slice(0, 10), // Keep last 10
        }));

        // Auto-remove notification if specified
        if (notification.autoClose !== false) {
          const duration = notification.duration || 5000;
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, duration);
        }
      },

      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => set({ notifications: [] }),

      // Form management
      setFormData: (key: string, value: unknown) => {
        set(state => ({
          formData: {
            ...state.formData,
            [key]: value,
          },
        }));
      },

      setFormErrors: (key: string, errors: string[]) => {
        set(state => ({
          formErrors: {
            ...state.formErrors,
            [key]: errors,
          },
        }));
      },

      clearFormData: (key?: string) => {
        if (key) {
          set(state => {
            const { [key]: removed, ...rest } = state.formData;
            return { formData: rest };
          });
        } else {
          set({ formData: {} });
        }
      },

      clearFormErrors: (key?: string) => {
        if (key) {
          set(state => {
            const { [key]: removed, ...rest } = state.formErrors;
            return { formErrors: rest };
          });
        } else {
          set({ formErrors: {} });
        }
      },

      // Chart preferences
      updateChartPreferences: (preferences: Partial<ChartPreferences>) => {
        set(state => ({
          chartPreferences: {
            ...state.chartPreferences,
            ...preferences,
          },
        }));
      },

      // Reset UI state
      resetUIState: () => set({
        ...initialState,
        chartPreferences: get().chartPreferences, // Preserve chart preferences
      }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        chartPreferences: state.chartPreferences,
      }),
    }
  )
);