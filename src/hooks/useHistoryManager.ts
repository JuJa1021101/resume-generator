import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../stores/ui-store';

export function useHistoryManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigationHistory, setCurrentPage } = useUIStore();

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Update current page in store
      setCurrentPage(location.pathname);

      // Handle custom state if present
      if (event.state) {
        // Restore any custom state data
        console.log('Restored state:', event.state);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, setCurrentPage]);

  // Navigate with state
  const navigateWithState = useCallback((
    path: string,
    state?: unknown,
    options?: { replace?: boolean }
  ) => {
    navigate(path, {
      state,
      replace: options?.replace
    });
  }, [navigate]);

  // Navigate back with fallback
  const navigateBack = useCallback((fallbackPath = '/') => {
    if (navigationHistory.length > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, navigationHistory]);

  // Navigate forward
  const navigateForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // Check if can go back
  const canGoBack = useCallback(() => {
    return navigationHistory.length > 0 || window.history.length > 1;
  }, [navigationHistory]);

  // Check if can go forward
  const canGoForward = useCallback(() => {
    // This is a limitation of the History API - we can't reliably detect forward history
    return false;
  }, []);

  // Replace current history entry
  const replaceCurrentEntry = useCallback((path: string, state?: unknown) => {
    navigate(path, { replace: true, state });
  }, [navigate]);

  // Push new history entry
  const pushHistoryEntry = useCallback((path: string, state?: unknown) => {
    navigate(path, { state });
  }, [navigate]);

  // Get current location state
  const getCurrentState = useCallback(() => {
    return location.state;
  }, [location.state]);

  // Clear navigation history in store
  const clearNavigationHistory = useCallback(() => {
    useUIStore.getState().clearNavigationHistory();
  }, []);

  // Handle page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current state before page refresh
      const currentState = {
        path: location.pathname,
        search: location.search,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('navigation-state', JSON.stringify(currentState));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  // Restore state after page refresh
  useEffect(() => {
    const savedState = sessionStorage.getItem('navigation-state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const timeDiff = Date.now() - state.timestamp;

        // Only restore if refresh happened within last 5 seconds
        if (timeDiff < 5000) {
          // State was saved recently, likely from a page refresh
          console.log('Restored navigation state after refresh:', state);
        }

        // Clean up saved state
        sessionStorage.removeItem('navigation-state');
      } catch (error) {
        console.warn('Failed to restore navigation state:', error);
      }
    }
  }, []);

  // Prevent navigation if there are unsaved changes
  const preventNavigation = useCallback((shouldPrevent: boolean, message?: string) => {
    useEffect(() => {
      if (!shouldPrevent) return;

      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        const confirmationMessage = message || '您有未保存的更改，确定要离开吗？';
        event.preventDefault();
        event.returnValue = confirmationMessage; // Required for some browsers
        // Modern browsers ignore the return value and show their own dialog
        return confirmationMessage;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [shouldPrevent, message]);
  }, []);

  return {
    // Navigation functions
    navigateWithState,
    navigateBack,
    navigateForward,
    replaceCurrentEntry,
    pushHistoryEntry,

    // State management
    getCurrentState,
    clearNavigationHistory,

    // History checks
    canGoBack,
    canGoForward,

    // Utilities
    preventNavigation,

    // Current location info
    currentPath: location.pathname,
    currentSearch: location.search,
    currentHash: location.hash,
    navigationHistory,
  };
}