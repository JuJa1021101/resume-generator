import React, { useState } from 'react';
import { PerformanceBenchmarkResult, PerformanceBenchmark } from '../../services/performance/types';

interface BenchmarkResultsProps {
  results: PerformanceBenchmarkResult[];
  onUpdateBenchmarks?: (benchmarks: PerformanceBenchmark[]) => void;
}

export const BenchmarkResults: React.FC<BenchmarkResultsProps> = ({
  results,
  onUpdateBenchmarks
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editingBenchmarks, setEditingBenchmarks] = useState<PerformanceBenchmark[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  const handleEditStart = () => {
    const benchmarks: PerformanceBenchmark[] = results.map(result => ({
      operation: result.operation,
      target: result.target,
      warning: result.target * 1.5, // Estimate warning threshold
      critical: result.target * 2.5  // Estimate critical threshold
    }));

    setEditingBenchmarks(benchmarks);
    setEditMode(true);
  };

  const handleEditSave = () => {
    if (onUpdateBenchmarks) {
      onUpdateBenchmarks(editingBenchmarks);
    }
    setEditMode(false);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditingBenchmarks([]);
  };

  const updateBenchmark = (index: number, field: keyof PerformanceBenchmark, value: number) => {
    const updated = [...editingBenchmarks];
    updated[index] = { ...updated[index], [field]: value };
    setEditingBenchmarks(updated);
  };

  const addBenchmark = () => {
    setEditingBenchmarks([
      ...editingBenchmarks,
      {
        operation: 'new-operation',
        target: 1000,
        warning: 1500,
        critical: 2500
      }
    ]);
  };

  const removeBenchmark = (index: number) => {
    setEditingBenchmarks(editingBenchmarks.filter((_, i) => i !== index));
  };

  const passedCount = results.filter(r => r.status === 'pass').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const criticalCount = results.filter(r => r.status === 'critical').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Performance Benchmarks</h3>
          <p className="text-sm text-gray-600">
            Compare current performance against defined targets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!editMode ? (
            <button
              onClick={handleEditStart}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ⚙️ Edit Benchmarks
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ✅ Save
              </button>
              <button
                onClick={handleEditCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{results.length}</div>
          <div className="text-sm text-gray-600">Total Benchmarks</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{passedCount}</div>
          <div className="text-sm text-gray-600">Passed</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
      </div>

      {/* Benchmark Results */}
      {!editMode ? (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={result.operation}
              className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">
                    {getStatusIcon(result.status)}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{result.operation}</h4>
                    <p className="text-sm text-gray-600">
                      Current: {result.current.toFixed(2)}ms | Target: {result.target.toFixed(2)}ms
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${result.status === 'pass' ? 'text-green-600' :
                      result.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {result.status === 'pass' ? 'PASS' :
                      result.improvement > 0 ? `+${result.improvement.toFixed(1)}%` : 'OK'}
                  </div>
                  {result.improvement > 0 && (
                    <div className="text-sm text-gray-600">
                      needs improvement
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>0ms</span>
                  <span>Target: {result.target.toFixed(0)}ms</span>
                  <span>{Math.max(result.current, result.target * 2).toFixed(0)}ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Target line */}
                    <div
                      className="absolute top-0 w-0.5 h-full bg-blue-600"
                      style={{
                        left: `${(result.target / (result.target * 2)) * 100}%`
                      }}
                    />
                    {/* Current value bar */}
                    <div
                      className={`h-full transition-all duration-300 ${result.status === 'pass' ? 'bg-green-500' :
                          result.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      style={{
                        width: `${Math.min(100, (result.current / (result.target * 2)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Edit Benchmarks</h4>
            <button
              onClick={addBenchmark}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              + Add Benchmark
            </button>
          </div>

          {editingBenchmarks.map((benchmark, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-5 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operation
                  </label>
                  <input
                    type="text"
                    value={benchmark.operation}
                    onChange={(e) => updateBenchmark(index, 'operation', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target (ms)
                  </label>
                  <input
                    type="number"
                    value={benchmark.target}
                    onChange={(e) => updateBenchmark(index, 'target', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warning (ms)
                  </label>
                  <input
                    type="number"
                    value={benchmark.warning}
                    onChange={(e) => updateBenchmark(index, 'warning', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Critical (ms)
                  </label>
                  <input
                    type="number"
                    value={benchmark.critical}
                    onChange={(e) => updateBenchmark(index, 'critical', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => removeBenchmark(index)}
                    className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-blue-600 text-lg mr-2">💡</span>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Benchmark Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Target:</strong> Ideal performance goal for the operation</li>
              <li>• <strong>Warning:</strong> Threshold that indicates performance degradation</li>
              <li>• <strong>Critical:</strong> Threshold that requires immediate attention</li>
              <li>• Benchmarks help detect performance regressions and guide optimization efforts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};