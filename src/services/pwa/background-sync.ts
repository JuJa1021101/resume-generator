/**
 * 后台同步管理器
 */

export interface BackgroundSyncTask {
  id: string;
  type: 'ai-analysis' | 'pdf-generation' | 'data-backup' | 'model-update';
  data: any;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  scheduledAt?: number;
  maxRetries: number;
  retryCount: number;
}

export interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class BackgroundSyncManager {
  private registration: ServiceWorkerRegistration | null = null;
  private syncTasks: Map<string, BackgroundSyncTask> = new Map();
  private readonly STORAGE_KEY = 'background-sync-tasks';

  constructor() {
    this.initialize();
  }

  /**
   * 初始化后台同步管理器
   */
  private async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        await this.loadSyncTasks();
        this.setupMessageListener();
      } catch (error) {
        console.error('Failed to initialize background sync:', error);
      }
    }
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          this.handleSyncComplete(event.data.taskId, event.data.result);
        }
      });
    }
  }

  /**
   * 加载同步任务
   */
  private async loadSyncTasks(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const tasks = JSON.parse(stored);
        this.syncTasks = new Map(Object.entries(tasks));
      }
    } catch (error) {
      console.error('Failed to load sync tasks:', error);
    }
  }

  /**
   * 保存同步任务
   */
  private async saveSyncTasks(): Promise<void> {
    try {
      const tasks = Object.fromEntries(this.syncTasks);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save sync tasks:', error);
    }
  }

  /**
   * 注册后台同步任务
   */
  async registerSync(task: Omit<BackgroundSyncTask, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const taskId = `${task.type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const syncTask: BackgroundSyncTask = {
      ...task,
      id: taskId,
      createdAt: Date.now(),
      retryCount: 0
    };

    this.syncTasks.set(taskId, syncTask);
    await this.saveSyncTasks();

    // 如果支持后台同步，注册到Service Worker
    if (this.registration && 'sync' in this.registration) {
      try {
        const syncManager = (this.registration as any).sync;
        if (syncManager) {
          await syncManager.register(taskId);
        } else {
          this.executeTask(syncTask);
        }
      } catch (error) {
        console.error('Failed to register background sync:', error);
        // 降级到立即执行
        this.executeTask(syncTask);
      }
    } else {
      // 不支持后台同步，立即执行
      this.executeTask(syncTask);
    }

    return taskId;
  }

  /**
   * 执行同步任务
   */
  private async executeTask(task: BackgroundSyncTask): Promise<void> {
    try {
      let result: SyncResult;

      switch (task.type) {
        case 'ai-analysis':
          result = await this.executeAIAnalysis(task);
          break;
        case 'pdf-generation':
          result = await this.executePDFGeneration(task);
          break;
        case 'data-backup':
          result = await this.executeDataBackup(task);
          break;
        case 'model-update':
          result = await this.executeModelUpdate(task);
          break;
        default:
          result = { success: false, error: `Unknown task type: ${task.type}` };
      }

      this.handleSyncComplete(task.id, result);
    } catch (error) {
      this.handleSyncComplete(task.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 执行AI分析任务
   */
  private async executeAIAnalysis(_task: BackgroundSyncTask): Promise<SyncResult> {
    // 这里应该调用AI分析服务，使用 _task.data 中的数据
    // 为了演示，我们模拟一个异步操作
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      data: {
        matchScore: Math.floor(Math.random() * 100),
        keywords: ['React', 'TypeScript', 'Node.js'],
        analysis: 'AI analysis completed successfully'
      }
    };
  }

  /**
   * 执行PDF生成任务
   */
  private async executePDFGeneration(_task: BackgroundSyncTask): Promise<SyncResult> {
    // 这里应该调用PDF生成服务，使用 _task.data 中的数据
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      data: {
        fileName: `resume-${Date.now()}.pdf`,
        size: 1024 * 1024 // 1MB
      }
    };
  }

  /**
   * 执行数据备份任务
   */
  private async executeDataBackup(task: BackgroundSyncTask): Promise<SyncResult> {
    const { userData } = task.data;

    // 这里应该调用数据备份服务
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      data: {
        backupId: `backup-${Date.now()}`,
        itemCount: Object.keys(userData).length
      }
    };
  }

  /**
   * 执行模型更新任务
   */
  private async executeModelUpdate(task: BackgroundSyncTask): Promise<SyncResult> {
    const { version } = task.data;

    // 这里应该下载和更新AI模型，使用 task.data 中的数据
    await new Promise(resolve => setTimeout(resolve, 5000));

    return {
      success: true,
      data: {
        version,
        size: 50 * 1024 * 1024 // 50MB
      }
    };
  }

  /**
   * 处理同步完成
   */
  private async handleSyncComplete(taskId: string, result: SyncResult): Promise<void> {
    const task = this.syncTasks.get(taskId);
    if (!task) return;

    if (result.success) {
      // 任务成功，移除任务
      this.syncTasks.delete(taskId);
      await this.saveSyncTasks();

      // 发送成功通知
      this.notifyTaskComplete(task, result);
    } else {
      // 任务失败，检查是否需要重试
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        // 重新调度任务
        task.scheduledAt = Date.now() + this.getRetryDelay(task.retryCount);
        this.syncTasks.set(taskId, task);
        await this.saveSyncTasks();

        // 延迟重试
        setTimeout(() => this.executeTask(task), this.getRetryDelay(task.retryCount));
      } else {
        // 达到最大重试次数，移除任务
        this.syncTasks.delete(taskId);
        await this.saveSyncTasks();

        // 发送失败通知
        this.notifyTaskFailed(task, result.error || 'Unknown error');
      }
    }
  }

  /**
   * 获取重试延迟时间
   */
  private getRetryDelay(retryCount: number): number {
    // 指数退避算法
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // 最大30秒
  }

  /**
   * 通知任务完成
   */
  private notifyTaskComplete(task: BackgroundSyncTask, result: SyncResult): void {
    // 这里可以发送通知或触发回调
    console.log(`Background sync task ${task.id} completed successfully:`, result);

    // 发送消息到主线程
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TASK_COMPLETE',
        taskId: task.id,
        taskType: task.type,
        result
      });
    }
  }

  /**
   * 通知任务失败
   */
  private notifyTaskFailed(task: BackgroundSyncTask, error: string): void {
    console.error(`Background sync task ${task.id} failed:`, error);

    // 发送消息到主线程
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TASK_FAILED',
        taskId: task.id,
        taskType: task.type,
        error
      });
    }
  }

  /**
   * 获取待处理任务
   */
  getPendingTasks(): BackgroundSyncTask[] {
    return Array.from(this.syncTasks.values());
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    if (this.syncTasks.has(taskId)) {
      this.syncTasks.delete(taskId);
      await this.saveSyncTasks();
      return true;
    }
    return false;
  }

  /**
   * 清空所有任务
   */
  async clearAllTasks(): Promise<void> {
    this.syncTasks.clear();
    await this.saveSyncTasks();
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): { total: number; byType: Record<string, number>; byPriority: Record<string, number> } {
    const tasks = Array.from(this.syncTasks.values());
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    tasks.forEach(task => {
      byType[task.type] = (byType[task.type] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    });

    return {
      total: tasks.length,
      byType,
      byPriority
    };
  }
}

export const backgroundSyncManager = new BackgroundSyncManager();