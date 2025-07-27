/**
 * 离线管理器单元测试
 */

import { OfflineManager } from '../offline-manager';

// Mock IndexedDB cache service
jest.mock('@/utils/indexeddb', () => ({
  cacheService: {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null)
  }
}));

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    offlineManager = new OfflineManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with online status', () => {
      const status = offlineManager.getSyncStatus();
      expect(status.isOnline).toBe(true);
    });

    it('should load sync queue from localStorage', () => {
      const mockQueue = [
        {
          id: 'test-1',
          type: 'api-request',
          data: { url: '/test' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3
        }
      ];

      localStorage.setItem('offline-sync-queue', JSON.stringify(mockQueue));

      const newManager = new OfflineManager();
      const status = newManager.getSyncStatus();

      expect(status.pendingItems).toBe(1);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('offline-sync-queue', 'invalid-json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const newManager = new OfflineManager();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load sync queue:',
        expect.any(Error)
      );

      const status = newManager.getSyncStatus();
      expect(status.pendingItems).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('network status handling', () => {
    it('should update status when going online', () => {
      const statusCallback = jest.fn();
      offlineManager.onStatusChange(statusCallback);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: false })
      );

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: true })
      );
    });

    it('should process sync queue when going online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Add item to queue while offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/test', method: 'POST' },
        maxRetries: 3
      });

      expect(offlineManager.getSyncStatus().pendingItems).toBe(1);

      // Go online and trigger sync
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: undefined,
        body: undefined
      });
    });
  });

  describe('sync queue management', () => {
    it('should add items to sync queue', async () => {
      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/test', method: 'GET' },
        maxRetries: 3
      });

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(1);
    });

    it('should save sync queue to localStorage', async () => {
      await offlineManager.addToSyncQueue({
        type: 'data-sync',
        data: { operation: 'create', collection: 'users' },
        maxRetries: 2
      });

      const stored = localStorage.getItem('offline-sync-queue');
      expect(stored).toBeTruthy();

      const queue = JSON.parse(stored!);
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('data-sync');
    });

    it('should process sync queue immediately when online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/immediate', method: 'POST', body: { test: true } },
        maxRetries: 1
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith('/api/immediate', {
        method: 'POST',
        headers: undefined,
        body: JSON.stringify({ test: true })
      });

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(0);
    });
  });

  describe('sync processing', () => {
    it('should process API requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'success' })
      });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: {
          url: '/api/process',
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: { data: 'test' }
        },
        maxRetries: 3
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith('/api/process', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      });
    });

    it('should process data sync operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await offlineManager.addToSyncQueue({
        type: 'data-sync',
        data: {
          operation: 'update',
          collection: 'profiles',
          data: { id: 1, name: 'Test' }
        },
        maxRetries: 2
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing data sync: update on profiles',
        { id: 1, name: 'Test' }
      );

      consoleSpy.mockRestore();
    });

    it('should process file uploads', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ fileId: 'uploaded-123' })
      });

      await offlineManager.addToSyncQueue({
        type: 'file-upload',
        data: {
          file: mockFile,
          uploadUrl: '/api/upload'
        },
        maxRetries: 2
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    it('should handle processing failures with retries', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/retry-test', method: 'GET' },
        maxRetries: 3
      });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(mockFetch).toHaveBeenCalledTimes(3);

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(0);
    });

    it('should remove items after max retries exceeded', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFetch.mockRejectedValue(new Error('Persistent error'));

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/fail', method: 'GET' },
        maxRetries: 2
      });

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached for item')
      );

      const status = offlineManager.getSyncStatus();
      expect(status.pendingItems).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('sync status', () => {
    it('should provide accurate sync status', () => {
      const status = offlineManager.getSyncStatus();

      expect(status).toEqual({
        isOnline: true,
        lastSyncTime: expect.any(Number),
        pendingItems: 0,
        failedItems: 0
      });
    });

    it('should track failed items correctly', async () => {
      mockFetch.mockRejectedValue(new Error('Permanent failure'));

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/fail', method: 'GET' },
        maxRetries: 1
      });

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = offlineManager.getSyncStatus();
      expect(status.failedItems).toBe(0); // Item is removed after max retries
      expect(status.pendingItems).toBe(0);
    });
  });

  describe('manual operations', () => {
    it('should force sync when online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ synced: true })
      });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/manual-sync', method: 'GET' },
        maxRetries: 1
      });

      await offlineManager.forcSync();

      expect(mockFetch).toHaveBeenCalledWith('/api/manual-sync', {
        method: 'GET',
        headers: undefined,
        body: undefined
      });
    });

    it('should not force sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/offline-sync', method: 'GET' },
        maxRetries: 1
      });

      await offlineManager.forcSync();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should clear sync queue', async () => {
      await offlineManager.addToSyncQueue({
        type: 'api-request',
        data: { url: '/api/clear-test', method: 'GET' },
        maxRetries: 1
      });

      expect(offlineManager.getSyncStatus().pendingItems).toBe(1);

      await offlineManager.clearSyncQueue();

      expect(offlineManager.getSyncStatus().pendingItems).toBe(0);
      expect(localStorage.getItem('offline-sync-queue')).toBe('[]');
    });
  });

  describe('network status detection', () => {
    it('should return current network status', () => {
      expect(offlineManager.isNetworkOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(offlineManager.isNetworkOnline()).toBe(false);
    });
  });
});