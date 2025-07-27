import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ValidationError } from '@/types';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// JD input validation and preprocessing utilities
export class JDProcessor {
  // Clean and preprocess JD content
  static cleanJDContent(content: string): string {
    return content
      .trim()
      // Normalize line breaks first
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove HTML tags if any
      .replace(/<[^>]*>/g, ' ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      // Remove special characters that might interfere with AI processing
      .replace(/[^\w\s\u4e00-\u9fa5.,;:!?()\[\]{}"'\-\n]/g, '')
      // Final trim to remove any leading/trailing spaces
      .trim();
  }

  // Validate JD content format and structure
  static validateJDContent(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const cleanContent = this.cleanJDContent(content);

    if (!cleanContent || cleanContent.length === 0) {
      errors.push({
        field: 'content',
        message: '职位描述不能为空',
        value: content,
      });
      return errors;
    }

    if (cleanContent.length < 50) {
      errors.push({
        field: 'content',
        message: '职位描述过短，请提供更详细的信息（至少50字符）',
        value: content,
      });
    }

    if (cleanContent.length > 10000) {
      errors.push({
        field: 'content',
        message: '职位描述过长，请控制在10000字符以内',
        value: content,
      });
    }

    // Check for basic JD structure indicators
    const hasJobTitle = /职位|岗位|招聘|position|job|role|工程师|开发|设计师|经理|专员/i.test(cleanContent);
    const hasRequirements = /要求|需要|必须|技能|经验|requirement|skill|experience|熟悉|掌握|了解/i.test(cleanContent);

    if (!hasJobTitle && !hasRequirements) {
      errors.push({
        field: 'content',
        message: '内容似乎不是有效的职位描述，请确保包含职位信息和要求',
        value: content,
      });
    }

    return errors;
  }

  // Extract basic info from JD for preview
  static extractJDPreview(content: string): {
    title?: string;
    company?: string;
    keyRequirements: string[];
  } {
    const cleanContent = this.cleanJDContent(content);
    const lines = cleanContent.split('\n').filter(line => line.trim());

    // Try to extract title (usually in first few lines)
    const titleMatch = lines[0]?.match(/(.+?)(?:招聘|职位|岗位)/);
    const title = titleMatch?.[1]?.trim();

    // Try to extract company - look for pattern like "公司：XXX" and extract only the company name
    const companyMatch = cleanContent.match(/公司[:：]\s*([^\n]+)/);
    const company = companyMatch?.[1]?.trim();

    // Extract key requirements (lines containing requirement keywords)
    const keyRequirements = lines
      .filter(line =>
        /要求|需要|必须|技能|经验|熟悉|掌握|了解/i.test(line) &&
        line.length > 10 &&
        line.length < 200
      )
      .slice(0, 3)
      .map(req => req.trim());

    return { title, company, keyRequirements };
  }
}

// Debounce hook for input optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Props interface for JDInput component
export interface JDInputProps {
  onJDSubmit: (jd: string) => Promise<void>;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
  showPreview?: boolean;
  autoFocus?: boolean;
  className?: string;
}

// State interface for JDInput component
interface JDInputState {
  content: string;
  charCount: number;
  isValid: boolean;
  errors: ValidationError[];
  isSubmitting: boolean;
  showPreview: boolean;
  preview: {
    title?: string;
    company?: string;
    keyRequirements: string[];
  };
}

export const JDInput: React.FC<JDInputProps> = ({
  onJDSubmit,
  maxLength = 10000,
  placeholder = '请粘贴或输入目标岗位的职位描述...',
  disabled = false,
  initialValue = '',
  showPreview = true,
  autoFocus = false,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, setState] = useState<JDInputState>({
    content: initialValue,
    charCount: initialValue.length,
    isValid: initialValue.length > 0,
    errors: [],
    isSubmitting: false,
    showPreview: false,
    preview: { keyRequirements: [] },
  });

  // Debounced content for validation and preview
  const debouncedContent = useDebounce(state.content, 500);

  // Validate content when debounced content changes
  useEffect(() => {
    if (debouncedContent) {
      const errors = JDProcessor.validateJDContent(debouncedContent);
      const preview = JDProcessor.extractJDPreview(debouncedContent);

      setState(prev => ({
        ...prev,
        errors,
        isValid: errors.length === 0,
        preview,
        showPreview: showPreview && errors.length === 0 && debouncedContent.length > 100,
      }));
    } else {
      setState(prev => ({
        ...prev,
        errors: [],
        isValid: false,
        showPreview: false,
        preview: { keyRequirements: [] },
      }));
    }
  }, [debouncedContent, showPreview]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    if (newContent.length <= maxLength) {
      setState(prev => ({
        ...prev,
        content: newContent,
        charCount: newContent.length,
      }));
    }
  }, [maxLength]);

  // Handle paste event with content cleaning
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleanedText = JDProcessor.cleanJDContent(pastedText);

    if (cleanedText.length <= maxLength) {
      setState(prev => ({
        ...prev,
        content: cleanedText,
        charCount: cleanedText.length,
      }));
    }
  }, [maxLength]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.isValid || state.isSubmitting) {
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const cleanedContent = JDProcessor.cleanJDContent(state.content);
      await onJDSubmit(cleanedContent);
    } catch (error) {
      console.error('JD submission failed:', error);
      // Error handling is managed by parent component
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [state.isValid, state.isSubmitting, state.content, onJDSubmit]);

