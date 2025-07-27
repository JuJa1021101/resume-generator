import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { PerformanceEntry } from '../../services/performance/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PerformanceMetricsChartProps {
  entries: PerformanceEntry[];
  title?: string;
  showFilters?: boolean;
  height?: number;
}

export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  entries,
  title = 'Performance Metrics',
  showFilters = false,
  height = 400
}) => {
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | 'all'>('24h');
  const [metricType, setMetricType] = useState<'duration' | 'webvitals' | 'memory'>('duration');

  // Get unique operations
  const operations = useMemo(() => {
    const ops = Array.from(new Set(entries.map(entry => entry.operation)));
    return ops.sort();
  }, [entries]);

  // Filter entries based on selected criteria
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by time range
    if (timeRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      };
      const cutoff = now - ranges[timeRange];
      filtered = filtered.filter(entry => entry.timestamp >= cutoff);
    }

    // Filter by selected operations
    if (selectedOperations.length > 0) {
      filtered = filtered.filter(entry => selectedOperations.includes(entry.operation));
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [entries, timeRange, selectedOperations]);

  // Prepare chart data based on metric type
  const chartData = useMemo(() => {
    if (metricType === 'duration') {
      // Group by operation
      const operationGroups = filteredEntries.reduce((acc, entry) => {
        if (!acc[entry.operation]) {
          acc[entry.operation] = [];
        }
        acc[entry.operation].push(entry);
        return acc;
      }, {} as Record<string, PerformanceEntry[]>);

      const colors = [
        'rgb(59, 130, 246)', // blue
        'rgb(16, 185, 129)', // green
        'rgb(245, 158, 11)', // yellow
        'rgb(239, 68, 68)',  // red
        'rgb(139, 92, 246)', // purple
        'rgb(236, 72, 153)', // pink
        'rgb(14, 165, 233)', // sky
        'rgb(34, 197, 94)'   // emerald
      ];

      const datasets = Object.entries(operationGroups).map(([operation, opEntries], index) => ({
        label: operation,
        data: opEntries.map(entry => ({
          x: entry.timestamp,
          y: entry.duration
        })),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4
      }));

      return {
        datasets
      };
    } else if (metricType === 'webvitals') {
      const webVitalsEntries = filteredEntries.filter(entry => entry.webVitals);

      const datasets = [
        {
          label: 'FCP (ms)',
          data: webVitalsEntries.map(entry => ({
            x: entry.timestamp,
            y: entry.webVitals?.fcp || 0
          })),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgb(59, 130, 246, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'LCP (ms)',
          data: webVitalsEntries.map(entry => ({
            x: entry.timestamp,
            y: entry.webVitals?.lcp || 0
          })),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgb(16, 185, 129, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'FID (ms)',
          data: webVitalsEntries.map(entry => ({
            x: entry.timestamp,
            y: entry.webVitals?.fid || 0
          })),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgb(245, 158, 11, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'CLS (score)',
          data: webVitalsEntries.map(entry => ({
            x: entry.timestamp,
            y: (entry.webVitals?.cls || 0) * 1000 // Scale for visibility
          })),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgb(239, 68, 68, 0.1)',
          yAxisID: 'y1'
        }
      ];

      return { datasets };
    } else if (metricType === 'memory') {
      const memoryEntries = filteredEntries.filter(entry => entry.customMetrics?.heapUsed);

      const datasets = [
        {
          label: 'Heap Used (MB)',
          data: memoryEntries.map(entry => ({
            x: entry.timestamp,
            y: (entry.customMetrics?.heapUsed || 0) / 1024 / 1024
          })),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgb(139, 92, 246, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Heap Total (MB)',
          data: memoryEntries.map(entry => ({
            x: entry.timestamp,
            y: (entry.customMetrics?.heapTotal || 0) / 1024 / 1024
          })),
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgb(236, 72, 153, 0.1)',
          yAxisID: 'y'
        }
      ];

      return { datasets };
    }

    return { datasets: [] };
  }, [filteredEntries, metricType]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => {
            return new Date(context[0].parsed.x).toLocaleString();
          },
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;

            if (metricType === 'memory') {
              return `${label}: ${value.toFixed(2)} MB`;
            } else if (metricType === 'webvitals' && label === 'CLS (score)') {
              return `${label}: ${(value / 1000).toFixed(3)}`;
            } else {
              return `${label}: ${value.toFixed(2)} ms`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MM/dd HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: metricType === 'memory' ? 'Memory (MB)' : 'Duration (ms)'
        }
      },
      ...(metricType === 'webvitals' && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'CLS Score (×1000)'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      })
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const handleOperationToggle = (operation: string) => {
    setSelectedOperations(prev =>
      prev.includes(operation)
        ? prev.filter(op => op !== operation)
        : [...prev, operation]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {showFilters && (
        <div className="mb-6 space-y-4">
          {/* Metric Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric Type
            </label>
            <div className="flex space-x-2">
              {[
                { value: 'duration', label: 'Duration' },
                { value: 'webvitals', label: 'Web Vitals' },
                { value: 'memory', label: 'Memory' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setMetricType(option.value as any)}
                  className={`px-3 py-1 rounded text-sm ${metricType === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <div className="flex space-x-2">
              {[
                { value: '1h', label: '1 Hour' },
                { value: '6h', label: '6 Hours' },
                { value: '24h', label: '24 Hours' },
                { value: 'all', label: 'All Time' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as any)}
                  className={`px-3 py-1 rounded text-sm ${timeRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operation Filter */}
          {metricType === 'duration' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operations ({selectedOperations.length === 0 ? 'All' : selectedOperations.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {operations.map(operation => (
                  <button
                    key={operation}
                    onClick={() => handleOperationToggle(operation)}
                    className={`px-3 py-1 rounded text-sm ${selectedOperations.includes(operation) || selectedOperations.length === 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {operation}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        {chartData.datasets.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div>No data available for the selected filters</div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {filteredEntries.length}
            </div>
            <div className="text-sm text-gray-600">Total Entries</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {(filteredEntries.reduce((sum, e) => sum + e.duration, 0) / filteredEntries.length).toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-600">Avg Duration</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(...filteredEntries.map(e => e.duration)).toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-600">Max Duration</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.min(...filteredEntries.map(e => e.duration)).toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-600">Min Duration</div>
          </div>
        </div>
      )}
    </div>
  );
};