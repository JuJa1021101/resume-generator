import React from 'react';

export const ResultsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">分析结果</h1>
        <p className="mt-2 text-gray-600">
          基于 AI 分析的技能匹配度和简历优化建议
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              技能匹配度
            </h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">雷达图占位符</span>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              关键技能分析
            </h2>
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">柱状图占位符</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              匹配度概览
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>整体匹配度</span>
                <span className="font-semibold text-green-600">85%</span>
              </div>
              <div className="flex justify-between">
                <span>技术技能</span>
                <span className="font-semibold text-blue-600">90%</span>
              </div>
              <div className="flex justify-between">
                <span>软技能</span>
                <span className="font-semibold text-yellow-600">75%</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              改进建议
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>加强 React 18 新特性的学习</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>补充 TypeScript 高级用法</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>突出项目管理经验</span>
              </li>
            </ul>
          </div>

          <button className="btn-primary w-full">导出 PDF 简历</button>
        </div>
      </div>
    </div>
  );
};
