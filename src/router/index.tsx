import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Lazy load pages for better performance
const HomePage = lazy(() => import('../pages/HomePage').then(module => ({ default: module.HomePage })));
const AnalysisPage = lazy(() => import('../pages/AnalysisPage').then(module => ({ default: module.AnalysisPage })));
const ResultsPage = lazy(() => import('../pages/ResultsPage').then(module => ({ default: module.ResultsPage })));
const HistoryPage = lazy(() => import('../pages/HistoryPage').then(module => ({ default: module.HistoryPage })));

// Route configuration
export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'analysis',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <AnalysisPage />
          </Suspense>
        ),
      },
      {
        path: 'results/:analysisId?',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ResultsPage />
          </Suspense>
        ),
      },
      {
        path: 'history',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <HistoryPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
];

// Create router instance
export const router = createBrowserRouter(routes);

// Router provider component
export function AppRouter() {
  return <RouterProvider router={router} />;
}

// Route utilities
export const routePaths = {
  home: '/',
  analysis: '/analysis',
  results: '/results',
  history: '/history',
} as const;

export type RoutePath = typeof routePaths[keyof typeof routePaths];