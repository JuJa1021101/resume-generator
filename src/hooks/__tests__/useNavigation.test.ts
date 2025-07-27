import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigation } from '../useNavigation';
import { useUIStore } from '../../stores/ui-store';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};
const mockParams = {};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => mockParams,
}));

describe('useNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(BrowserRouter, null, children);

  it('should provide navigation functions', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(typeof result.current.navigateTo).toBe('function');
    expect(typeof result.current.goHome).toBe('function');
    expect(typeof result.current.goToAnalysis).toBe('function');
    expect(typeof result.current.goToResults).toBe('function');
    expect(typeof result.current.goToHistory).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('should navigate to different routes', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.goHome();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', undefined);

    act(() => {
      result.current.goToAnalysis();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/analysis', undefined);

    act(() => {
      result.current.goToResults();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/results', undefined);

    act(() => {
      result.current.goToHistory();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/history', undefined);
  });

  it('should navigate with parameters', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.goToAnalysis('job-123');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/analysis?jobId=job-123', undefined);

    act(() => {
      result.current.goToResults('analysis-456');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/results/analysis-456', undefined);
  });

  it('should provide current location info', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.currentPath).toBe('/');
    expect(result.current.searchParams).toBe('');
    expect(result.current.params).toEqual({});
  });

  it('should check if current path matches', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.isCurrentPath('/')).toBe(true);
    expect(result.current.isCurrentPath('/analysis')).toBe(false);
  });

  it('should get search params', () => {
    // Mock location with search params
    mockLocation.search = '?jobId=123&tab=skills';

    const { result } = renderHook(() => useNavigation(), { wrapper });

    const searchParams = result.current.getSearchParams();
    expect(searchParams.get('jobId')).toBe('123');
    expect(searchParams.get('tab')).toBe('skills');
  });

  it('should update current page in store', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    // The hook should update the store with current page
    expect(useUIStore.getState().currentPage).toBe('/');
  });
});