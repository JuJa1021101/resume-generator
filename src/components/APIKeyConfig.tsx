import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../stores/ui-store';

interface APIKeyConfigProps {
  onKeyConfigured: (apiKey: string) => void;
  currentKey?: string;
  isRequired?: boolean;
}

export const APIKeyConfig: React.FC<APIKeyConfigProps> = ({
  onKeyConfigured,
  currentKey = '',
  isRequired = false,
}) => {
  const [apiKey, setApiKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const { addNotification } = useUIStore();

  const validateApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!key || key.length < 20) {
      return false;
    }

    // 简单的格式验证
    if (!key.startsWith('sk-')) {
      return false;
    }

    try {
      // 这里可以添加实际的API密钥验证逻辑
      // 暂时只做格式验证
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    setValidationResult(null);
  }, []);

  const handleValidateAndSave = useCallback(async () => {
    if (!apiKey.trim()) {
      setValidationResult({
        isValid: false,
        message: '请输入API密钥'
      });
      return;
    }

    setIsValidating(true);

    try {
      const isValid = await validateApiKey(apiKey);

      if (isValid) {
        setValidationResult({
          isValid: true,
          message: 'API密钥格式正确'
        });

        // 保存到localStorage
        localStorage.setItem('openai_api_key', apiKey);

        // 通知父组件
        onKeyConfigured(apiKey);

        addNotification({
          type: 'success',
          title: 'API密钥已保存',
          message: '您现在可以使用GPT-4o进行AI分析',
          autoClose: true,
          duration: 3000
        });
      } else {
        setValidationResult({
          isValid: false,
          message: 'API密钥格式不正确，请检查后重试'
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: '验证失败，请稍后重试'
      });
    } finally {
      setIsValidating(false);
    }
  }, [apiKey, validateApiKey, onKeyConfigured, addNotification]);

  const handleClearKey = useCallback(() => {
    setApiKey('');
    setValidationResult(null);
    localStorage.removeItem('openai_api_key');

    addNotification({
      type: 'info',
      title: 'API密钥已清除',
      message: '已切换到本地AI分析模式',
      autoClose: true,
      duration: 3000
    });
  }, [addNotification]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center space-x-2 mb-4">
        <KeyIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          OpenAI API 配置
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
      </div>

      <div className="space-y-4">
        {/* API密钥输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API密钥
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={handleKeyChange}
              placeholder="sk-..."
              className={`input-field pr-20 ${validationResult?.isValid === false
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : validationResult?.isValid === true
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                    : ''
                }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={showKey ? '隐藏密钥' : '显示密钥'}
              >
                {showKey ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
              {validationResult?.isValid && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>

          {/* 验证结果 */}
          {validationResult && (
            <div className={`mt-2 flex items-center space-x-2 text-sm ${validationResult.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
              {validationResult.isValid ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4" />
              )}
              <span>{validationResult.message}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          <button
            onClick={handleValidateAndSave}
            disabled={isValidating || !apiKey.trim()}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner h-4 w-4" />
                <span>验证中...</span>
              </div>
            ) : (
              '保存配置'
            )}
          </button>

          {apiKey && (
            <button
              onClick={handleClearKey}
              className="btn-secondary"
            >
              清除
            </button>
          )}
        </div>

        {/* 帮助信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">如何获取OpenAI API密钥：</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">OpenAI API Keys</a> 页面</li>
                <li>登录您的OpenAI账户</li>
                <li>点击"Create new secret key"创建新密钥</li>
                <li>复制生成的密钥并粘贴到上方输入框</li>
              </ol>
              <p className="mt-2 text-xs">
                💡 API密钥将安全存储在您的浏览器本地，不会上传到服务器
              </p>
            </div>
          </div>
        </div>

        {/* 费用提醒 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">费用说明：</p>
              <p className="text-yellow-700 mt-1">
                使用GPT-4o API会产生费用，具体收费标准请查看OpenAI官网。
                如需免费使用，请选择"Transformers.js"本地AI引擎。
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};