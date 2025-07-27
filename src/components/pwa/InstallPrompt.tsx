/**
 * PWA安装提示组件
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { swManager } from '@/services/pwa/sw-manager';

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstall,
  onDismiss
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installationState, setInstallationState] = useState<string>('not-installable');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 检查安装状态
    const checkInstallationState = () => {
      const state = swManager.getInstallationState();
      setInstallationState(state);
      setShowPrompt(state === 'installable');
    };

    // 监听安装提示事件
    swManager.onInstallPrompt(() => {
      checkInstallationState();
    });

    checkInstallationState();
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const result = await swManager.showInstallPrompt();

      if (result.outcome === 'accepted') {
        setShowPrompt(false);
        onInstall?.();
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();

    // 记住用户的选择，一段时间内不再显示
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  // 检查是否应该显示提示（用户之前没有拒绝过）
  const shouldShowPrompt = () => {
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (!dismissed) return true;

    const dismissedTime = parseInt(dismissed, 10);
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    return daysSinceDismissed > 7; // 7天后再次显示
  };

  if (!showPrompt || !shouldShowPrompt()) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  安装AI简历生成器
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  添加到主屏幕，获得更好的使用体验
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>安装中...</span>
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span>安装</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              稍后
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>✓ 离线使用</span>
              <span>✓ 快速启动</span>
              <span>✓ 桌面图标</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;