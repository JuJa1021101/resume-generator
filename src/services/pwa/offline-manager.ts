/**
 * 离线模式管理器
 */

// import { cacheService } from '@/utils/indexeddb';

export interface OfflineQueueItem {
  id: string;
  type: 'api-request' | 'data-sync' | 'file-upload';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingItems: number;
  failedItems: number;
}

export class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: OfflineQueueItem[] = [];
  private syncInProgress: boolean = false;
  private statusCallbacks: ((status: SyncStatus) => void)[] = [];
  private readonly STORAGE_KEY = 'offline-sync-queue';

  constructor() {
    this.setupNetworkListeners();
    this.loadSyncQueue();
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyStatusChange();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange();
    });
  }

  /**
   * 加载同步队列
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * 保存同步队列
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * 添加到同步队列
   */
  async addToSyncQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();
    this.notifyStatusChange();

    // 如果在线，立即尝试同步
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * 处理同步队列
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const itemsToProcess = [...this.syncQueue];

    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Failed to process queue item:', error);
        await this.handleSyncFailure(item);
      }
    }

    this.syncInProgress = false;
    await this.saveSyncQueue();
    this.notifyStatusChange();
  }

  /**
   * 处理队列项
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case 'api-request':
        await this.processApiRequest(item);
        break;
      case 'data-sync':
        await this.processDataSync(item);
        break;
      case 'file-upload':
        await this.processFileUpload(item);
        break;
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  }

  /**
   * 处理API请求
   */
  private async processApiRequest(item: OfflineQueueItem): Promise<void> {
    const { url, method, headers, body } = item.data;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // 缓存响应结果
    const result = await response.json();
    // await cacheService.set(`api-${item.id}`, result);
    console.log('API request processed:', result);
  }

  /**
   * 处理数据同步
   */
  private async processDataSync(item: OfflineQueueItem): Promise<void> {
    const { operation, collection, data } = item.data;

    // 这里应该调用相应的数据同步服务
    // 例如同步用户数据、分析结果等
    console.log(`Processing data sync: ${operation} on ${collection}`, data);
  }

  /**
   * 处理文件上传
   */
  private async processFileUpload(item: OfflineQueueItem): Promise<void> {
    const { file, uploadUrl } = item.data;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }
  }

  /**
   * 处理同步失败
   */
  private async handleSyncFailure(item: OfflineQueueItem): Promise<void> {
    item.retryCount++;

    if (item.retryCount >= item.maxRetries) {
      // 移除失败的项目
      this.removeFromQueue(item.id);
      console.error(`Max retries reached for item ${item.id}`);
    } else {
      // 更新重试次数
      const index = this.syncQueue.findIndex(q => q.id === item.id);
      if (index !== -1) {
        this.syncQueue[index] = item;
      }
    }
  }

  /**
   * 从队列中移除项目
   */
  private removeFromQueue(id: string): void {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    const failedItems = this.syncQueue.filter(item => item.retryCount >= item.maxRetries).length;

    return {
      isOnline: this.isOnline,
      lastSyncTime: this.getLastSyncTime(),
      pendingItems: this.syncQueue.length,
      failedItems
    };
  }

  /**
   * 获取最后同步时间
   */
  private getLastSyncTime(): number {
    const stored = localStorage.getItem('last-sync-time');
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * 更新最后同步时间
   */
  private updateLastSyncTime(): void {
    localStorage.setItem('last-sync-time', Date.now().toString());
  }

  /**
   * 监听状态变化
   */
  onStatusChange(callback: (status: SyncStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  /**
   * 手动触发同步
   */
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
      this.updateLastSyncTime();
    }
  }

  /**
   * 清空同步队列
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    this.notifyStatusChange();
  }

  /**
   * 获取网络状态
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineManager = new OfflineManager();