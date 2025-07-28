import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
import './index.css';

// Register service worker for PWA using Vite PWA plugin
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          // Show a prompt to user to refresh the app
          if (confirm('发现新版本，是否立即更新？')) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log('应用已准备好离线使用');
        },
        onRegisterError(error) {
          console.error('SW registration error', error);
        },
      });
    }).catch(error => {
      console.error('PWA registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
