import React, { useState } from 'react';
import { PerformanceAlert } from '../../services/performance/types';

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'threshold' | 'regression' | 'anomaly'>('all');

  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'all' && alert.severity !== filter) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threshold': return '📊';
      case 'regression': return '📉';
      case 'anomaly': return '🔍';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const severityCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length
  };

  const typeCounts = {
    threshold: alerts.filter(a => a.type === 'threshold').length,
    regression: alerts.filter(a => a.type === 'regression').length,
    anomaly: alerts.filter(a => a.type === 'anomaly').length
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Performance Alerts</h3>
          <p className="text-sm text-gray-600">
            Real-time notifications about performance issues
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
          <div className="text-sm text-gray-500">Total Alerts</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="text-lg font-bold text-red-600">{severityCounts.critical}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="text-lg font-bold text-yellow-600">{severityCounts.high}</div>
          <div className="text-sm text-gray-600">High</div>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600">{severityCounts.medium}</div>
          <div className="text-sm text-gray-600">Medium</div>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-600">{severityCounts.low}</div>
          <div className="text-sm text-gray-600">Low</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as any)}
                className={`px-3 py-1 rounded text-sm ${filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'threshold', label: 'Threshold' },
              { value: 'regression', label: 'Regression' },
              { value: 'anomaly', label: 'Anomaly' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setTypeFilter(option.value as any)}
                className={`px-3 py-1 rounded text-sm ${typeFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <div>No alerts found for the selected filters</div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">
                      {getSeverityIcon(alert.severity)}
                    </span>
                    <span className="text-sm">
                      {getTypeIcon(alert.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                        }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {alert.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {alert.operation}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>Value: {alert.value.toFixed(2)}ms</span>
                      <span>Threshold: {alert.threshold.toFixed(2)}ms</span>
                      <span>Time: {formatTimestamp(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Statistics */}
      {alerts.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Alert Statistics</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">By Type</div>
              <div className="space-y-1 mt-1">
                <div className="flex justify-between">
                  <span>Threshold:</span>
                  <span>{typeCounts.threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span>Regression:</span>
                  <span>{typeCounts.regression}</span>
                </div>
                <div className="flex justify-between">
                  <span>Anomaly:</span>
                  <span>{typeCounts.anomaly}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Most Affected</div>
              <div className="space-y-1 mt-1">
                {Object.entries(
                  alerts.reduce((acc, alert) => {
                    acc[alert.operation] = (acc[alert.operation] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([operation, count]) => (
                    <div key={operation} className="flex justify-between">
                      <span className="truncate">{operation}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Recent Activity</div>
              <div className="space-y-1 mt-1">
                <div className="flex justify-between">
                  <span>Last hour:</span>
                  <span>
                    {alerts.filter(a =>
                      new Date().getTime() - a.timestamp.getTime() < 3600000
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last 24h:</span>
                  <span>
                    {alerts.filter(a =>
                      new Date().getTime() - a.timestamp.getTime() < 86400000
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>This week:</span>
                  <span>
                    {alerts.filter(a =>
                      new Date().getTime() - a.timestamp.getTime() < 604800000
                    ).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};