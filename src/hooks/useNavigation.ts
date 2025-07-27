import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { useUIStore } from '../stores/ui-store';
import { routePaths, type RoutePath } from '../router';

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { setCurrentPage, navigateBack } = useUIStore();

  // Update current page in store when location changes
  useEffect(() => {
    setCurrentPage(location.pathname);
  }, [location.pathname, setCurrentPage]);

  // Navigation functions
  const navigateTo = useCallback((path: RoutePath | string, options?: { replace?: boolean; state?: unknown }) => {
    navigate(path, options);
  }, [navigate]);

  const goHome = useCallback(() => {
    navigateTo(routePaths.home);
  }, [navigateTo]);

  const goToAnalysis = useCallback((jobId?: string) => {
    const path = jobId ? `${routePaths.analysis}?jobId=${jobId}` : routePaths.analysis;
    navigateTo(path);
  }, [navigateTo]);

  const goToResults = useCallback((analysisId?: string) => {
    const path = analysisId ? `${routePaths.results}/${analysisId}` : routePaths.results;
    navigateTo(path);
  }, [navigateTo]);

  const goToHistory = useCallback(() => {
    navigateTo(routePaths.history);
  }, [navigateTo]);

  const goBack = useCallback(() => {
    navigateBack();
  }, [navigateBack]);

  // URL utilities
  const getCurrentPath = useCallback(() => location.pathname, [location.pathname]);

  const getSearchParams = useCallback(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);

  const isCurrentPath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  return {
    // Navigation functions
    navigateTo,
    goHome,
    goToAnalysis,
    goToResults,
    goToHistory,
    goBack,

    // Current state
    currentPath: location.pathname,
    searchParams: location.search,
    params,

    // Utilities
    getCurrentPath,
    getSearchParams,
    isCurrentPath,
  };
}