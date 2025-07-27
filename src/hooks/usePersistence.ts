import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import { useUserStore } from '../stores/user-store';
import { useJobStore } from '../stores/job-store';
import { useAnalysisStore } from '../stores/analysis-store';

export function usePersistence() {
  const { updateActivity, resetSession } = useAppStore();
  const { clearUser } = useUserStore();
  const { resetJobState } = useJobStore();
  const { resetAnalysisState } = useAnalysisStore();

  // Session timeout (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  // Update activity on user interaction
  const handleUserActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Check for session timeout
  const checkSessionTimeout = useCallback(() => {
    const { lastActivity } = useAppStore.getState();
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - new Date(lastActivity).getTime();
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        // Session expired - clear sensitive data
        resetSession();
        clearUser();
        resetJobState();
        resetAnalysisState();
        return true;
      }
    }
    return false;
  }, [resetSession, clearUser, resetJobState, resetAnalysisState]);

  // Save state to backup storage
  const saveStateBackup = useCallback(() => {
    try {
      const appState = useAppStore.getState();
      const userState = useUserStore.getState();
      const jobState = useJobStore.getState();
      const analysisState = useAnalysisStore.getState();

      const backup = {
        timestamp: new Date().toISOString(),
        app: {
          theme: appState.theme,
          language: appState.language,
          sessionId: appState.sessionId,
        },
        user: {
          currentUser: userState.currentUser,
          preferences: userState.preferences,
        },
        job: {
          recentJobs: jobState.recentJobs,
        },
        analysis: {
          analysisHistory: analysisState.analysisHistory,
        },
      };

      localStorage.setItem('app-state-backup', JSON.stringify(backup));
    } catch (error) {
      console.warn('Failed to save state backup:', error);
    }
  }, []);

  // Restore state from backup
  const restoreStateBackup = useCallback(() => {
    try {
      const backupData = localStorage.getItem('app-state-backup');
      if (backupData) {
        const backup = JSON.parse(backupData);
        const backupTime = new Date(backup.timestamp);
        const now = new Date();

        // Only restore if backup is less than 24 hours old
        if (now.getTime() - backupTime.getTime() < 24 * 60 * 60 * 1000) {
          return backup;
        }
      }
    } catch (error) {
      console.warn('Failed to restore state backup:', error);
    }
    return null;
  }, []);

  // Clear all persisted data
  const clearPersistedData = useCallback(() => {
    try {
      // Clear Zustand persisted stores
      localStorage.removeItem('app-store');
      localStorage.removeItem('user-store');
      localStorage.removeItem('analysis-store');
      localStorage.removeItem('ui-store');
      sessionStorage.removeItem('job-store');

      // Clear backup
      localStorage.removeItem('app-state-backup');

      // Reset all stores
      resetSession();
      clearUser();
      resetJobState();
      resetAnalysisState();
    } catch (error) {
      console.error('Failed to clear persisted data:', error);
    }
  }, [resetSession, clearUser, resetJobState, resetAnalysisState]);

  // Setup activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [handleUserActivity]);

  // Setup session timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkSessionTimeout]);

  // Setup periodic state backup
  useEffect(() => {
    const interval = setInterval(() => {
      saveStateBackup();
    }, 5 * 60 * 1000); // Backup every 5 minutes

    return () => clearInterval(interval);
  }, [saveStateBackup]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - check session and update activity
        const sessionExpired = checkSessionTimeout();
        if (!sessionExpired) {
          handleUserActivity();
        }
      } else {
        // Page became hidden - save backup
        saveStateBackup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkSessionTimeout, handleUserActivity, saveStateBackup]);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStateBackup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStateBackup]);

  return {
    saveStateBackup,
    restoreStateBackup,
    clearPersistedData,
    checkSessionTimeout,
  };
}