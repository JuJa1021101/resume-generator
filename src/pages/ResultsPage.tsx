import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { SkillBarChart } from '@/components/charts/SkillBarChart';
import { JDAnalysisResult } from '@/services/jd-analyzer';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<JDAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // 从localStorage加载分析结果
      const savedResult = localStorage.getItem(`jd_analysis_${id}`);
      if (savedResult) {
        try {
          const result = JSON.parse(savedResult);
          setAnalysisResult(result);
        } catch (error) {
          console.error('Failed to load analysis result:', error);
          navigate('/analysis');
        }
      } else {
        navigate('/analysis');
      }
    }
    setLoading(false);
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载分析结果中...</p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">未找到分析结果</h1>
        <p className="text-gray-600 mb-6">请重新进行JD分析</p>
        <button
          onClick={() => navigate('/analysis')}
          className="btn-primary"
        >
          返回分析页面
        </button>
      </div>
    );
  }

  const overallScore = Math.round(analysisResult.aiAnalysis.matchScore * 100);
  const techSkills = analysisResult.skills.filter(s => s.category !== 'soft');
  const softSkills = analysisResult.skills.filter(s => s.category === 'soft');
  const techScore = techSkills.length > 0
    ? Math.round(techSkills.reduce((sum, s) => sum + s.importance, 0) / techSkills.length * 100)
    : 0;
  const softScore = softSkills.length > 0
    ? Math.round(softSkills.reduce((sum, s) => sum + s.importance, 0) / softSkills.length * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">分析结果</h1>
        <p className="mt-2 text-gray-600">
          基于 AI 分析的技能匹配度和简历优化建议
        </p>
        {analysisResult.jobInfo.title && (
          <p className="mt-1 text-sm text-gray-500">
            职位：{analysisResult.jobInfo.title}
            {analysisResult.jobInfo.company && ` - ${analysisResult.jobInfo.company}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              技能匹配度
            </h2>
            {analysisResult.skills.length > 0 ? (
              <SkillRadarChart
                skills={analysisResult.skills}
                className="w-full"
              />
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">暂无技能数据</span>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              关键技能分析
            </h2>
            {analysisResult.skills.length > 0 ? (
              <SkillBarChart
                skills={analysisResult.skills}
                maxSkills={10}
                className="w-full"
              />
            ) : (
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">暂无技能数据</span>
              </div>
            )}
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
                <span className={`font-semibold ${overallScore >= 80 ? 'text-green-600' :
                  overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {overallScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>技术技能</span>
                <span className={`font-semibold ${techScore >= 80 ? 'text-green-600' :
                  techScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {techScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>软技能</span>
                <span className={`font-semibold ${softScore >= 80 ? 'text-green-600' :
                  softScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {softScore}%
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              改进建议
            </h3>
            {analysisResult.aiAnalysis.suggestions.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {analysisResult.aiAnalysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">暂无改进建议</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              分析统计
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.keywords.length}
                </div>
                <div className="text-sm text-gray-600">关键词</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {analysisResult.skills.length}
                </div>
                <div className="text-sm text-gray-600">技能</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="btn-primary w-full">导出 PDF 简历</button>
            <button
              onClick={() => navigate('/analysis')}
              className="btn-secondary w-full"
            >
              重新分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};