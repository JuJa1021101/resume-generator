/**
 * 推送通知管理器
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化通知管理器
   */
  private async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.error('Failed to get service worker registration:', error);
      }
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission;
  }

  /**
   * 检查通知权限
   */
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * 显示本地通知
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    const permission = await this.requestPermission();

    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    if (this.registration) {
      // 使用Service Worker显示通知（支持 actions）
      const swNotificationOptions: any = {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
        badge: options.badge || '/pwa-192x192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent
      };

      if (options.actions) {
        swNotificationOptions.actions = options.actions;
      }

      await this.registration.showNotification(options.title, swNotificationOptions);
    } else {
      // 降级到浏览器通知（不支持 actions）
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent
      });
    }
  }

  /**
   * 订阅推送通知
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionInfo | null> {
    if (!this.registration) {
      throw new Error('Service Worker not available');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * 取消推送订阅
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        return await subscription.unsubscribe();
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * 获取当前推送订阅
   */
  async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * 显示AI分析完成通知
   */
  async notifyAnalysisComplete(jobTitle: string, matchScore: number): Promise<void> {
    await this.showNotification({
      title: 'AI分析完成',
      body: `${jobTitle} 的技能匹配度为 ${matchScore}%`,
      tag: 'analysis-complete',
      data: { type: 'analysis', jobTitle, matchScore },
      actions: [
        { action: 'view', title: '查看结果' },
        { action: 'dismiss', title: '忽略' }
      ],
      requireInteraction: true
    });
  }

  /**
   * 显示PDF生成完成通知
   */
  async notifyPDFGenerated(fileName: string): Promise<void> {
    await this.showNotification({
      title: 'PDF生成完成',
      body: `简历 "${fileName}" 已生成完成`,
      tag: 'pdf-generated',
      data: { type: 'pdf', fileName },
      actions: [
        { action: 'download', title: '下载' },
        { action: 'dismiss', title: '忽略' }
      ]
    });
  }

  /**
   * 显示同步完成通知
   */
  async notifySyncComplete(itemCount: number): Promise<void> {
    if (itemCount > 0) {
      await this.showNotification({
        title: '数据同步完成',
        body: `已同步 ${itemCount} 项数据`,
        tag: 'sync-complete',
        data: { type: 'sync', itemCount },
        silent: true
      });
    }
  }

  /**
   * 显示更新可用通知
   */
  async notifyUpdateAvailable(): Promise<void> {
    await this.showNotification({
      title: '应用更新可用',
      body: '点击更新到最新版本',
      tag: 'update-available',
      data: { type: 'update' },
      actions: [
        { action: 'update', title: '立即更新' },
        { action: 'later', title: '稍后' }
      ],
      requireInteraction: true
    });
  }

  /**
   * 工具方法：将VAPID公钥转换为Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * 工具方法：将ArrayBuffer转换为Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const notificationManager = new NotificationManager();