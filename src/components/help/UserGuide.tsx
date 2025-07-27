import { FC, useState, useEffect } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

export interface GuideStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    text: string;
    onClick: () => void;
  };
}

export interface UserGuideProps {
  steps: GuideStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  className?: string;
}

export const UserGuide: FC<UserGuideProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (step?.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight class
        element.classList.add('guide-highlight');

        return () => {
          element.classList.remove('guide-highlight');
        };
      }
    }
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setHighlightedElement(null);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Guide popup */}
      <div
        className={cn(
          'fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4',
          'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          className
        )}
        role="dialog"
        aria-labelledby="guide-title"
        aria-describedby="guide-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <h3 id="guide-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {step.title}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="关闭引导"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p id="guide-content" className="text-gray-700 dark:text-gray-300 mb-4">
            {step.content}
          </p>

          {/* Action button if provided */}
          {step.action && (
            <button
              onClick={step.action.onClick}
              className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {step.action.text}
            </button>
          )}

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>进度</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            跳过引导
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              上一步
            </button>

            <button
              onClick={handleNext}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLastStep ? '完成' : '下一步'}
              {!isLastStep && <ChevronRightIcon className="h-4 w-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Highlight styles */}
      <style jsx global>{`
        .guide-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 4px;
          animation: guide-pulse 2s infinite;
        }

        @keyframes guide-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </>
  );
};