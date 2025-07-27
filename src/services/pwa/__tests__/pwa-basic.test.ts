/**
 * PWA基础功能测试
 */

describe('PWA Basic Tests', () => {
  it('should export all PWA services', () => {
    const pwaModule = require('../index');

    expect(pwaModule.swManager).toBeDefined();
    expect(pwaModule.offlineManager).toBeDefined();
    expect(pwaModule.notificationManager).toBeDefined();
    expect(pwaModule.backgroundSyncManager).toBeDefined();
    expect(pwaModule.updateManager).toBeDefined();
    expect(pwaModule.initializePWA).toBeDefined();
    expect(pwaModule.getPWAStatus).toBeDefined();
  });

  it('should have proper service worker configuration', () => {
    const swConfig = require('../sw-config');

    expect(swConfig.CACHE_CONFIGS).toBeDefined();
    expect(swConfig.CACHE_STRATEGIES).toBeDefined();
    expect(swConfig.SW_CONFIG).toBeDefined();

    expect(swConfig.CACHE_CONFIGS.STATIC_ASSETS).toEqual({
      name: 'static-assets-v1',
      version: '1.0.0',
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24 * 30
    });
  });

  it('should have proper cache strategies', () => {
    const { CACHE_STRATEGIES } = require('../sw-config');

    expect(Array.isArray(CACHE_STRATEGIES)).toBe(true);
    expect(CACHE_STRATEGIES.length).toBeGreaterThan(0);

    // Check for OpenAI API strategy
    const openaiStrategy = CACHE_STRATEGIES.find(
      (strategy: any) => {
        const pattern = strategy.urlPattern;
        return pattern && (pattern.source || pattern.toString()).includes('api.openai.com');
      }
    );
    expect(openaiStrategy).toBeDefined();
    if (openaiStrategy) {
      expect(openaiStrategy.handler).toBe('NetworkFirst');
    }
  });

  it('should export PWA components', () => {
    // Test that components can be imported
    expect(() => require('../../../components/pwa')).not.toThrow();
  });
});