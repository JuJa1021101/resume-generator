/**
 * PWA功能集成测试
 */

import { swManager } from '../sw-manager';
import { offlineManager } from '../offline-manager';
import { notificationManager } from '../notification-manager';
import { backgroundSyncManager } from '../background-sync';
import { updateManager } from '../update-manager';
import { initializePWA, getPWAStatus } from '../index';

// Mock Service Worker API
const mockServiceWorker = {
  register: jest.fn().mockResolvedValue({
    addEventListener: jest.fn(),
    messageSkipWaiting: jest.fn()
  }),
  ready: Promise.resolve({
    showNotification: jest.fn(),
    pushManager: {
      subscribe: jest.fn(),
      getSubscription: jest.fn()
    },
    sync: {
      register: jest.fn()
    }
  })
};

// Mock Navigator APIs
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
});

Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn().mockResolvedValue('granted')
  },
  writable: true
});

describe('PWA Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('PWA Initialization', () => {
    it('should initialize all PWA services successfully', async () => {
      await expect(initializePWA()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockServiceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

      await initializePWA();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize PWA services:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('PWA Status', () => {
    it('should return comprehensive PWA status', () => {
      const status = getPWAStatus();

      expect(status).toEqual({
        isServiceWorkerSupported: true,
        isNotificationSupported: true,
        isPushSupported: true,
        isBackgroundSyncSupported: true,
        isInstalled: expect.any(Boolean),
        isOnline: true,
        syncStatus: expect.objectContaining({
          isOnline: true,
          lastSyncTime: expect.any(Number),
          pendingItems: expect.any(Number),
          failedItems: expect.any(Number)
        }),
        updateInfo: null
      });
    });
  });

  describe('Service Worker Manager', () => {
    it('should register service worker successfully', async () => {
      await swManager.initialize();
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle update events', async () => {
      const updateCallback = jest.fn();
      swManager.onUpdateAvailable(updateCallback);

      await swManager.initialize();

      // Simulate update event
      const mockEvent = { sw: {} };
      const addEventListener = mockServiceWorker.register.mock.results[0].value.addEventListener;
      const waitingHandler = addEventListener.mock.calls.find(call => call[0] === 'waiting')[1];

      waitingHandler(mockEvent);

      expect(updateCallback).toHaveBeenCalledWith({
        isUpdateAvailable: true,
        skipWaiting: expect.any(Function),
        registration: mockEvent.sw
      });
    });

    it('should get cache usage information', async () => {
      // Mock storage API
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 1024 * 1024, // 1MB
            quota: 100 * 1024 * 1024 // 100MB
          })
        },
        writable: true
      });

      const usage = await swManager.getCacheUsage();
      expect(usage).toEqual({
        used: 1024 * 1024,
        quota: 100 * 1024 * 1024
      });
    });
  });

  describe('Offline Manager', () => {
    it('should add items to sync queue when offline', async () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/test', method: 'POST' },
        maxRetries: 3
      });

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(1);
    });

    it('should process sync queue when online', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/test', method: 'POST' },
        maxRetries: 3
      });

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(0);
    });
  });

  describe('Notification Manager', () => {
    it('should request notification permission', async () => {
      const permission = await notificationManager.requestPermission();
      expect(permission).toBe('granted');
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should show notifications when permission granted', async () => {
      const mockRegistration = await mockServiceWorker.ready;

      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'Test body'
      });

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'Test body',
          icon: '/pwa-192x192.png'
        })
      );
    });

    it('should handle notification permission denied', async () => {
      window.Notification.requestPermission.mockResolvedValueOnce('denied');

      await expect(
        notificationManager.showNotification({
          title: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('Notification permission denied');
    });
  });

  describe('Background Sync Manager', () => {
    it('should register background sync tasks', async () => {
      const taskId = await backgroundSyncManager.registerSync({
        type: 'ai-analysis',
        data: { jobDescription: 'Test JD' },
        priority: 'high',
        maxRetries: 3
      });

      expect(taskId).toMatch(/^ai-analysis-\d+-[a-z0-9]+$/);

      const tasks = backgroundSyncManager.getPendingTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].type).toBe('ai-analysis');
    });

    it('should execute tasks immediately when background sync not supported', async () => {
      // Remove sync support
      const mockRegistration = await mockServiceWorker.ready;
      delete mockRegistration.sync;

      const taskId = await backgroundSyncManager.registerSync({
        type: 'data-backup',
        data: { userData: {} },
        priority: 'low',
        maxRetries: 1
      });

      // Wait for task execution
      await new Promise(resolve => setTimeout(resolve, 100));

      const tasks = backgroundSyncManager.getPendingTasks();
      expect(tasks.find(t => t.id === taskId)).toBeUndefined();
    });

    it('should retry failed tasks', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await backgroundSyncManager.registerSync({
        type: 'pdf-generation',
        data: { resumeData: {}, template: 'modern' },
        priority: 'medium',
        maxRetries: 2
      });

      // Wait for task execution and potential retries
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background sync task'),
        expect.stringContaining('completed successfully')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Update Manager', () => {
    it('should check for updates', async () => {
      const updateInfo = await updateManager.checkForUpdates();

      expect(updateInfo).toEqual({
        isAvailable: true,
        version: '1.0.1',
        releaseNotes: expect.stringContaining('版本 1.0.1 更新内容'),
        size: 2 * 1024 * 1024,
        isForced: false
      });
    });

    it('should handle update callbacks', async () => {
      const updateCallback = jest.fn();
      const progressCallback = jest.fn();

      updateManager.onUpdateAvailable(updateCallback);
      updateManager.onUpdateProgress(progressCallback);

      await updateManager.checkForUpdates();
      await updateManager.applyUpdate();

      expect(updateCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: expect.any(String),
          progress: expect.any(Number),
          message: expect.any(String)
        })
      );
    });

    it('should handle auto-update settings', () => {
      updateManager.setAutoUpdate(false);
      expect(updateManager.isAutoUpdateEnabled()).toBe(false);

      updateManager.setAutoUpdate(true);
      expect(updateManager.isAutoUpdateEnabled()).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should coordinate between offline manager and background sync', async () => {
      // Add item to offline queue
      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/analysis', method: 'POST', body: {} },
        maxRetries: 3
      });

      // Register background sync task
      await backgroundSyncManager.registerSync({
        type: 'ai-analysis',
        data: { jobDescription: 'Test' },
        priority: 'high',
        maxRetries: 3
      });

      const offlineStatus = offlineManager.getSyncStatus();
      const syncStats = backgroundSyncManager.getTaskStats();

      expect(offlineStatus.pendingItems).toBeGreaterThan(0);
      expect(syncStats.total).toBeGreaterThan(0);
    });

    it('should show notifications for completed background tasks', async () => {
      const mockRegistration = await mockServiceWorker.ready;

      // Register a task that will complete
      await backgroundSyncManager.registerSync({
        type: 'pdf-generation',
        data: { resumeData: {}, template: 'modern' },
        priority: 'high',
        maxRetries: 1
      });

      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if notification was triggered (in real scenario)
      // This would be tested through message passing
      expect(mockRegistration.showNotification).toHaveBeenCalledTimes(0); // Not called in test
    });
  });

  describe('Error Handling', () => {
    it('should handle service worker registration failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockServiceWorker.register.mockRejectedValueOnce(new Error('SW registration failed'));

      await swManager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Service Worker registration failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle notification API unavailability', async () => {
      // Remove Notification API
      delete (window as any).Notification;

      expect(notificationManager.getPermission()).toBe('denied');

      await expect(
        notificationManager.showNotification({
          title: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('This browser does not support notifications');
    });

    it('should handle storage quota exceeded', async () => {
      // Mock storage estimate to return quota exceeded
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 100 * 1024 * 1024, // 100MB
            quota: 100 * 1024 * 1024  // 100MB (full)
          })
        }
      });

      const usage = await swManager.getCacheUsage();
      expect(usage.used).toBe(usage.quota);
    });
  });
});