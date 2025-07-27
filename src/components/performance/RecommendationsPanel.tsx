import React, { useState } from 'react';
import { PerformanceRecommendation } from '../../services/performance/types';

interface RecommendationsPanelProps {
  recommendations: PerformanceRecommendation[];
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations
}) => {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'optimization' | 'regression' | 'warning'>('all');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  const filteredRecommendations = recommendations.filter(rec => {
    if (filter !== 'all' && rec.impact !== filter) return false;
    if (typeFilter !== 'all' && rec.type !== typeFilter) return false;
    if (showOnlyActionable && !rec.actionable) return false;
    return true;
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return '⚡';
      case 'regression': return '📉';
      case 'warning': return '⚠️';
      default: return '💡';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '❓';
    }
  };

  const getPriorityScore = (rec: PerformanceRecommendation) => {
    const impactScore = rec.impact === 'high' ? 3 : rec.impact === 'medium' ? 2 : 1;
    const effortScore = rec.effort === 'low' ? 3 : rec.effort === 'medium' ? 2 : 1;
    const actionableScore = rec.actionable ? 2 : 1;
    return impactScore * effortScore * actionableScore;
  };

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) =>
    getPriorityScore(b) - getPriorityScore(a)
  );

  const impactCounts = {
    high: recommendations.filter(r => r.impact === 'high').length,
    medium: recommendations.filter(r => r.impact === 'medium').length,
    low: recommendations.filter(r => r.impact === 'low').length
  };

  const actionableCount = recommendations.filter(r => r.actionable).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Performance Recommendations</h3>
          <p className="text-sm text-gray-600">
            Actionable suggestions to improve application performance
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{recommendations.length}</div>
          <div className="text-sm text-gray-500">Total Recommendations</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="text-lg font-bold text-red-600">{impactCounts.high}</div>
          <div className="text-sm text-gray-600">High Impact</div>
        </div>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="text-lg font-bold text-yellow-600">{impactCounts.medium}</div>
          <div className="text-sm text-gray-600">Medium Impact</div>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600">{impactCounts.low}</div>
          <div className="text-sm text-gray-600">Low Impact</div>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600">{actionableCount}</div>
          <div className="text-sm text-gray-600">Actionable</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Impact
          </label>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All' },
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
              { value: 'optimization', label: 'Optimization' },
              { value: 'regression', label: 'Regression' },
              { value: 'warning', label: 'Warning' }
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

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showOnlyActionable}
              onChange={(e) => setShowOnlyActionable(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Actionable only</span>
          </label>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <div>No recommendations found for the selected filters</div>
          </div>
        ) : (
          sortedRecommendations.map((recommendation, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getImpactColor(recommendation.impact)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">
                      {getImpactIcon(recommendation.impact)}
                    </span>
                    <span className="text-sm">
                      {getTypeIcon(recommendation.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {recommendation.title}
                      </h4>
                      {recommendation.actionable && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Actionable
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      {recommendation.description}
                    </p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">Impact:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${recommendation.impact === 'high' ? 'bg-red-100 text-red-800' :
                            recommendation.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {recommendation.impact.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">Effort:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEffortColor(recommendation.effort)}`}>
                          {recommendation.effort.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">Type:</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {recommendation.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="text-xs text-gray-500">Priority</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-blue-600 text-lg mr-2">🚀</span>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                {recommendations
                  .filter(r => r.actionable && r.impact === 'high')
                  .slice(0, 3)
                  .map((rec, index) => (
                    <div key={index} className="text-sm text-blue-800">
                      • {rec.title}
                    </div>
                  ))}
              </div>
              {recommendations.filter(r => r.actionable && r.impact === 'high').length === 0 && (
                <p className="text-sm text-blue-800">
                  Great job! No high-impact actionable items found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-gray-600 text-lg mr-2">💡</span>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Performance Tips</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Focus on high-impact, low-effort recommendations first</li>
              <li>• Monitor performance after implementing changes</li>
              <li>• Set up alerts for critical performance thresholds</li>
              <li>• Regular performance audits help catch issues early</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};