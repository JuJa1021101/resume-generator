import { ResponseCache, PersistentResponseCache } from '../response-cache';
import { AIAnalysisResult } from '../../../types';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
  createObjectStore: jest.fn(),
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
};

const mockIDBObjectStore = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
  createIndex: jest.fn(),
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null as any,
  onerror: null as any,
};

// Mock IndexedDB globally
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn(),
  },
  writable: true,
});

describe('ResponseCache', () => {
  let cache: ResponseCache<AIAnalysisResult>;

  const mockAnalysisResult: AIAnalysisResult = {
    keywords: [
      { text: 'React', importance: 0.9, category: 'technical', frequency: 3 },
    ],
    skills: [
      { name: 'React', category: 'frontend', importance: 0.9, matched: false, requiredLevel: 4 },
    ],
    matchScore: 0.75,
    suggestions: ['Learn React'],
    processingTime: 1000,
    confidence: 0.85,
  };

  beforeEach(() => {
    cache = new ResponseCache<AIAnalysisResult>({
      maxSize: 3,
      defaultTTL: 1000,
      cleanupInterval: 5000,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      cache.set('key1', mockAnalysisResult);

      const result = cache.get('key1');
      expect(result).toEqual(mockAnalysisResult);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      cache.set('key1', mockAnalysisResult, 100); // 100ms TTL

      expect(cache.get('key1')).toEqual(mockAnalysisResult);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeNull();
    });

    it('should update access statistics', () => {
      cache.set('key1', mockAnalysisResult);

      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when cache is full', () => {
      // Fill cache to capacity
      cache.set('key1', mockAnalysisResult);
      cache.set('key2', mockAnalysisResult);
      cache.set('key3', mockAnalysisResult);

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new item, should evict key2 (least recently used)
      cache.set('key4', mockAnalysisResult);

      expect(cache.get('key1')).toEqual(mockAnalysisResult); // Still there
      expect(cache.get('key2')).toBeNull(); // Evicted
      expect(cache.get('key3')).toEqual(mockAnalysisResult); // Still there
      expect(cache.get('key4')).toEqual(mockAnalysisResult); // New item
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired keys', () => {
      cache.set('key1', mockAnalysisResult);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      cache.set('key1', mockAnalysisResult, 100);

      expect(cache.has('key1')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('key1', mockAnalysisResult);

      expect(cache.has('key1')).toBe(true);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset stats', () => {
      cache.set('key1', mockAnalysisResult);
      cache.set('key2', mockAnalysisResult);
      cache.get('key1');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      cache.set('key1', mockAnalysisResult);
      cache.set('key2', mockAnalysisResult);

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('non-existent'); // Miss

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = cache.generateKey('content', 'type', ['skill1', 'skill2']);
      const key2 = cache.generateKey('content', 'type', ['skill1', 'skill2']);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = cache.generateKey('content1', 'type', ['skill1']);
      const key2 = cache.generateKey('content2', 'type', ['skill1']);

      expect(key1).not.toBe(key2);
    });

    it('should normalize skill order', () => {
      const key1 = cache.generateKey('content', 'type', ['skill1', 'skill2']);
      const key2 = cache.generateKey('content', 'type', ['skill2', 'skill1']);

      expect(key1).toBe(key2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', mockAnalysisResult, 100); // Short TTL
      cache.set('key2', mockAnalysisResult, 10000); // Long TTL

      await new Promise(resolve => setTimeout(resolve, 150));

      const removedCount = cache.cleanup();

      expect(removedCount).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual(mockAnalysisResult);
    });
  });

  describe('getPopularEntries', () => {
    it('should return entries sorted by access count', () => {
      cache.set('key1', mockAnalysisResult);
      cache.set('key2', mockAnalysisResult);
      cache.set('key3', mockAnalysisResult);

      // Access key2 multiple times
      cache.get('key2');
      cache.get('key2');
      cache.get('key2');

      // Access key1 once
      cache.get('key1');

      const popular = cache.getPopularEntries(2);

      expect(popular).toHaveLength(2);
      expect(popular[0].key).toBe('key2');
      expect(popular[0].accessCount).toBe(4); // 1 initial + 3 gets
      expect(popular[1].key).toBe('key1');
      expect(popular[1].accessCount).toBe(2); // 1 initial + 1 get
    });
  });

  describe('export and import', () => {
    it('should export and import cache data', () => {
      cache.set('key1', mockAnalysisResult);
      cache.set('key2', mockAnalysisResult);

      const exported = cache.export();

      const newCache = new ResponseCache<AIAnalysisResult>();
      newCache.import(exported);

      expect(newCache.get('key1')).toEqual(mockAnalysisResult);
      expect(newCache.get('key2')).toEqual(mockAnalysisResult);

      newCache.destroy();
    });

    it('should not export expired entries', async () => {
      cache.set('key1', mockAnalysisResult, 100); // Short TTL
      cache.set('key2', mockAnalysisResult, 10000); // Long TTL

      await new Promise(resolve => setTimeout(resolve, 150));

      const exported = cache.export();

      expect(Object.keys(exported)).toHaveLength(1);
      expect(exported).toHaveProperty('key2');
      expect(exported).not.toHaveProperty('key1');
    });
  });
});

describe('PersistentResponseCache', () => {
  let persistentCache: PersistentResponseCache<AIAnalysisResult>;

  const mockAnalysisResult: AIAnalysisResult = {
    keywords: [
      { text: 'React', importance: 0.9, category: 'technical', frequency: 3 },
    ],
    skills: [
      { name: 'React', category: 'frontend', importance: 0.9, matched: false, requiredLevel: 4 },
    ],
    matchScore: 0.75,
    suggestions: ['Learn React'],
    processingTime: 1000,
    confidence: 0.85,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup IndexedDB mocks
    mockIDBObjectStore.get.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockIDBObjectStore.put.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockIDBObjectStore.delete.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockIDBObjectStore.clear.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockIDBObjectStore.getAll.mockImplementation(() => {
      const request = { ...mockIDBRequest, result: [] };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false);
    mockIDBDatabase.createObjectStore.mockReturnValue(mockIDBObjectStore);

    (window.indexedDB.open as jest.Mock).mockImplementation(() => {
      const request = { ...mockIDBRequest, result: mockIDBDatabase };
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    persistentCache = new PersistentResponseCache<AIAnalysisResult>();
  });

  describe('init', () => {
    it('should initialize IndexedDB connection', async () => {
      await expect(persistentCache.init()).resolves.toBeUndefined();

      expect(window.indexedDB.open).toHaveBeenCalledWith('gpt4o-cache', 1);
    });

    it('should handle IndexedDB errors', async () => {
      (window.indexedDB.open as jest.Mock).mockImplementation(() => {
        const request = { ...mockIDBRequest, error: new Error('DB Error') };
        setTimeout(() => {
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });

      await expect(persistentCache.init()).rejects.toThrow();
    });
  });

  describe('set and get', () => {
    beforeEach(async () => {
      await persistentCache.init();
    });

    it('should store and retrieve data from memory cache', async () => {
      await persistentCache.set('key1', mockAnalysisResult);

      const result = await persistentCache.get('key1');
      expect(result).toEqual(mockAnalysisResult);
    });

    it('should fall back to IndexedDB when not in memory', async () => {
      const storedEntry = {
        key: 'key1',
        data: mockAnalysisResult,
        timestamp: Date.now(),
        ttl: 10000,
        accessCount: 1,
        lastAccessed: Date.now(),
        hash: 'test-hash',
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest, result: storedEntry };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const result = await persistentCache.get('key1');
      expect(result).toEqual(mockAnalysisResult);
    });

    it('should return null for non-existent keys', async () => {
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest, result: undefined };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const result = await persistentCache.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await persistentCache.init();
    });

    it('should delete from both memory and IndexedDB', async () => {
      await persistentCache.set('key1', mockAnalysisResult);

      const deleted = await persistentCache.delete('key1');
      expect(deleted).toBe(true);

      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('key1');
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await persistentCache.init();
    });

    it('should clear both memory and IndexedDB', async () => {
      await persistentCache.clear();

      expect(mockIDBObjectStore.clear).toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys', () => {
      const key1 = persistentCache.generateKey('content', 'type', ['skill1']);
      const key2 = persistentCache.generateKey('content', 'type', ['skill1']);

      expect(key1).toBe(key2);
    });
  });
});