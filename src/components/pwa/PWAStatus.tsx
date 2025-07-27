/**
 * PWA状态显示组件
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  WifiIcon,
  CloudIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { swManager } from '@/services/pwa/sw-manager';
import { offlineManager, SyncStatus } from '@/services/pwa/offline-manager';

interface PWAStatusProps {
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: 0,
    pendingItems: 0,
    failedItems: 0
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [cacheUsage, setCacheUsage] = useState({ used: 0, quota: 0 });

  useEffect(() => {
    // 监听同步状态变化
    offlineManager.onStatusChange(setSyncStatus);

    // 检查安装状态
    setIsInstalled(swManager.isInstalled());

    // 获取缓存使用情况
    const updateCacheUsage = async () => {
      const usage = await swManager.getCacheUsage();
      setCacheUsage(usage);
    };

    updateCacheUsage();

    // 定期更新缓存使用情况
    const interval = setInterval(updateCacheUsage, 30000); // 30秒

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastSync = (timestamp: number): string => {
    if (timestamp === 0) return '从未同步';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const handleForceSync = async () => {
    await offlineManager.forcSync();
  };

  const handleClearCache = async () => {
    await swManager.clearCache();
    setCacheUsage({ used: 0, quota: 0 });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="space-y-4">
        {/* 网络状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <WifiIcon className="h-5 w-5 text-green-500" />
            ) : (
              <WifiIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {syncStatus.isOnline ? '在线' : '离线'}
            </span>
          </div>

          {isInstalled && (
            <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>已安装</span>
            </div>
          )}
        </div>

        {/* 同步状态 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CloudIcon className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                最后同步: {formatLastSync(syncStatus.lastSyncTime)}
              </span>
            </div>

            {syncStatus.isOnline && (
              <button
                onClick={handleForceSync}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                <ArrowPathIcon className="h-3 w-3" />
                <span>同步</span>
              </button>
            )}
          </div>

          {/* 待同步项目 */}
          {syncStatus.pendingItems > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"
              />
              <span className="text-gray-600 dark:text-gray-400">
                {syncStatus.pendingItems} 项待同步
              </span>
            </div>
          )}

          {/* 失败项目 */}
          {syncStatus.failedItems > 0 && (
            <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <span>{syncStatus.failedItems} 项同步失败</span>
            </div>
          )}
        </div>

        {/* 缓存使用情况 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              缓存使用: {formatBytes(cacheUsage.used)}
              {cacheUsage.quota > 0 && ` / ${formatBytes(cacheUsage.quota)}`}
            </span>

            {cacheUsage.used > 0 && (
              <button
                onClick={handleClearCache}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                清理
              </button>
            )}
          </div>

          {cacheUsage.quota > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(cacheUsage.used / cacheUsage.quota) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAStatus;