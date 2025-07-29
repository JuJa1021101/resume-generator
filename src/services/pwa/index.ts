/**
 * PWA服务入口文件
 */

export { swManager, ServiceWorkerManager } from './sw-manager';
export { offlineManager, OfflineManager } from './offline-manager';
export { notificationManager, NotificationManager } from './notification-manager';
export { backgroundSyncManager, BackgroundSyncManager } from './background-sync';
export { updateManager, UpdateManager } from './update-manager';

// 导入实例用于内部使用
import { swManager } from './sw-manager';
import { offlineManager } from './offline-manager';
import { updateManager } from './update-manager';

export type { SWUpdateInfo, SWInstallPrompt } from './sw-manager';
export type { OfflineQueueItem, SyncStatus } from './offline-manager';
export type { NotificationOptions, NotificationAction, PushSubscriptionInfo } from './notification-manager';
export type { BackgroundSyncTask, SyncResult } from './background-sync';
export type { UpdateInfo, UpdateProgress } from './update-manager';
export type { CacheConfig, CacheStrategy } from './sw-config';

// PWA初始化函数
export const initializePWA = async (): Promise<void> => {
  try {
    // 初始化Service Worker
    await swManager.initialize();

    // 检查更新
    await updateManager.checkForUpdates();

    console.log('PWA services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize PWA services:', error);
  }
};

// PWA状态检查函数
export const getPWAStatus = () => {
  return {
    isServiceWorkerSupported: 'serviceWorker' in navigator,
    isNotificationSupported: 'Notification' in window,
    isPushSupported: 'PushManager' in window,
    isBackgroundSyncSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    isInstalled: swManager.isInstalled(),
    isOnline: offlineManager.isNetworkOnline(),
    syncStatus: offlineManager.getSyncStatus(),
    updateInfo: updateManager.getCurrentUpdateInfo()
  };
};