/**
 * Service Worker管理器
 */

import { Workbox } from 'workbox-window';

export interface SWUpdateInfo {
  isUpdateAvailable: boolean;
  skipWaiting: () => Promise<void>;
  registration?: ServiceWorkerRegistration;
}

export interface SWInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private updateCallback?: (info: SWUpdateInfo) => void;
  private installPromptCallback?: (prompt: SWInstallPrompt) => void;
  private deferredPrompt: any = null;

  constructor() {
    this.setupInstallPrompt();
  }

  /**
   * 初始化Service Worker
   */
  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');

      // 监听更新事件
      this.wb.addEventListener('waiting', (event: any) => {
        if (this.updateCallback) {
          this.updateCallback({
            isUpdateAvailable: true,
            skipWaiting: () => this.skipWaiting(),
            registration: event.sw as ServiceWorkerRegistration
          });
        }
      });

      // 监听控制变化
      this.wb.addEventListener('controlling', () => {
        window.location.reload();
      });

      // 注册Service Worker
      try {
        await this.wb.register();
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * 设置更新回调
   */
  onUpdateAvailable(callback: (info: SWUpdateInfo) => void): void {
    this.updateCallback = callback;
  }

  /**
   * 设置安装提示回调
   */
  onInstallPrompt(callback: (prompt: SWInstallPrompt) => void): void {
    this.installPromptCallback = callback;
  }

  /**
   * 跳过等待并激活新版本
   */
  private async skipWaiting(): Promise<void> {
    if (this.wb) {
      this.wb.messageSkipWaiting();
    }
  }

  /**
   * 设置安装提示监听
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      if (this.installPromptCallback) {
        this.installPromptCallback({
          prompt: async () => {
            if (this.deferredPrompt) {
              this.deferredPrompt.prompt();
              return this.deferredPrompt.userChoice;
            }
          },
          userChoice: this.deferredPrompt?.userChoice || Promise.resolve({ outcome: 'dismissed' })
        });
      }
    });
  }

  /**
   * 检查是否已安装
   */
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }

  /**
   * 获取安装状态
   */
  getInstallationState(): 'not-supported' | 'installed' | 'installable' | 'not-installable' {
    if (!('serviceWorker' in navigator)) {
      return 'not-supported';
    }

    if (this.isInstalled()) {
      return 'installed';
    }

    if (this.deferredPrompt) {
      return 'installable';
    }

    return 'not-installable';
  }

  /**
   * 手动触发安装提示
   */
  async showInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed' }> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return result;
    }
    return { outcome: 'dismissed' };
  }

  /**
   * 获取缓存使用情况
   */
  async getCacheUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  }
}

export const swManager = new ServiceWorkerManager();