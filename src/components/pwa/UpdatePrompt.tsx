/**
 * 应用更新提示组件
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { updateManager, UpdateInfo, UpdateProgress } from '@/services/pwa/update-manager';

interface UpdatePromptProps {
  onUpdateStart?: () => void;
  onUpdateComplete?: () => void;
  onUpdateError?: (error: string) => void;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  onUpdateStart,
  onUpdateComplete,
  onUpdateError
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 监听更新可用事件
    updateManager.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setShowPrompt(info.isAvailable);
    });

    // 监听更新进度事件
    updateManager.onUpdateProgress((progress) => {
      setUpdateProgress(progress);

      if (progress.stage === 'complete') {
        onUpdateComplete?.();
      } else if (progress.stage === 'error') {
        onUpdateError?.(progress.message);
      }
    });

    // 检查是否有可用更新
    updateManager.checkForUpdates();
  }, [onUpdateComplete, onUpdateError]);

  const handleUpdate = async () => {
    try {
      onUpdateStart?.();
      await updateManager.applyUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      onUpdateError?.(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handlePostpone = () => {
    updateManager.postponeUpdate();
    setShowPrompt(false);
  };

  const handleIgnore = () => {
    updateManager.ignoreUpdate();
    setShowPrompt(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 如果正在更新，显示进度
  if (updateProgress && updateProgress.stage !== 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              {updateProgress.stage === 'checking' && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              )}
              {updateProgress.stage === 'downloading' && (
                <ArrowDownTrayIcon className="h-12 w-12 text-blue-600 mx-auto animate-bounce" />
              )}
              {updateProgress.stage === 'installing' && (
                <div className="animate-pulse">
                  <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto" />
                </div>
              )}
              {updateProgress.stage === 'error' && (
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto" />
              )}
            </div>

            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {updateProgress.message}
            </h3>

            {updateProgress.progress > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${updateProgress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              请不要关闭应用程序
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!showPrompt || !updateInfo?.isAvailable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <ArrowDownTrayIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {updateInfo.isForced ? '强制更新可用' : '应用更新可用'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    版本 {updateInfo.version}
                    {updateInfo.size && ` • ${formatSize(updateInfo.size)}`}
                  </p>
                </div>
              </div>

              {!updateInfo.isForced && (
                <button
                  onClick={handleIgnore}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {updateInfo.releaseNotes && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  更新内容：
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {updateInfo.releaseNotes}
                  </pre>
                </div>
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{updateInfo.isForced ? '立即更新' : '更新'}</span>
              </button>

              {!updateInfo.isForced && (
                <button
                  onClick={handlePostpone}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center space-x-2"
                >
                  <ClockIcon className="h-4 w-4" />
                  <span>稍后</span>
                </button>
              )}
            </div>

            {updateInfo.isForced && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    这是一个强制更新，必须更新后才能继续使用应用。
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdatePrompt;