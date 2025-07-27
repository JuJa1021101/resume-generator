import React, { useState, useCallback } from 'react';
import { JDInput } from '@/components/JDInput';
import { UserPreferences } from '@/types';

export const AnalysisPage: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    aiEngine: 'gpt4o',
    theme: 'light',
    language: 'zh-CN',
    autoSave: true,
  });

  const [analysisOptions, setAnalysisOptions] = useState({
    extractKeywords: true,
    analyzeMatch: true,
    generateSuggestions: true,
  });

  const handleJDSubmit = useCallback(async (jdContent: string) => {
    console.log('JD Content submitted:', jdContent);
    console.log('AI Engine:', preferences.aiEngine);
    console.log('Analysis Options:', analysisOptions);

    // TODO: Implement actual AI analysis logic
    // This will be implemented in later tasks

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For now, just log the submission
    alert('JD分析功能将在后续任务中实现');
  }, [preferences.aiEngine, analysisOptions]);

  const handleEngineChange = useCallback((engine: 'gpt4o' | 'transformers') => {
    setPreferences(prev => ({ ...prev, aiEngine: engine }));
  }, []);

  const handleOptionChange = useCallback((option: keyof typeof analysisOptions, value: boolean) => {
    setAnalysisOptions(prev => ({ ...prev, [option]: value }));
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
              />
              <div>
                <div className="font-medium">GPT-4o (推荐)</div>
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
              />
              <div>
                <div className="font-medium">Transformers.js</div>
                <div className="text-sm text-gray-600">本地处理，保护隐私</div>
              </div>
            </label>
          </div>
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
              />
              <span>技能关键词提取</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-3"
                checked={analysisOptions.analyzeMatch}
                onChange={(e) => handleOptionChange('analyzeMatch', e.target.checked)}
              />
              <span>匹配度分析</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-3"
                checked={analysisOptions.generateSuggestions}
                onChange={(e) => handleOptionChange('generateSuggestions', e.target.checked)}
              />
              <span>改进建议生成</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
