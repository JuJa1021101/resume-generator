import { useState, useCallback } from 'react';
import { ToastProps } from '../components/feedback/Toast';

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

export interface UseToastReturn {
  toasts: ToastProps[];
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = generateId();
    const toast: ToastProps = {
      id,
      ...options,
      onClose: hideToast,
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, [generateId]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'error', title, message, persistent: true });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'info', title, message });
  }, [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}