import { UserRepository } from './repositories/user-repository';
import { JobRepository } from './repositories/job-repository';
import { AnalysisRepository } from './repositories/analysis-repository';
import type { User, JobDescription, AnalysisResult } from '../../types';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'user' | 'job' | 'analysis';
  data: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
}

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  syncInterval: number; // milliseconds
}

export class SyncManager {
  private userRepo: UserRepository;
  private jobRepo: JobRepository;
  private analysisRepo: AnalysisRepository;
  private syncQueue: SyncQueueItem[] = [];
  private config: SyncConfig;
  private syncTimer?: NodeJS.Timeout;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      batchSize: config.batchSize || 10,
      syncInterval: config.syncInterval || 30000, // 30 seconds
    };

    this.userRepo = new UserRepository();
    this.jobRepo = new JobRepository();
    this.analysisRepo = new AnalysisRepository();

    this.setupEventListeners();
    this.startSyncTimer();
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connection restored, starting sync...');
      this.sync().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Connection lost, queuing operations for later sync...');
    });

    // Listen for visibility change to sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.sync().catch(console.error);
      }
    });
  }

  /**
   * Start the automatic sync timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync().catch(console.error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop the sync timer
   */
  stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Add operation to sync queue
   */
  private addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: new Date(),
      retryCount: 0,
    };

    this.syncQueue.push(queueItem);

    // If online, try to sync immediately
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch(console.error);
    }
  }

  /**
   * Generate unique ID for sync queue items
   */
  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue user operation for sync
   */
  queueUserOperation(type: SyncQueueItem['type'], user: User): void {
    this.addToSyncQueue({
      type,
      entity: 'user',
      data: user,
    });
  }

  /**
   * Queue job operation for sync
   */
  queueJobOperation(type: SyncQueueItem['type'], job: JobDescription): void {
    this.addToSyncQueue({
      type,
      entity: 'job',
      data: job,
    });
  }

  /**
   * Queue analysis operation for sync
   */
  queueAnalysisOperation(type: SyncQueueItem['type'], analysis: AnalysisResult): void {
    this.addToSyncQueue({
      type,
      entity: 'analysis',
      data: analysis,
    });
  }

  /**
   * Perform sync operation
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline || this.isSyncing || this.syncQueue.length === 0) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Process items in batches
      const batches = this.createBatches(this.syncQueue, this.config.batchSize);

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(item => this.processSyncItem(item))
        );

        results.forEach((result, index) => {
          const item = batch[index];

          if (result.status === 'fulfilled') {
            // Remove successful item from queue
            this.removeSyncItem(item.id);
            successCount++;
          } else {
            // Handle failed item
            this.handleSyncFailure(item, result.reason);
            failedCount++;
          }
        });
      }
    } catch (error) {
      console.error('Sync operation failed:', error);
    } finally {
      this.isSyncing = false;
    }

    if (successCount > 0 || failedCount > 0) {
      console.log(`Sync completed: ${successCount} success, ${failedCount} failed`);
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Create batches from sync queue
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // Simulate API call - in real implementation, this would call your backend API
    await this.simulateAPICall(item);

    // Update local data if needed
    await this.updateLocalData(item);
  }

  /**
   * Simulate API call (replace with actual API implementation)
   */
  private async simulateAPICall(item: SyncQueueItem): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`API call failed for ${item.entity} ${item.type}`);
    }

    console.log(`Synced ${item.entity} ${item.type}:`, item.data.id);
  }

  /**
   * Update local data after successful sync
   */
  private async updateLocalData(item: SyncQueueItem): Promise<void> {
    try {
      switch (item.entity) {
        case 'user':
          if (item.type === 'delete') {
            // Don't delete locally after successful remote delete
            // The item is already removed from sync queue
          } else {
            // Update local timestamp to mark as synced
            const user = item.data as User;
            user.updatedAt = new Date();
            await this.userRepo.update(user);
          }
          break;

        case 'job':
          if (item.type === 'delete') {
            // Don't delete locally after successful remote delete
          } else {
            const job = item.data as JobDescription;
            job.analyzedAt = new Date();
            await this.jobRepo.update(job);
          }
          break;

        case 'analysis':
          if (item.type === 'delete') {
            // Don't delete locally after successful remote delete
          } else {
            // Analysis results are typically read-only after creation
            // No local update needed
          }
          break;
      }
    } catch (error) {
      console.error('Failed to update local data after sync:', error);
      // Don't throw - the remote sync was successful
    }
  }

  /**
   * Handle sync failure
   */
  private handleSyncFailure(item: SyncQueueItem, error: any): void {
    item.retryCount++;
    item.lastError = error.message || 'Unknown error';

    if (item.retryCount >= this.config.maxRetries) {
      console.error(`Sync item ${item.id} failed after ${this.config.maxRetries} retries:`, error);
      this.removeSyncItem(item.id);

      // Optionally store failed items for manual retry
      this.storeFailed(item);
    } else {
      console.warn(`Sync item ${item.id} failed, will retry (${item.retryCount}/${this.config.maxRetries}):`, error);

      // Schedule retry with exponential backoff
      setTimeout(() => {
        if (this.isOnline && !this.isSyncing) {
          this.sync().catch(console.error);
        }
      }, this.config.retryDelay * Math.pow(2, item.retryCount - 1));
    }
  }

  /**
   * Remove item from sync queue
   */
  private removeSyncItem(id: string): void {
    const index = this.syncQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.syncQueue.splice(index, 1);
    }
  }

  /**
   * Store failed sync items for potential manual retry
   */
  private storeFailed(item: SyncQueueItem): void {
    const failedItems = this.getFailedItems();
    failedItems.push(item);
    localStorage.setItem('sync_failed_items', JSON.stringify(failedItems));
  }

  /**
   * Get failed sync items from storage
   */
  getFailedItems(): SyncQueueItem[] {
    try {
      const stored = localStorage.getItem('sync_failed_items');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retry failed sync items
   */
  async retryFailedItems(): Promise<{ success: number; failed: number }> {
    const failedItems = this.getFailedItems();

    if (failedItems.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Reset retry count and add back to queue
    failedItems.forEach(item => {
      item.retryCount = 0;
      item.lastError = undefined;
      this.syncQueue.push(item);
    });

    // Clear failed items storage
    localStorage.removeItem('sync_failed_items');

    // Perform sync
    return this.sync();
  }

  /**
   * Get sync queue status
   */
  getSyncStatus(): {
    queueLength: number;
    isOnline: boolean;
    isSyncing: boolean;
    failedItems: number;
    lastSyncAttempt?: Date;
  } {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      failedItems: this.getFailedItems().length,
      lastSyncAttempt: this.syncQueue.length > 0
        ? new Date(Math.max(...this.syncQueue.map(item => item.timestamp.getTime())))
        : undefined,
    };
  }

  /**
   * Force sync now (if online)
   */
  async forcSync(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    return this.sync();
  }

  /**
   * Clear sync queue (use with caution)
   */
  clearSyncQueue(): void {
    this.syncQueue = [];
    localStorage.removeItem('sync_failed_items');
  }

  /**
   * Destroy sync manager and cleanup resources
   */
  destroy(): void {
    this.stopSyncTimer();
    window.removeEventListener('online', this.sync);
    window.removeEventListener('offline', () => { });
    document.removeEventListener('visibilitychange', this.sync);
  }
}