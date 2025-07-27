import React from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export const HomePage: React.FC = () => {
  const features = [
    {
      icon: SparklesIcon,
      title: 'AI 智能分析',
      description: '基于 GPT-4o 和 Transformers.js 双引擎，精准分析岗位需求',
    },
    {
      icon: RocketLaunchIcon,
      title: '高性能体验',
      description: 'Web Worker 多线程处理，IndexedDB 智能缓存，性能提升 60%+',
    },
    {
      icon: ShieldCheckIcon,
      title: '隐私保护',
      description: '本地 AI 处理选项，数据完全在您的设备上处理',
    },
    {
      icon: ChartBarIcon,
      title: '可视化分析',
      description: 'D3.js 驱动的交互式图表，直观展示技能匹配度',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          AI 驱动的
          <span className="text-gradient block">智能简历生成器</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
          基于岗位 JD 智能生成匹配简历，提升求职成功率。
          采用现代化技术栈，提供极致的用户体验。
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <Link to="/analysis" className="btn-primary text-lg px-8 py-3">
            开始分析
          </Link>
          <Link to="/history" className="btn-secondary text-lg px-8 py-3">
            查看历史
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="card text-center hover:shadow-glow transition-shadow duration-300"
          >
            <feature.icon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Start */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">快速开始</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-900">输入岗位 JD</h3>
              <p className="text-gray-600 text-sm">粘贴目标岗位的职位描述</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AI 智能分析</h3>
              <p className="text-gray-600 text-sm">系统自动提取关键技能要求</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-900">生成匹配简历</h3>
              <p className="text-gray-600 text-sm">获得针对性简历和改进建议</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
