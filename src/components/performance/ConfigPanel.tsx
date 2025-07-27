import React, { useState } from 'react';
import { PerformanceConfig, PerformanceBenchmark } from '../../services/performance/types';

interface ConfigPanelProps {
  config: PerformanceConfig;
  onUpdate: (updates: Partial<PerformanceConfig>) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onUpdate }) => {
  const [editingConfig, setEditingConfig] = useState<PerformanceConfig>({ ...config });
  const [hasChanges, setHasChanges] = useState(false);

  const handleConfigChange = (key: keyof PerformanceConfig, value: any) => {
    setEditingConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleBenchmarkChange = (index: number, field: keyof PerformanceBenchmark, value: any) => {
    const updatedBenchmarks = [...editingConfig.benchmarks];
    updatedBenchmarks[index] = { ...updatedBenchmarks[index], [field]: value };
    handleConfigChange('benchmarks', updatedBenchmarks);
  };

  const addBenchmark = () => {
    const newBenchmark: PerformanceBenchmark = {
      operation: 'new-operation',
      target: 1000,
      warning: 1500,
      critical: 2500
    };
    handleConfigChange('benchmarks', [...editingConfig.benchmarks, newBenchmark]);
  };

  const removeBenchmark = (index: number) => {
    const updatedBenchmarks = editingConfig.benchmarks.filter((_, i) => i !== index);
    handleConfigChange('benchmarks', updatedBenchmarks);
  };

  const handleSave = () => {
    onUpdate(editingConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditingConfig({ ...config });
    setHasChanges(false);
  };

  const formatInterval = (ms: number) => {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    return `${ms / 3600000}h`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Performance Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure monitoring settings and performance benchmarks
          </p>
        </div>
        {hasChanges && (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              ✅ Save Changes
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              ↩️ Reset
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">General Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingConfig.enableWebVitals}
                  onChange={(e) => handleConfigChange('enableWebVitals', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable Web Vitals Monitoring</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Monitor Core Web Vitals metrics (FCP, LCP, FID, CLS, TTFB)
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingConfig.enableCustomMetrics}
                  onChange={(e) => handleConfigChange('enableCustomMetrics', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable Custom Metrics</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Track custom performance metrics (AI processing, memory usage, etc.)
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingConfig.enableAutoReporting}
                  onChange={(e) => handleConfigChange('enableAutoReporting', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable Auto Reporting</span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Automatically generate performance reports at regular intervals
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Entries to Store
              </label>
              <input
                type="number"
                value={editingConfig.maxEntries}
                onChange={(e) => handleConfigChange('maxEntries', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="100"
                max="10000"
                step="100"
              />
              <p className="text-xs text-gray-600 mt-1">
                Maximum number of performance entries to store locally
              </p>
            </div>
          </div>
        </div>

        {/* Reporting Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Reporting Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting Interval
              </label>
              <select
                value={editingConfig.reportingInterval}
                onChange={(e) => handleConfigChange('reportingInterval', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={600000}>10 minutes</option>
                <option value={1800000}>30 minutes</option>
                <option value={3600000}>1 hour</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                How often to generate automatic performance reports
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Interval
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
                {formatInterval(editingConfig.reportingInterval)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Reports will be generated every {formatInterval(editingConfig.reportingInterval)}
              </p>
            </div>
          </div>
        </div>

        {/* Benchmarks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Performance Benchmarks</h4>
            <button
              onClick={addBenchmark}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              + Add Benchmark
            </button>
          </div>

          <div className="space-y-4">
            {editingConfig.benchmarks.map((benchmark, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operation
                    </label>
                    <input
                      type="text"
                      value={benchmark.operation}
                      onChange={(e) => handleBenchmarkChange(index, 'operation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="operation-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target (ms)
                    </label>
                    <input
                      type="number"
                      value={benchmark.target}
                      onChange={(e) => handleBenchmarkChange(index, 'target', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warning (ms)
                    </label>
                    <input
                      type="number"
                      value={benchmark.warning}
                      onChange={(e) => handleBenchmarkChange(index, 'warning', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Critical (ms)
                    </label>
                    <input
                      type="number"
                      value={benchmark.critical}
                      onChange={(e) => handleBenchmarkChange(index, 'critical', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => removeBenchmark(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      title="Remove benchmark"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Validation warnings */}
                {benchmark.warning <= benchmark.target && (
                  <div className="mt-2 text-xs text-yellow-600">
                    ⚠️ Warning threshold should be higher than target
                  </div>
                )}
                {benchmark.critical <= benchmark.warning && (
                  <div className="mt-2 text-xs text-red-600">
                    ❌ Critical threshold should be higher than warning
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Storage Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Storage Information</h4>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Max Entries</div>
                <div className="text-gray-600">{editingConfig.maxEntries.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Estimated Size</div>
                <div className="text-gray-600">
                  ~{Math.round(editingConfig.maxEntries * 0.5)}KB
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Benchmarks</div>
                <div className="text-gray-600">{editingConfig.benchmarks.length}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Auto Reports</div>
                <div className="text-gray-600">
                  {editingConfig.enableAutoReporting ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-2">💡</span>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Configuration Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Set realistic benchmark targets based on your application's requirements</li>
                <li>• Enable Web Vitals monitoring for better user experience insights</li>
                <li>• Adjust reporting interval based on your monitoring needs</li>
                <li>• Higher max entries provide more historical data but use more storage</li>
                <li>• Custom metrics help track application-specific performance indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};