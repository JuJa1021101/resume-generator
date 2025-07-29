import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JDInput } from '@/components/JDInput';
import { APIKeyConfig } from '@/components/APIKeyConfig';
import { SkillRadarChart } from '@/components/charts/SkillRadarChart';
import { SkillBarChart } from '@/components/charts/SkillBarChart';
import { UserPreferences } from '@/types';
import { createJDAnalyzer, JDAnalysisResult } from '@/services/jd-analyzer';
import { useAppStore } from '@/stores/app-store';
import { useUIStore } from '@/stores/ui-store';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const { setGlobalLoading, addNotification } = useUIStore();

  const [preferences, setPreferences] = useState<UserPreferences>({
    aiEngine: 'gpt4o',
    theme: 'light',
    language: language,
    autoSave: true,
  });

  const [analysisOptions, setAnalysisOptions] = useState({
    extractKeywords: true,
    analyzeMatch: true,
    generateSuggestions: true,
  });

  const [analysisResult, setAnalysisResult] = useState<JDAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // 初始化时检查API密钥
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);



  const handleJDSubmit = useCallback(async (jdContent: string) => {
    // 检查GPT-4o是否需要API密钥
    if (preferences.aiEngine === 'gpt4o' && !apiKey) {
      setShowApiConfig(true);
      addNotification({
        type: 'warning',
        title: '需要配置API密钥',
        message: '使用GPT-4o需要配置OpenAI API密钥，或切换到本地AI引擎',
        autoClose: true,
        duration: 5000
      });
      return;
    }

    setIsAnalyzing(true);
    setGlobalLoading(true);

    try {
      // 设置环境变量（临时方案）
      if (apiKey) {
        (import.meta.env as any).VITE_OPENAI_API_KEY = apiKey;
      }

      // 创建JD分析器
      const analyzer = createJDAnalyzer(preferences);

      // 执行分析
      const result = await analyzer.analyzeJD(jdContent);

      // 保存结果
      setAnalysisResult(result);

      // 保存到历史记录
      const savedAnalyses = JSON.parse(localStorage.getItem('jd_analyses') || '[]');
      savedAnalyses.unshift({
        id: result.id,
        title: result.jobInfo.title || '未知职位',
        company: result.jobInfo.company || '未知公司',
        analyzedAt: result.analyzedAt,
        keywordCount: result.keywords.length,
        skillCount: result.skills.length,
        matchScore: result.aiAnalysis.matchScore
      });

      // 只保留最近20条记录
      if (savedAnalyses.length > 20) {
        savedAnalyses.splice(20);
      }

      localStorage.setItem('jd_analyses', JSON.stringify(savedAnalyses));
      localStorage.setItem(`jd_analysis_${result.id}`, JSON.stringify(result));

      // 显示成功通知
      addNotification({
        type: 'success',
        title: '分析完成',
        message: `成功分析职位描述，提取了 ${result.keywords.length} 个关键词和 ${result.skills.length} 项技能要求`,
        autoClose: true,
        duration: 5000
      });

      // 可选：导航到结果页面
      // navigate(`/results/${result.id}`);

    } catch (error) {
      console.error('JD分析失败:', error);

      const errorMessage = error instanceof Error ? error.message : '未知错误，请稍后重试';

      // 如果是API密钥相关错误，显示配置界面
      if (errorMessage.includes('API密钥') || errorMessage.includes('API key')) {
        setShowApiConfig(true);
      }

      addNotification({
        type: 'error',
        title: '分析失败',
        message: errorMessage,
        autoClose: true,
        duration: 8000
      });
    } finally {
      setIsAnalyzing(false);
      setGlobalLoading(false);
    }
  }, [preferences, apiKey, navigate, setGlobalLoading, addNotification]);

  const handleEngineChange = useCallback((engine: 'gpt4o' | 'transformers') => {
    setPreferences(prev => ({ ...prev, aiEngine: engine }));
  }, []);

  const handleOptionChange = useCallback((option: keyof typeof analysisOptions, value: boolean) => {
    setAnalysisOptions(prev => ({ ...prev, [option]: value }));
  }, []);

  const handleApiKeyConfigured = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
    setShowApiConfig(false);
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">JD 分析</h1>
        <p className="mt-2 text-gray-600">
          输入岗位描述，让 AI 为您分析技能要求
        </p>
      </div>

      {/* JD Input Component */}
      <JDInput
        onJDSubmit={handleJDSubmit}
        maxLength={10000}
        showPreview={true}
        autoFocus={true}
        disabled={isAnalyzing}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            AI 引擎选择
          </h3>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="ai-engine"
                className="mr-3"
                checked={preferences.aiEngine === 'gpt4o'}
                onChange={() => handleEngineChange('gpt4o')}
                disabled={isAnalyzing}
              />
              <div className="flex-1">
                <div className="font-medium flex items-center space-x-2">
                  <span>GPT-4o (推荐)</span>
                  {preferences.aiEngine === 'gpt4o' && !apiKey && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      需要API密钥
                    </span>
                  )}
                  {preferences.aiEngine === 'gpt4o' && apiKey && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      已配置
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  云端处理，精准度更高
                </div>
              </div>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="ai-engine"
                className="mr-3"
                checked={preferences.aiEngine === 'transformers'}
                onChange={() => handleEngineChange('transformers')}
                disabled={isAnalyzing}
              />
              <div>
                <div className="font-medium flex items-center space-x-2">
                  <span>Transformers.js</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    免费
                  </span>
                </div>
                <div className="text-sm text-gray-600">本地处理，保护隐私</div>
              </div>
            </label>
          </div>

          {/* API密钥配置按钮 */}
          {preferences.aiEngine === 'gpt4o' && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowApiConfig(true)}
                className="btn-secondary text-sm w-full"
              >
                {apiKey ? '重新配置API密钥' : '配置API密钥'}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">分析选项</h3>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-3"
                checked={analysisOptions.extractKeywords}
                onChange={(e) => handleOptionChange('extractKeywords', e.target.checked)}
                disabled={isAnalyzing}
              />
              <span>技能关键词提取</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-3"
                checked={analysisOptions.analyzeMatch}
                onChange={(e) => handleOptionChange('analyzeMatch', e.target.checked)}
                disabled={isAnalyzing}
              />
              <span>匹配度分析</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-3"
                checked={analysisOptions.generateSuggestions}
                onChange={(e) => handleOptionChange('generateSuggestions', e.target.checked)}
                disabled={isAnalyzing}
              />
              <span>改进建议生成</span>
            </label>
          </div>
        </div>
      </div>

      {/* 分析结果显示 */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">分析结果</h2>

            {/* 职位基本信息 */}
            {(analysisResult.jobInfo.title || analysisResult.jobInfo.company) && (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">职位信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.jobInfo.title && (
                    <div>
                      <span className="font-medium text-gray-700">职位：</span>
                      <span className="text-gray-900">{analysisResult.jobInfo.title}</span>
                    </div>
                  )}
                  {analysisResult.jobInfo.company && (
                    <div>
                      <span className="font-medium text-gray-700">公司：</span>
                      <span className="text-gray-900">{analysisResult.jobInfo.company}</span>
                    </div>
                  )}
                  {analysisResult.jobInfo.location && (
                    <div>
                      <span className="font-medium text-gray-700">地点：</span>
                      <span className="text-gray-900">{analysisResult.jobInfo.location}</span>
                    </div>
                  )}
                  {analysisResult.jobInfo.salary && (
                    <div>
                      <span className="font-medium text-gray-700">薪资：</span>
                      <span className="text-gray-900">{analysisResult.jobInfo.salary}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 关键词分析 */}
            {analysisResult.keywords.length > 0 && (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  关键词分析 ({analysisResult.keywords.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.keywords.slice(0, 20).map((keyword, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${keyword.category === 'technical'
                        ? 'bg-blue-100 text-blue-800'
                        : keyword.category === 'soft'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                        }`}
                    >
                      {keyword.text}
                      <span className="ml-1 text-xs opacity-75">
                        ({Math.round(keyword.importance * 100)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 技能分析图表 */}
            {analysisResult.skills.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    技能匹配度雷达图
                  </h3>
                  <SkillRadarChart
                    skills={analysisResult.skills.map(skill => ({
                      ...skill,
                      matched: false,
                      requiredLevel: skill.level || 3
                    }))}
                    className="w-full"
                  />
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    关键技能分析
                  </h3>
                  <SkillBarChart
                    skills={analysisResult.skills.map(skill => ({
                      ...skill,
                      matched: false,
                      requiredLevel: skill.level || 3
                    }))}
                    maxSkills={8}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* 技能要求详情 */}
            {analysisResult.skills.length > 0 && (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  技能要求详情 ({analysisResult.skills.length})
                </h3>
                <div className="space-y-3">
                  {analysisResult.skills.slice(0, 10).map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                          {skill.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          重要性: {Math.round(skill.importance * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          等级 {skill.level || 3}/5
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${((skill.level || 3) / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI建议 */}
            {analysisResult.aiAnalysis.suggestions.length > 0 && (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI 建议</h3>
                <ul className="space-y-2">
                  {analysisResult.aiAnalysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 性能指标 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">分析性能</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(analysisResult.performanceMetrics.aiProcessingTime)}ms
                  </div>
                  <div className="text-sm text-gray-600">处理时间</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(analysisResult.aiAnalysis.confidence * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">置信度</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResult.keywords.length}
                  </div>
                  <div className="text-sm text-gray-600">关键词数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResult.skills.length}
                  </div>
                  <div className="text-sm text-gray-600">技能数</div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center space-x-4 pt-6">
              <button
                onClick={() => navigate(`/results/${analysisResult.id}`)}
                className="btn-primary px-6 py-3"
              >
                查看详细结果
              </button>
              <button
                onClick={() => setAnalysisResult(null)}
                className="btn-secondary px-6 py-3"
              >
                重新分析
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API密钥配置模态框 */}
      {showApiConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowApiConfig(false)} />

            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">配置OpenAI API密钥</h2>
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <APIKeyConfig
                onKeyConfigured={handleApiKeyConfigured}
                currentKey={apiKey}
                isRequired={preferences.aiEngine === 'gpt4o'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
