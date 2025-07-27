import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService } from '../cache-service';
import type { User, JobDescription, AnalysisResult } from '../../../types';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockIDBDatabase = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  onerror: null,
  onabort: null,
};

const mockIDBObjectStore = {
  add: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  count: jest.fn(),
  openCursor: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  error: null,
};

// Setup mocks
beforeEach(() => {
  global.indexedDB = mockIndexedDB as any;
  global.IDBKeyRange = {
    bound: jest.fn(),
    lowerBound: jest.fn(),
    upperBound: jest.fn(),
  } as any;

  // Reset mocks
  jest.clearAllMocks();

  // Setup default mock behaviors
  mockIndexedDB.open.mockReturnValue({
    ...mockIDBRequest,
    onupgradeneeded: null,
  });

  mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
  mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
  mockIDBObjectStore.add.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.put.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.delete.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.clear.mockReturnValue(mockIDBRequest);
  mockIDBObjectStore.count.mockReturnValue(mockIDBRequest);
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    cacheService = new CacheService({
      enableLRU: false,
      enableSync: false,
    });

    // Mock successful database initialization
    const openRequest = mockIndexedDB.open.mock.results[0]?.value;
    if (openRequest) {
      openRequest.result = mockIDBDatabase;
      setTimeout(() => {
        if (openRequest.onsuccess) {
          openRequest.onsuccess({ target: openRequest });
        }
      }, 0);
    }

    await cacheService.initialize();
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('User Operations', () => {
    const mockUser: User = {
      id: 'user-1',
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
        interests: [],
      },
      preferences: {
        aiEngine: 'gpt4o',
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user', async () => {
      const addRequest = mockIDBObjectStore.add.mock.results[0]?.value;
      if (addRequest) {
        addRequest.result = mockUser.id;
        setTimeout(() => {
          if (addRequest.onsuccess) {
            addRequest.onsuccess({ target: addRequest });
          }
        }, 0);
      }

      const result = await cacheService.createUser(mockUser);
      expect(result).toEqual(mockUser);
      expect(mockIDBObjectStore.add).toHaveBeenCalledWith(mockUser);
    });

    it('should get a user by id', async () => {
      const getRequest = mockIDBObjectStore.get.mock.results[0]?.value;
      if (getRequest) {
        getRequest.result = mockUser;
        setTimeout(() => {
          if (getRequest.onsuccess) {
            getRequest.onsuccess({ target: getRequest });
          }
        }, 0);
      }

      const result = await cacheService.getUser(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Cache Management', () => {
    it('should get cache statistics', async () => {
      const countRequest = mockIDBObjectStore.count.mock.results[0]?.value;
      if (countRequest) {
        countRequest.result = 5;
        setTimeout(() => {
          if (countRequest.onsuccess) {
            countRequest.onsuccess({ target: countRequest });
          }
        }, 0);
      }

      const stats = await cacheService.getCacheStats();
      expect(stats).toHaveProperty('database');
      expect(stats.database).toHaveProperty('users');
      expect(stats.database).toHaveProperty('jobs');
    });

    it('should clear cache', async () => {
      const clearRequest = mockIDBObjectStore.clear.mock.results[0]?.value;
      if (clearRequest) {
        setTimeout(() => {
          if (clearRequest.onsuccess) {
            clearRequest.onsuccess({ target: clearRequest });
          }
        }, 0);
      }

      await cacheService.clearCache();
      expect(mockIDBObjectStore.clear).toHaveBeenCalled();
    });
  });
});