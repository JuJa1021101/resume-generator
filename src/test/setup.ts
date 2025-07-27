import '@testing-library/jest-dom';
import 'openai/shims/node';

// Mock fetch for OpenAI
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor() { }
  disconnect() { }
  observe() { }
  unobserve() { }
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { }
  disconnect() { }
  observe() { }
  unobserve() { }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IndexedDB
const mockIDBRequest = {
  result: {},
  error: null,
  onsuccess: null,
  onerror: null,
};

const mockIDBDatabase = {
  transaction: jest.fn().mockReturnValue({
    objectStore: jest.fn().mockReturnValue({
      add: jest.fn().mockReturnValue(mockIDBRequest),
      get: jest.fn().mockReturnValue(mockIDBRequest),
      put: jest.fn().mockReturnValue(mockIDBRequest),
      delete: jest.fn().mockReturnValue(mockIDBRequest),
    }),
  }),
};

global.indexedDB = {
  open: jest.fn().mockReturnValue({
    ...mockIDBRequest,
    result: mockIDBDatabase,
  }),
  deleteDatabase: jest.fn().mockReturnValue(mockIDBRequest),
} as unknown as IDBFactory;
