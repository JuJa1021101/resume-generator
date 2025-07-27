import React, { useEffect, useState } from 'react';
import { performanceMonitor, usePerformanceMonitor } from '../services/performance';
import { PerformanceDashboard } from '../components/performance';

// Example component showing how to integrate performance monitoring
export const PerformanceIntegrationExample: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const perf = usePerformanceMonitor();

  useEffect(() => {
    initializePerformanceMonitoring();
  }, []);

  const initializePerformanceMonitoring = async () => {
    try {
      // Initialize performance monitoring with custom configuration
      await performanceMonitor.initialize({
        enableWebVitals: true,
        enableCustomMetrics: true,
        enableAutoReporting: true,
        reportingInterval: 5 * 60 * 1000, // 5 minutes
        maxEntries: 1000,
        benchmarks: [
          { operation: 'page-load', target: 2000, warning: 3000, critical: 5000 },
          { operation: 'ai-processing', target: 5000, warning: 8000, critical: 15000 },
          { operation: 'pdf-generation', target: 3000, warning: 5000, critical: 10000 },
          { operation: 'chart-render', target: 500, warning: 1000, critical: 2000 }
        ]
      });

      // Set up alert handling
      performanceMonitor.onAlert((alert) => {
        console.warn('Performance Alert:', alert);

        // You could show a toast notification here
        if (alert.severity === 'critical') {
          // Handle critical alerts
          console.error('Critical performance issue detected:', alert.message);
        }
      });

      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize performance monitoring');
    }
  };

  // Example: Monitoring AI processing
  const handleAIProcessing = async () => {
    const eventId = perf.startEvent('ai-processing', 'job-analysis', {
      jobId: 'job-123',
      userId: 'user-456'
    });

    try {
      // Simulate AI processing
      await simulateAIProcessing();

      const duration = perf.endEvent(eventId);
      console.log(`AI processing completed in ${duration}ms`);
    } catch (error) {
      perf.endEvent(eventId);
      throw error;
    }
  };

  // Example: Monitoring component render performance
  const MonitoredComponent: React.FC<{ data: any }> = ({ data }) => {
    useEffect(() => {
      const eventId = perf.startEvent('component-render', 'MonitoredComponent');

      return () => {
        perf.endEvent(eventId);
      };
    }, [data]);

    return (
      <div>
        <h3>Monitored Component</h3>
        <p>This component's render time is being tracked</p>
      </div>
    );
  };

  // Example: Using measureFunction for automatic tracking
  const generatePDF = perf.measureFunction(
    async () => {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'pdf-blob';
    },
    'pdf-generation',
    'resume-export'
  );

  // Example: Manual cache operation tracking
  const getCachedData = async (key: string) => {
    const eventId = perf.startEvent('cache-operation', 'get-data', { key });

    try {
      // Check cache first
      const cached = localStorage.getItem(key);
      if (cached) {
        perf.endEvent(eventId);
        // Mark as cache hit
        perf.startEvent('cache-operation', 'cache-hit', { hit: true });
        return JSON.parse(cached);
      }

      // Cache miss - fetch data
      perf.endEvent(eventId);
      perf.startEvent('cache-operation', 'cache-miss', { miss: true });

      const data = await fetchData(key);
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch (error) {
      perf.endEvent(eventId);
      throw error;
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-medium">Performance Monitoring Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">Initializing performance monitoring...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Performance Monitoring Integration</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Test Performance Tracking</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleAIProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test AI Processing
              </button>
              <button
                onClick={() => generatePDF()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test PDF Generation
              </button>
              <button
                onClick={() => getCachedData('test-key')}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Test Cache Operation
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Current Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Performance Score"
                value={perf.getPerformanceScore()}
                unit=""
                color="blue"
              />
              <MetricCard
                title="AI Processing"
                value={perf.getCustomMetrics().aiProcessingTime || 0}
                unit="ms"
                color="green"
              />
              <MetricCard
                title="Cache Hit Rate"
                value={perf.getCustomMetrics().cacheHitRate || 0}
                unit="%"
                color="purple"
              />
              <MetricCard
                title="Memory Usage"
                value={(perf.getCustomMetrics().heapUsed || 0) / 1024 / 1024}
                unit="MB"
                color="orange"
              />
            </div>
          </div>

          <MonitoredComponent data={{ test: 'data' }} />
        </div>
      </div>

      {/* Performance Dashboard */}
      <PerformanceDashboard />
    </div>
  );
};

// Helper component for displaying metrics
const MetricCard: React.FC<{
  title: string;
  value: number;
  unit: string;
  color: string;
}> = ({ title, value, unit, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800'
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-lg font-bold">
        {value.toFixed(unit === 'MB' ? 1 : 0)}{unit}
      </div>
    </div>
  );
};

// Helper functions for simulation
const simulateAIProcessing = async () => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
};

const fetchData = async (key: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { key, data: 'fetched-data', timestamp: Date.now() };
};

export default PerformanceIntegrationExample;