import React from 'react';
import {
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export const HistoryPage: React.FC = () => {
  const mockHistory = [
    {
      id: 1,
      jobTitle: '前端开发工程师',
      company: '某科技公司',
      matchScore: 85,
      analyzedAt: '2024-01-15',
    },
    {
      id: 2,
      jobTitle: 'React 开发者',
      company: '某互联网公司',
      matchScore: 92,
      analyzedAt: '2024-01-10',
    },
    {
      id: 3,
      jobTitle: '全栈工程师',
      company: '某创业公司',
      matchScore: 78,
      analyzedAt: '2024-01-05',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">分析历史</h1>
        <p className="mt-2 text-gray-600">查看您之前的 JD 分析记录和结果</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {mockHistory.map(item => (
          <div
            key={item.id}
            className="card hover:shadow-glow transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-10 w-10 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.jobTitle}
                  </h3>
                  <p className="text-gray-600">{item.company}</p>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {item.analyzedAt}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {item.matchScore}%
                  </div>
                  <div className="text-sm text-gray-500">匹配度</div>
                </div>

                <div className="flex space-x-2">
                  <button className="btn-secondary flex items-center">
                    <ChartBarIcon className="h-4 w-4 mr-1" />
                    查看详情
                  </button>
                  <button className="btn-primary">重新分析</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockHistory.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            暂无分析历史
          </h3>
          <p className="text-gray-600 mb-4">开始您的第一次 JD 分析吧</p>
          <button className="btn-primary">开始分析</button>
        </div>
      )}
    </div>
  );
};