  // Clear content
  const handleClear = useCallback(() => {
    setState(prev => ({
      ...prev,
      content: '',
      charCount: 0,
      isValid: false,
      errors: [],
      showPreview: false,
      preview: { keyRequirements: [] },
    }));
    textareaRef.current?.focus();
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (state.content) {
      try {
        await navigator.clipboard.writeText(state.content);
        // Could add toast notification here
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }, [state.content]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
    }
  }, [state.content]);

  // Character count color based on usage
  const getCharCountColor = () => {
    const usage = state.charCount / maxLength;
    if (usage > 0.9) return 'text-red-600';
    if (usage > 0.7) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-900">职位描述输入</h3>
        </div>
        <div className="flex items-center space-x-2">
          {state.content && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="复制内容"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="清空内容"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={state.content}
            onChange={handleContentChange}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || state.isSubmitting}
            autoFocus={autoFocus}
            className={cn(
              'input-field resize-none min-h-[200px] max-h-[400px]',
              state.errors.length > 0 && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              state.isValid && state.content.length > 0 && 'border-green-300 focus:border-green-500 focus:ring-green-500'
            )}
            rows={8}
          />

          {/* Character count */}
          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            <span className={cn('text-xs font-medium', getCharCountColor())}>
              {state.charCount}/{maxLength}
            </span>
            {state.isValid && state.content.length > 0 && (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Error Messages */}
        {state.errors.length > 0 && (
          <div className="space-y-2">
            {state.errors.map((error, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {state.showPreview && (
          <div className="card bg-blue-50 border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-3">内容预览</h4>
            <div className="space-y-2 text-sm">
              {state.preview.title && (
                <div>
                  <span className="font-medium text-blue-800">职位：</span>
                  <span className="text-blue-700">{state.preview.title}</span>
                </div>
              )}
              {state.preview.company && (
                <div>
                  <span className="font-medium text-blue-800">公司：</span>
                  <span className="text-blue-700">{state.preview.company}</span>
                </div>
              )}
              {state.preview.keyRequirements.length > 0 && (
                <div>
                  <span className="font-medium text-blue-800">关键要求：</span>
                  <ul className="mt-1 space-y-1">
                    {state.preview.keyRequirements.map((req, index) => (
                      <li key={index} className="text-blue-700 text-xs">
                        • {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!state.isValid || state.isSubmitting || disabled}
            className={cn(
              'btn-primary px-6 py-3 text-base',
              (!state.isValid || state.isSubmitting || disabled) &&
              'opacity-50 cursor-not-allowed'
            )}
          >
            {state.isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="loading-spinner h-4 w-4" />
                <span>分析中...</span>
              </div>
            ) : (
              '开始AI分析'
            )}
          </button>
        </div>
      </form>

      {/* Usage Tips */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 提示：</p>
        <ul className="space-y-1 ml-4">
          <li>• 直接粘贴完整的职位描述以获得最佳分析效果</li>
          <li>• 确保包含职位要求、技能需求等关键信息</li>
          <li>• 系统会自动清理和优化输入内容</li>
          <li>• 支持中英文混合内容分析</li>
        </ul>
      </div>
    </div>
  );
};