import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChartConfig, ChartTheme } from './types';
import { defaultChartConfig, getTheme } from './utils/chartThemes';
import { calculateChartDimensions, debounce } from './utils/chartUtils';

interface ChartContainerProps {
  children: React.ReactNode;
  config?: Partial<ChartConfig>;
  className?: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  onResize?: (dimensions: { width: number; height: number }) => void;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  config = {},
  className = '',
  title,
  subtitle,
  loading = false,
  error,
  onResize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [isVisible, setIsVisible] = useState(false);

  const chartConfig: ChartConfig = { ...defaultChartConfig, ...config };
  const theme: ChartTheme = getTheme(chartConfig.theme.name);

  // Handle resize with debouncing
  const handleResize = debounce(() => {
    if (containerRef.current && chartConfig.responsive) {
      const newDimensions = calculateChartDimensions(
        containerRef.current,
        chartConfig.width / chartConfig.height
      );
      setDimensions(newDimensions);
      onResize?.(newDimensions);
    }
  }, 250);

  // Set up resize observer
  useEffect(() => {
    if (!chartConfig.responsive) return;

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize, chartConfig.responsive]);

  // Set up intersection observer for animations
  useEffect(() => {
    if (!chartConfig.animations) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [chartConfig.animations]);

  // Initial dimensions setup
  useEffect(() => {
    if (containerRef.current && chartConfig.responsive) {
      const initialDimensions = calculateChartDimensions(
        containerRef.current,
        chartConfig.width / chartConfig.height
      );
      setDimensions(initialDimensions);
      onResize?.(initialDimensions);
    }
  }, []);

  const containerStyle = {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.family,
  };

  return (
    <motion.div
      ref={containerRef}
      className={`chart-container relative rounded-lg border p-6 ${className}`}
      style={containerStyle}
      initial={chartConfig.animations ? { opacity: 0, y: 20 } : false}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3
              className="text-lg font-semibold"
              style={{ color: theme.colors.text }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="text-sm opacity-75 mt-1"
              style={{ color: theme.colors.text }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 z-10">
            <div className="flex items-center space-x-2">
              <div
                className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                style={{ borderColor: theme.colors.accent }}
              />
              <span style={{ color: theme.colors.text }}>加载中...</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: theme.colors.background }}
          >
            <div className="text-center">
              <div
                className="text-red-500 mb-2"
                style={{ color: theme.colors.primary[3] }}
              >
                ⚠️ 图表加载失败
              </div>
              <p
                className="text-sm opacity-75"
                style={{ color: theme.colors.text }}
              >
                {error}
              </p>
            </div>
          </div>
        )}

        <div
          className="chart-content"
          style={{
            width: chartConfig.responsive ? '100%' : dimensions.width,
            height: chartConfig.responsive ? 'auto' : dimensions.height,
            minHeight: chartConfig.responsive ? dimensions.height : 'auto',
          }}
        >
          {React.cloneElement(children as React.ReactElement, {
            dimensions,
            theme,
            config: chartConfig,
            isVisible,
          })}
        </div>
      </div>

      {/* Chart Border */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          border: `1px solid ${theme.colors.grid}`,
        }}
      />
    </motion.div>
  );
};

export default ChartContainer;