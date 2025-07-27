import React, { useState, useEffect } from 'react';
import {
  PerformanceReport,
  PerformanceAlert,
  PerformanceConfig,
  PerformanceBenchmarkResult
} from '../../services/performance/types';
import { performanceMonitor } from '../../services/performance/performance-monitor';
import { PerformanceMetricsChart } from './PerformanceMetricsChart';
import { WebVitalsPanel } from './WebVitalsPanel';
import { BenchmarkResults } from './BenchmarkResults';
import { AlertsPanel } from './AlertsPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { ConfigPanel } from './ConfigPanel';

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = ''
}) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [config, setConfig] = useState<PerformanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'benchmarks' | 'alerts' | 'config'>('overview');

  useEffect(() => {
    initializeDashboard();

    // Set up alert listener
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    };

    performanceMonitor.onAlert(handleAlert);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize performance monitor if not already done
      await performanceMonitor.initialize();

      // Load initial data
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize dashboard');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [dailyReport, recentAlerts, currentConfig] = await Promise.all([
        performanceMonitor.getDailyReport(),
        performanceMonitor.getAlerts(undefined, 50),
        Promise.resolve(performanceMonitor.getConfig())
      ]);

      setReport(dailyReport);
      setAlerts(recentAlerts);
      setConfig(currentConfig);
    } catch (err) {
      console.error('Failed to refresh dashboard data:', err);
      setError('Failed to refresh data');
    }
  };

  const handleConfigUpdate = async (updates: Partial<PerformanceConfig>) => {
    try {
      await performanceMonitor.updateConfig(updates);
      setConfig(performanceMonitor.getConfig());
    } catch (err) {
      console.error('Failed to update config:', err);
      setError('Failed to update configuration');
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all performance data? This action cannot be undone.')) {
      try {
        await performanceMonitor.clearData();
        await refreshData();
      } catch (err) {
        console.error('Failed to clear data:', err);
        setError('Failed to clear data');
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'benchmarks', label: 'Benchmarks', icon: '🎯' },
    { id: 'alerts', label: 'Alerts', icon: '🚨', badge: alerts.length },
    { id: 'config', label: 'Config', icon: '⚙️' }
  ] as const;

  if (loading) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={initializeDashboard}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor and analyze application performance metrics
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              🗑️ Clear Data
            </button>
          </div>
        </div>

        {/* Performance Score */}
        {report && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Performance Score</h3>
                <p className="text-sm text-gray-600">Overall application performance</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${report.summary.performanceScore >= 80 ? 'text-green-600' :
                    report.summary.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {report.summary.performanceScore}
                </div>
                <div className="text-sm text-gray-500">/ 100</div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {report.summary.averageLoadTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-600">Avg Load Time</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {report.summary.averageAIProcessingTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-600">AI Processing</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {report.summary.cacheEfficiency.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Cache Hit Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${report.summary.regressionDetected ? 'text-red-600' : 'text-green-600'
                  }`}>
                  {report.summary.regressionDetected ? '⚠️' : '✅'}
                </div>
                <div className="text-xs text-gray-600">Regression</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && report && (
          <div className="space-y-6">
            <WebVitalsPanel webVitals={report.webVitals} />
            <PerformanceMetricsChart
              entries={report.entries.slice(-50)}
              title="Recent Performance Trends"
            />
            {report.recommendations.length > 0 && (
              <RecommendationsPanel recommendations={report.recommendations} />
            )}
          </div>
        )}

        {activeTab === 'metrics' && report && (
          <div className="space-y-6">
            <PerformanceMetricsChart
              entries={report.entries}
              title="Detailed Performance Metrics"
              showFilters={true}
            />
          </div>
        )}

        {activeTab === 'benchmarks' && report && (
          <BenchmarkResults
            results={report.benchmarks}
            onUpdateBenchmarks={(benchmarks) =>
              handleConfigUpdate({ benchmarks })
            }
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPanel alerts={alerts} />
        )}

        {activeTab === 'config' && config && (
          <ConfigPanel
            config={config}
            onUpdate={handleConfigUpdate}
          />
        )}
      </div>
    </div>
  );
};