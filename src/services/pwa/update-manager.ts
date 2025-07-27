/**
 * 应用更新管理器
 */

import { swManager, SWUpdateInfo } from './sw-manager';
import { notificationManager } from './notification-manager';

export interface UpdateInfo {
  isAvailable: boolean;
  version?: string;
  releaseNotes?: string;
  size?: number;
  isForced?: boolean;
}

export interface UpdateProgress {
  stage: 'checking' | 'downloading' | 'installing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export class UpdateManager {
  private updateInfo: UpdateInfo | null = null;
  private updateCallbacks: ((info: UpdateInfo) => void)[] = [];
  private progressCallbacks: ((progress: UpdateProgress) => void)[] = [];
  private autoUpdateEnabled: boolean = true;
  private checkInterval: number = 60000; // 1分钟检查一次
  private intervalId: number | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化更新管理器
   */
  private async initialize(): Promise<void> {
    // 监听Service Worker更新事件
    swManager.onUpdateAvailable((updateInfo: SWUpdateInfo) => {
      this.handleUpdateAvailable(updateInfo);
    });

    // 开始定期检查更新
    this.startUpdateCheck();

    // 监听页面可见性变化，页面重新可见时检查更新
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * 处理更新可用事件
   */
  private async handleUpdateAvailable(updateInfo: SWUpdateInfo): Promise<void> {
    const update: UpdateInfo = {
      isAvailable: true,
      version: await this.getNewVersion(),
      releaseNotes: await this.getReleaseNotes(),
      size: await this.getUpdateSize(),
      isForced: await this.isForceUpdate()
    };

    this.updateInfo = update;
    this.notifyUpdateAvailable(update);

    // 如果启用自动更新且不是强制更新，显示通知
    if (this.autoUpdateEnabled && !update.isForced) {
      await notificationManager.notifyUpdateAvailable();
    }

    // 如果是强制更新，立即应用
    if (update.isForced) {
      await this.applyUpdate();
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    this.notifyProgress({
      stage: 'checking',
      progress: 0,
      message: '检查更新中...'
    });

    try {
      // 这里可以调用服务器API检查版本信息
      const currentVersion = await this.getCurrentVersion();
      const latestVersion = await this.getLatestVersion();

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        const updateInfo: UpdateInfo = {
          isAvailable: true,
          version: latestVersion,
          releaseNotes: await this.getReleaseNotes(latestVersion),
          size: await this.getUpdateSize(latestVersion),
          isForced: await this.isForceUpdate(latestVersion)
        };

        this.updateInfo = updateInfo;
        this.notifyUpdateAvailable(updateInfo);
        return updateInfo;
      } else {
        const noUpdateInfo: UpdateInfo = { isAvailable: false };
        this.updateInfo = noUpdateInfo;
        return noUpdateInfo;
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      this.notifyProgress({
        stage: 'error',
        progress: 0,
        message: '检查更新失败'
      });
      return { isAvailable: false };
    }
  }

  /**
   * 应用更新
   */
  async applyUpdate(): Promise<void> {
    if (!this.updateInfo?.isAvailable) {
      throw new Error('No update available');
    }

    this.notifyProgress({
      stage: 'downloading',
      progress: 0,
      message: '下载更新中...'
    });

    try {
      // 模拟下载进度
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.notifyProgress({
          stage: 'downloading',
          progress: i,
          message: `下载更新中... ${i}%`
        });
      }

      this.notifyProgress({
        stage: 'installing',
        progress: 0,
        message: '安装更新中...'
      });

      // 应用Service Worker更新
      if (swManager) {
        // 这里应该调用swManager的更新方法
        // 由于我们使用的是模拟的更新信息，这里只是演示
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.notifyProgress({
        stage: 'complete',
        progress: 100,
        message: '更新完成'
      });

      // 更新完成后重新加载页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Failed to apply update:', error);
      this.notifyProgress({
        stage: 'error',
        progress: 0,
        message: '更新失败'
      });
      throw error;
    }
  }

  /**
   * 延迟更新
   */
  postponeUpdate(): void {
    // 延迟1小时后再次提醒
    setTimeout(() => {
      if (this.updateInfo?.isAvailable) {
        this.notifyUpdateAvailable(this.updateInfo);
      }
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 忽略此次更新
   */
  ignoreUpdate(): void {
    if (this.updateInfo?.version) {
      localStorage.setItem('ignored-update-version', this.updateInfo.version);
    }
    this.updateInfo = null;
  }

  /**
   * 设置自动更新
   */
  setAutoUpdate(enabled: boolean): void {
    this.autoUpdateEnabled = enabled;
    localStorage.setItem('auto-update-enabled', enabled.toString());
  }

  /**
   * 获取自动更新设置
   */
  isAutoUpdateEnabled(): boolean {
    const stored = localStorage.getItem('auto-update-enabled');
    return stored ? stored === 'true' : this.autoUpdateEnabled;
  }

  /**
   * 设置检查间隔
   */
  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
    this.restartUpdateCheck();
  }

  /**
   * 开始定期检查更新
   */
  private startUpdateCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * 重启更新检查
   */
  private restartUpdateCheck(): void {
    this.startUpdateCheck();
  }

  /**
   * 停止更新检查
   */
  stopUpdateCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 监听更新可用事件
   */
  onUpdateAvailable(callback: (info: UpdateInfo) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * 监听更新进度事件
   */
  onUpdateProgress(callback: (progress: UpdateProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * 通知更新可用
   */
  private notifyUpdateAvailable(info: UpdateInfo): void {
    this.updateCallbacks.forEach(callback => callback(info));
  }

  /**
   * 通知更新进度
   */
  private notifyProgress(progress: UpdateProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  /**
   * 获取当前版本
   */
  private async getCurrentVersion(): Promise<string> {
    // 从package.json或其他地方获取当前版本
    return '1.0.0';
  }

  /**
   * 获取最新版本
   */
  private async getLatestVersion(): Promise<string> {
    // 这里应该调用服务器API获取最新版本
    // 为了演示，我们返回一个模拟版本
    return '1.0.1';
  }

  /**
   * 获取新版本信息
   */
  private async getNewVersion(): Promise<string> {
    return await this.getLatestVersion();
  }

  /**
   * 获取发布说明
   */
  private async getReleaseNotes(version?: string): Promise<string> {
    // 这里应该从服务器获取发布说明
    return `版本 ${version || '1.0.1'} 更新内容：\n- 修复了一些已知问题\n- 提升了性能\n- 新增了离线功能`;
  }

  /**
   * 获取更新大小
   */
  private async getUpdateSize(version?: string): Promise<number> {
    // 返回更新包大小（字节）
    return 2 * 1024 * 1024; // 2MB
  }

  /**
   * 检查是否为强制更新
   */
  private async isForceUpdate(version?: string): Promise<boolean> {
    // 这里应该从服务器检查是否为强制更新
    return false;
  }

  /**
   * 比较版本号
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string) => {
      return version.split('.').map(num => parseInt(num, 10));
    };

    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  /**
   * 获取当前更新信息
   */
  getCurrentUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }
}

export const updateManager = new UpdateManager();