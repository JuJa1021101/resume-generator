import { FC, ReactNode, useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

export interface HelpTooltipProps {
  content: ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const positionClasses = {
  top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
};

const arrowClasses = {
  top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
  bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
  left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
  right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
};

const sizeClasses = {
  sm: 'max-w-xs text-xs',
  md: 'max-w-sm text-sm',
  lg: 'max-w-md text-base',
};

export const HelpTooltip: FC<HelpTooltipProps> = ({
  content,
  title,
  position = 'top',
  size = 'md',
  className,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || (
          <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
        )}
      </div>

      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg',
            positionClasses[position],
            sizeClasses[size],
            className
          )}
          role="tooltip"
        >
          {title && (
            <div className="font-semibold mb-1 text-gray-100">{title}</div>
          )}
          <div className="text-gray-200">{content}</div>

          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
};