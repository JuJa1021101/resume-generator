import { NetworkHandler } from '../network-handler';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    addEventListener: jest.fn(),
  },
});

describe('NetworkHandler', () => {
  let networkHandler: NetworkHandler;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    networkHandler = NetworkHandler.getInstance();
    networkHandler.clearQueue();
    mockFetch.mockClear();
    navigator.onLine = true;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('fetchWithRetry', () => {
    it('should make successful requests', async () => {
      const mockResponse = new Response('success', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await networkHandler.fetchWithRetry('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        signal: expect.any(AbortSignal),
      }));
      expect(response).toBe(mockResponse);
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const response = await networkHandler.fetchWithRetry('https://api.example.com/test', {}, 3);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(200);
    });

    it('should throw error after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      await expect(networkHandler.fetchWithRetry('https://api.example.com/test', {}, 2))
        .rejects.toThrow('Persistent network error');

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }));

      await expect(networkHandler.fetchWithRetry('https://api.example.com/test'))
        .rejects.toThrow('HTTP 404: Not Found');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(new Response('success')), 35000))
      );

      const fetchPromise = networkHandler.fetchWithRetry('https://api.example.com/test');

      // Fast-forward past the 30s timeout
      jest.advanceTimersByTime(31000);

      await expect(fetchPromise).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('offline handling', () => {
    it('should queue requests when offline', async () => {
      navigator.onLine = false;

      const requestPromise = networkHandler.fetchWithRetry('https://api.example.com/test');

      expect(networkHandler.getQueuedRequestsCount()).toBe(1);

      // Simulate going back online
      navigator.onLine = true;
      mockFetch.mockResolvedValueOnce(new Response('success', { status: 200 }));

      // Trigger online event
      window.dispatchEvent(new Event('online'));

      const response = await requestPromise;
      expect(response.status).toBe(200);
      expect(networkHandler.getQueuedRequestsCount()).toBe(0);
    });

    it('should limit queue size', async () => {
      navigator.onLine = false;

      // Add more requests than the max queue size (50)
      const promises = [];
      for (let i = 0; i < 55; i++) {
        promises.push(networkHandler.fetchWithRetry(`https://api.example.com/test${i}`));
      }

      // Should only keep the last 50 requests
      expect(networkHandler.getQueuedRequestsCount()).toBe(50);
    });
  });

  describe('network status', () => {
    it('should return current network status', () => {
      const status = networkHandler.getNetworkStatus();

      expect(status.isOnline).toBe(true);
      expect(status.connectionType).toBe('wifi');
      expect(status.effectiveType).toBe('4g');
      expect(status.downlink).toBe(10);
      expect(status.rtt).toBe(50);
    });

    it('should detect fast connections', () => {
      expect(networkHandler.isConnectionFast()).toBe(true);

      // Mock slow connection
      (navigator as any).connection.effectiveType = '2g';
      (navigator as any).connection.downlink = 0.5;

      expect(networkHandler.isConnectionFast()).toBe(false);
    });

    it('should notify status listeners', () => {
      const listener = jest.fn();
      networkHandler.addStatusListener(listener);

      // Simulate going offline
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        isOnline: false,
      }));

      // Simulate going online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        isOnline: true,
      }));
    });

    it('should remove status listeners', () => {
      const listener = jest.fn();
      networkHandler.addStatusListener(listener);
      networkHandler.removeStatusListener(listener);

      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('queue management', () => {
    it('should clear queue', () => {
      navigator.onLine = false;

      networkHandler.fetchWithRetry('https://api.example.com/test1');
      networkHandler.fetchWithRetry('https://api.example.com/test2');

      expect(networkHandler.getQueuedRequestsCount()).toBe(2);

      networkHandler.clearQueue();

      expect(networkHandler.getQueuedRequestsCount()).toBe(0);
    });

    it('should process queued requests when coming online', async () => {
      navigator.onLine = false;

      const promise1 = networkHandler.fetchWithRetry('https://api.example.com/test1');
      const promise2 = networkHandler.fetchWithRetry('https://api.example.com/test2');

      expect(networkHandler.getQueuedRequestsCount()).toBe(2);

      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce(new Response('response1', { status: 200 }))
        .mockResolvedValueOnce(new Response('response2', { status: 200 }));

      // Simulate going online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(networkHandler.getQueuedRequestsCount()).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('should use exponential backoff for retries', async () => {
      jest.useFakeTimers();

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const fetchPromise = networkHandler.fetchWithRetry('https://api.example.com/test', {}, 3);

      // First retry should happen after ~1s
      jest.advanceTimersByTime(1500);

      // Second retry should happen after ~2s more
      jest.advanceTimersByTime(2500);

      const response = await fetchPromise;
      expect(response.status).toBe(200);

      jest.useRealTimers();
    });

    it('should not retry non-retryable errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Syntax error'));

      await expect(networkHandler.fetchWithRetry('https://api.example.com/test'))
        .rejects.toThrow('Syntax error');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});