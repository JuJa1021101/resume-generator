import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/feedback/Toast';
import { OfflineIndicator } from './components/feedback/OfflineIndicator';
import { UserGuide } from './components/help/UserGuide';
import { InstallPrompt, UpdatePrompt } from './components/pwa';
import { useAppStore } from './stores/app-store';
import { usePersistence } from './hooks/usePersistence';
import { useStateSync } from './hooks/useStateSync';
import { useToast } from './hooks/useToast';
import { useUserGuide, GUIDE_STEPS } from './hooks/useUserGuide';
import { useErrorHandler } from './hooks/useErrorHandler';
import { initializePWA } from './services/pwa';

function App() {
  const { initialize, isInitialized, setTheme, theme } = useAppStore();
  const { restoreStateBackup } = usePersistence();
  const { toasts, hideToast } = useToast();
  const {
    isGuideOpen,
    currentSteps,
    closeGuide,
    startGuide,
    markGuideCompleted,
    isGuideCompleted
  } = useUserGuide();
  const { } = useErrorHandler();

  // Initialize state sync
  useStateSync();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize PWA services
        await initializePWA();

        // Restore state from backup if available
        const backup = restoreStateBackup();
        if (backup?.app?.theme) {
          setTheme(backup.app.theme);
        }

        // Initialize app
        await initialize();

        // Start first-time user guide if not completed
        if (!isGuideCompleted('first-time-user')) {
          setTimeout(() => {
            startGuide('first-time-user', GUIDE_STEPS.FIRST_TIME_USER);
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [initialize, isInitialized, restoreStateBackup, setTheme, startGuide, isGuideCompleted]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Handle guide completion
  const handleGuideComplete = () => {
    if (isGuideOpen) {
      markGuideCompleted('first-time-user');
    }
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
      }}
    >
      <Layout>
        {/* Offline indicator */}
        <div className="fixed top-4 right-4 z-30">
          <OfflineIndicator />
        </div>

        {/* Main content */}
        <Outlet />

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onClose={hideToast} />

        {/* User guide */}
        <UserGuide
          steps={currentSteps}
          isOpen={isGuideOpen}
          onClose={closeGuide}
          onComplete={handleGuideComplete}
        />

        {/* PWA components */}
        <InstallPrompt />
        <UpdatePrompt />

        {/* Toast root for portals */}
        <div id="toast-root" />
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
