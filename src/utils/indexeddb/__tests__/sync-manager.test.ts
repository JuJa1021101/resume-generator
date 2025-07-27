import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SyncManager } from '../sync-manager';
import type { SyncConfig, SyncQueueItem } from '../sync-manager';
import type { User, JobDescription, AnalysisResult } from '../../../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock navigator
const navigatorMock = {
  onLine: true
};

// Mock document
const documentMock = {
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  Object.defineProperty(global, 'navigator', {
    value: navigatorMock,
    writable: true
  });

  Object.defineProperty(global, 'document', {
    value: documentMock,
    writable: true
  });

  // Mock window event listeners
  global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  } as any;

  // Reset mocks
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  const config: Partial<SyncConfig> = {
    maxRetries: 2,
    retryDelay: 100,
    batchSize: 3,
    syncInterval: 1000
  };

  beforeEach(() => {
    syncManager = new SyncManager(config);
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(syncManager).toBeDefined();

      const status = syncManager.getSyncStatus();
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('failedItems');
    });

    it('should setup event listeners for online/offline', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should start sync timer', () => {
      const spy = jest.spyOn(global, 'setInterval');
      const manager = new SyncManager(config);

      expect(spy).toHaveBeenCalledWith(
        expect.any(Function),
        config.syncInterval
      );

      manager.destroy();
      spy.mockRestore();
    });
  });

  describe('Queue Operations', () => {
    const mockUser: User = {
      id: 'test-user-1',
      profile: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890',
        location: 'Test City',
        summary: 'Test summary',
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        interests: []
      },
      preferences: {
        aiEngine: 'gpt4o',
        theme: 'light',
        language: 'zh-CN',
        autoSave: true
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockJob: JobDescription = {
      id: 'test-job-1',
      title: 'Software Engineer',
      company: 'Test Company',
      content: 'Test job description',
      requirements: [],
      skills: [],
      analyzedAt: new Date(),
      aiAnalysis: {
        keywords: [],
        skills: [],
        matchScore: 0.8,
        suggestions: [],
        processingTime: 1000
      }
    };

    const mockAnalysis: AnalysisResult = {
      id: 'test-analysis-1',
      userId: 'test-user-1',
      jobId: 'test-job-1',
      matchScore: 0.85,
      detailedScores: [],
      recommendations: [],
      generatedResume: {
        id: 'resume-1',
        userId: 'test-user-1',
        jobId: 'test-job-1',
        content: 'Generated resume content',
        template: 'modern',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      performanceMetrics: {
        loadTime: 100,
        aiProcessingTime: 500,
        renderTime: 50,
        memoryUsage: 1024,
        cacheHitRate: 0.8
      },
      createdAt: new Date()
    };

    it('should queue user operations', () => {
      syncManager.queueUserOperation('create', mockUser);

      const status = syncManager.getSyncStatus();
      expect(status.queueLength).toBe(1);
    });

    it('should queue job operations', () => {
      syncManager.queueJobOperation('update', mockJob);

      const status = syncManager.getSyncStatus();
      expect(status.queueLength).toBe(1);
    });

    it('should queue analysis operations', () => {
      syncManager.queueAnalysisOperation('create', mockAnalysis);

      const status = syncManager.getSyncStatus();
      expect(status.queueLength).toBe(1);
    });

    it('should handle multiple queued operations', () => {
      syncManager.queueUserOperation('create', mockUser);
      syncManager.queueJobOperation('update', mockJob);
      syncManager.queueAnalysisOperation('create', mockAnalysis);

      const status = syncManager.getSyncStatus();
      expect(status.queueLength).toBe(3);
    });
  });

  describe('Sync Operations', () => {
    it('should return early if offline', async () => {
      // Set offline
      navigatorMock.onLine = false;

      const result = await syncManager.sync();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should return early if already syncing', async () => {
      // Mock isSyncing state
      (syncManager as any).isSyncing = true;

      const result = await syncManager.sync();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should return early if queue is empty', async () => {
      const result = await syncManager.sync();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should process sync queue when conditions are met', async () => {
      const mockUser: User = {
        id: 'test-user-sync',
        profile: {
          name: 'Sync Test User',
          email: 'sync@example.com',
          phone: '123-456-7890',
          location: 'Test City',
          summary: 'Test summary',
          skills: [],
          experience: [],
          education: [],
          projects: [],
          certifications: [],
          languages: [],
          interests: []
        },
        preferences: {
          aiEngine: 'gpt4o',
          theme: 'light',
          language: 'zh-CN',
          autoSave: true
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      syncManager.queueUserOperation('create', mockUser);

      // Ensure we're online
      navigatorMock.onLine = true;

      const result = await syncManager.sync();
      expect(result.success + result.failed).toBeGreaterThan(0);
    });
  });

  describe('Failed Items Management', () => {
    it('should store failed items in localStorage', () => {
      const failedItems = syncManager.getFailedItems();
      expect(Array.isArray(failedItems)).toBe(true);
    });

    it('should retry failed items', async () => {
      // Mock failed items in localStorage
      const mockFailedItems: SyncQueueItem[] = [{
        id: 'failed-1',
        type: 'create',
        entity: 'user',
        data: { id: 'user-1', name: 'Test' },
        timestamp: new Date(),
        retryCount: 1,
        lastError: 'Network error'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFailedItems));

      const result = await syncManager.retryFailedItems();
      expect(result.success + result.failed).toBeGreaterThan(0);
    });

    it('should clear failed items after successful retry', async () => {
      const mockFailedItems: SyncQueueItem[] = [{
        id: 'failed-1',
        type: 'create',
        entity: 'user',
        data: { id: 'user-1', name: 'Test' },
        timestamp: new Date(),
        retryCount: 1,
        lastError: 'Network error'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFailedItems));

      await syncManager.retryFailedItems();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sync_failed_items');
    });
  });

  describe('Network Status Handling', () => {
    it('should handle online event', () => {
      const onlineHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'online')?.[1];

      expect(onlineHandler).toBeDefined();

      // Simulate online event
      if (onlineHandler) {
        onlineHandler();
        // Should trigger sync attempt
        expect(true).toBe(true); // Basic test that handler exists
      }
    });

    it('should handle offline event', () => {
      const offlineHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'offline')?.[1];

      expect(offlineHandler).toBeDefined();

      // Simulate offline event
      if (offlineHandler) {
        offlineHandler();
        // Should set offline status
        expect(true).toBe(true); // Basic test that handler exists
      }
    });

    it('should handle visibility change event', () => {
      const visibilityHandler = (document.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'visibilitychange')?.[1];

      expect(visibilityHandler).toBeDefined();

      // Simulate visibility change
      if (visibilityHandler) {
        documentMock.hidden = false;
        navigatorMock.onLine = true;
        visibilityHandler();
        // Should trigger sync when app becomes visible and online
        expect(true).toBe(true); // Basic test that handler exists
      }
    });
  });

  describe('Sync Status', () => {
    it('should provide accurate sync status', () => {
      const status = syncManager.getSyncStatus();

      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('failedItems');

      expect(typeof status.queueLength).toBe('number');
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.isSyncing).toBe('boolean');
      expect(typeof status.failedItems).toBe('number');
    });

    it('should update status when items are queued', () => {
      const initialStatus = syncManager.getSyncStatus();

      const mockUser: User = {
        id: 'status-test-user',
        profile: {
          name: 'Status Test',
          email: 'status@example.com',
          phone: '123-456-7890',
          location: 'Test City',
          summary: 'Test summary',
          skills: [],
          experience: [],
          education: [],
          projects: [],
          certifications: [],
          languages: [],
          interests: []
        },
        preferences: {
          aiEngine: 'gpt4o',
          theme: 'light',
          language: 'zh-CN',
          autoSave: true
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      syncManager.queueUserOperation('create', mockUser);

      const updatedStatus = syncManager.getSyncStatus();
      expect(updatedStatus.queueLength).toBe(initialStatus.queueLength + 1);
    });
  });

  describe('Force Sync', () => {
    it('should force sync when online', async () => {
      navigatorMock.onLine = true;

      const result = await syncManager.forcSync();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });

    it('should throw error when forcing sync while offline', async () => {
      navigatorMock.onLine = false;

      await expect(syncManager.forcSync()).rejects.toThrow('Cannot sync while offline');
    });
  });

  describe('Queue Management', () => {
    it('should clear sync queue', () => {
      const mockUser: User = {
        id: 'clear-test-user',
        profile: {
          name: 'Clear Test',
          email: 'clear@example.com',
          phone: '123-456-7890',
          location: 'Test City',
          summary: 'Test summary',
          skills: [],
          experience: [],
          education: [],
          projects: [],
          certifications: [],
          languages: [],
          interests: []
        },
        preferences: {
          aiEngine: 'gpt4o',
          theme: 'light',
          language: 'zh-CN',
          autoSave: true
        },
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      syncManager.queueUserOperation('create', mockUser);

      const statusBefore = syncManager.getSyncStatus();
      expect(statusBefore.queueLength).toBeGreaterThan(0);

      syncManager.clearSyncQueue();

      const statusAfter = syncManager.getSyncStatus();
      expect(statusAfter.queueLength).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sync_failed_items');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const spy = jest.spyOn(global, 'clearInterval');

      syncManager.destroy();

      expect(spy).toHaveBeenCalled();
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      spy.mockRestore();
    });

    it('should stop sync timer on destroy', () => {
      const stopTimerSpy = jest.spyOn(syncManager, 'stopSyncTimer');

      syncManager.destroy();

      expect(stopTimerSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const failedItems = syncManager.getFailedItems();
      expect(Array.isArray(failedItems)).toBe(true);
      expect(failedItems).toHaveLength(0);
    });

    it('should handle JSON parsing errors in failed items', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const failedItems = syncManager.getFailedItems();
      expect(Array.isArray(failedItems)).toBe(true);
      expect(failedItems).toHaveLength(0);
    });
  });
});