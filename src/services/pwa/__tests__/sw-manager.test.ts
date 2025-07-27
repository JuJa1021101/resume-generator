/**
 * Service Worker管理器单元测试
 */

import { ServiceWorkerManager } from '../sw-manager';

// Mock Workbox
jest.mock('workbox-window', () => ({
  Workbox: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    register: jest.fn().mockResolvedValue({}),
    messageSkipWaiting: jest.fn()
  }))
}));

describe('ServiceWorkerManager', () => {
  let swManager: ServiceWorkerManager;
  let mockWorkbox: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue({})
      },
      writable: true
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({
        matches: false
      }),
      writable: true
    });

    swManager = new ServiceWorkerManager();

    // Get the mocked Workbox instance
    const { Workbox } = require('workbox-window');
    mockWorkbox = new Workbox();
  });

  describe('initialization', () => {
    it('should initialize successfully when service worker is supported', async () => {
      await swManager.initialize();
      expect(mockWorkbox.register).toHaveBeenCalled();
    });

    it('should handle service worker not supported', async () => {
      // Remove service worker support
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      const newManager = new ServiceWorkerManager();
      await newManager.initialize();

      // Should not throw error
      expect(mockWorkbox.register).not.toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWorkbox.register.mockRejectedValue(new Error('Registration failed'));

      await swManager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Service Worker registration failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('update handling', () => {
    it('should handle update available event', async () => {
      const updateCallback = jest.fn();
      swManager.onUpdateAvailable(updateCallback);

      await swManager.initialize();

      // Simulate waiting event
      const waitingHandler = mockWorkbox.addEventListener.mock.calls
        .find(call => call[0] === 'waiting')[1];

      const mockEvent = { sw: { scriptURL: 'test-sw.js' } };
      waitingHandler(mockEvent);

      expect(updateCallback).toHaveBeenCalledWith({
        isUpdateAvailable: true,
        skipWaiting: expect.any(Function),
        registration: mockEvent.sw
      });
    });

    it('should handle controlling event', async () => {
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation();

      await swManager.initialize();

      // Simulate controlling event
      const controllingHandler = mockWorkbox.addEventListener.mock.calls
        .find(call => call[0] === 'controlling')[1];

      controllingHandler();

      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });
  });

  describe('installation detection', () => {
    it('should detect standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({ matches: true }),
        writable: true
      });

      expect(swManager.isInstalled()).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true
      });

      expect(swManager.isInstalled()).toBe(true);
    });

    it('should return false when not installed', () => {
      expect(swManager.isInstalled()).toBe(false);
    });
  });

  describe('installation state', () => {
    it('should return not-supported when service worker not available', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      const newManager = new ServiceWorkerManager();
      expect(newManager.getInstallationState()).toBe('not-supported');
    });

    it('should return installed when app is installed', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({ matches: true }),
        writable: true
      });

      expect(swManager.getInstallationState()).toBe('installed');
    });

    it('should return installable when deferred prompt available', () => {
      // Simulate beforeinstallprompt event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );

      expect(swManager.getInstallationState()).toBe('installable');
    });

    it('should return not-installable by default', () => {
      expect(swManager.getInstallationState()).toBe('not-installable');
    });
  });

  describe('install prompt', () => {
    it('should show install prompt when available', async () => {
      const mockPrompt = jest.fn();
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });

      // Simulate beforeinstallprompt event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice
      };

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );

      const result = await swManager.showInstallPrompt();

      expect(mockPrompt).toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'accepted' });
    });

    it('should return dismissed when no prompt available', async () => {
      const result = await swManager.showInstallPrompt();
      expect(result).toEqual({ outcome: 'dismissed' });
    });

    it('should handle install prompt callback', () => {
      const installCallback = jest.fn();
      swManager.onInstallPrompt(installCallback);

      // Simulate beforeinstallprompt event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );

      expect(installCallback).toHaveBeenCalledWith({
        prompt: expect.any(Function),
        userChoice: expect.any(Promise)
      });
    });
  });

  describe('cache management', () => {
    it('should get cache usage when storage API available', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 1024 * 1024,
            quota: 100 * 1024 * 1024
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

    it('should return zero usage when storage API not available', async () => {
      const usage = await swManager.getCacheUsage();

      expect(usage).toEqual({
        used: 0,
        quota: 0
      });
    });

    it('should clear all caches', async () => {
      const mockDelete = jest.fn().mockResolvedValue(true);

      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
          delete: mockDelete
        },
        writable: true
      });

      await swManager.clearCache();

      expect(mockDelete).toHaveBeenCalledWith('cache1');
      expect(mockDelete).toHaveBeenCalledWith('cache2');
    });

    it('should handle cache clearing when caches API not available', async () => {
      await expect(swManager.clearCache()).resolves.not.toThrow();
    });
  });
});