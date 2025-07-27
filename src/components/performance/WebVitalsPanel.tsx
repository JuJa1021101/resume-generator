import React from 'react';
import { WebVitalsMetrics } from '../../services/performance/types';

interface WebVitalsPanelProps {
  webVitals: WebVitalsMetrics;
}

interface VitalMetric {
  name: string;
  value: number;
  unit: string;
  thresholds: {
    good: number;
    poor: number;
  };
  description: string;
}

export const WebVitalsPanel: React.FC<WebVitalsPanelProps> = ({ webVitals }) => {
  const metrics: VitalMetric[] = [
    {
      name: 'First Contentful Paint',
      value: webVitals.fcp,
      unit: 'ms',
      thresholds: { good: 1800, poor: 3000 },
      description: 'Time until the first content appears on screen'
    },
    {
      name: 'Largest Contentful Paint',
      value: webVitals.lcp,
      unit: 'ms',
      thresholds: { good: 2500, poor: 4000 },
      description: 'Time until the largest content element is rendered'
    },
    {
      name: 'First Input Delay',
      value: webVitals.fid,
      unit: 'ms',
      thresholds: { good: 100, poor: 300 },
      description: 'Time from first user interaction to browser response'
    },
    {
      name: 'Cumulative Layout Shift',
      value: webVitals.cls,
      unit: '',
      thresholds: { good: 0.1, poor: 0.25 },
      description: 'Visual stability - how much content shifts during loading'
    },
    {
      name: 'Time to First Byte',
      value: webVitals.ttfb,
      unit: 'ms',
      thresholds: { good: 800, poor: 1800 },
      description: 'Time until the first byte is received from the server'
    },
    {
      name: 'Time to Interactive',
      value: webVitals.tti,
      unit: 'ms',
      thresholds: { good: 3800, poor: 7300 },
      description: 'Time until the page is fully interactive'
    }
  ];

  const getScoreColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'bg-green-50 border-green-200';
    if (value <= thresholds.poor) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreIcon = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return '✅';
    if (value <= thresholds.poor) return '⚠️';
    return '❌';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '') {
      return value.toFixed(3);
    }
    return `${value.toFixed(0)}${unit}`;
  };

  const calculateOverallScore = () => {
    const weights = {
      fcp: 0.15,
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      ttfb: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    metrics.slice(0, 5).forEach((metric) => {
      const key = metric.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) as keyof typeof weights;
      const weight = weights[key] || 0;

      if (weight > 0 && metric.value > 0) {
        let score = 100;
        if (metric.value > metric.thresholds.poor) {
          score = 0;
        } else if (metric.value > metric.thresholds.good) {
          score = 50 * (1 - (metric.value - metric.thresholds.good) / (metric.thresholds.poor - metric.thresholds.good));
        }

        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  };

  const overallScore = calculateOverallScore();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Web Vitals</h3>
          <p className="text-sm text-gray-600">Core performance metrics that affect user experience</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${overallScore >= 80 ? 'text-green-600' :
              overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
            {overallScore}
          </div>
          <div className="text-sm text-gray-500">Overall Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className={`p-4 rounded-lg border ${getScoreBackground(metric.value, metric.thresholds)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-lg mr-2">
                  {getScoreIcon(metric.value, metric.thresholds)}
                </span>
                <h4 className="font-medium text-gray-900 text-sm">{metric.name}</h4>
              </div>
              <div className={`text-lg font-bold ${getScoreColor(metric.value, metric.thresholds)}`}>
                {metric.value > 0 ? formatValue(metric.value, metric.unit) : 'N/A'}
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3">{metric.description}</p>

            {/* Threshold indicators */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600">Good</span>
                <span className="text-green-600">
                  ≤ {formatValue(metric.thresholds.good, metric.unit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-600">Needs Improvement</span>
                <span className="text-yellow-600">
                  ≤ {formatValue(metric.thresholds.poor, metric.unit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600">Poor</span>
                <span className="text-red-600">
                  &gt; {formatValue(metric.thresholds.poor, metric.unit)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metric.value <= metric.thresholds.good ? 'bg-green-500' :
                      metric.value <= metric.thresholds.poor ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{
                    width: `${Math.min(100, (metric.value / (metric.thresholds.poor * 1.5)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-blue-600 text-lg mr-2">💡</span>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">About Web Vitals</h4>
            <p className="text-sm text-blue-800">
              Web Vitals are a set of metrics that measure real-world user experience.
              These metrics are used by Google as ranking factors and directly impact user satisfaction.
            </p>
            <div className="mt-2">
              <a
                href="https://web.dev/vitals/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Learn more about Web Vitals →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};