import { useState, useCallback, useEffect } from 'react';
import { GuideStep } from '../components/help/UserGuide';

export interface UseUserGuideOptions {
  storageKey?: string;
  autoStart?: boolean;
  skipIfCompleted?: boolean;
}

export interface UseUserGuideReturn {
  isGuideOpen: boolean;
  currentGuide: string | null;
  startGuide: (guideId: string, steps: GuideStep[]) => void;
  closeGuide: () => void;
  isGuideCompleted: (guideId: string) => boolean;
  markGuideCompleted: (guideId: string) => void;
  resetGuide: (guideId: string) => void;
  resetAllGuides: () => void;
  currentSteps: GuideStep[];
}

const DEFAULT_STORAGE_KEY = 'user-guide-progress';

export function useUserGuide(options: UseUserGuideOptions = {}): UseUserGuideReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    skipIfCompleted = true,
  } = options;

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentGuide, setCurrentGuide] = useState<string | null>(null);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [completedGuides, setCompletedGuides] = useState<Set<string>>(new Set());

  // Load completed guides from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const completed = JSON.parse(stored);
        setCompletedGuides(new Set(completed));
      }
    } catch (error) {
      console.error('Failed to load guide progress:', error);
    }
  }, [storageKey]);

  // Save completed guides to localStorage
  const saveProgress = useCallback((completed: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(completed)));
    } catch (error) {
      console.error('Failed to save guide progress:', error);
    }
  }, [storageKey]);

  const startGuide = useCallback((guideId: string, steps: GuideStep[]) => {
    if (skipIfCompleted && completedGuides.has(guideId)) {
      return;
    }

    setCurrentGuide(guideId);
    setCurrentSteps(steps);
    setIsGuideOpen(true);
  }, [completedGuides, skipIfCompleted]);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
    setCurrentGuide(null);
    setCurrentSteps([]);
  }, []);

  const isGuideCompleted = useCallback((guideId: string): boolean => {
    return completedGuides.has(guideId);
  }, [completedGuides]);

  const markGuideCompleted = useCallback((guideId: string) => {
    const newCompleted = new Set(completedGuides);
    newCompleted.add(guideId);
    setCompletedGuides(newCompleted);
    saveProgress(newCompleted);
  }, [completedGuides, saveProgress]);

  const resetGuide = useCallback((guideId: string) => {
    const newCompleted = new Set(completedGuides);
    newCompleted.delete(guideId);
    setCompletedGuides(newCompleted);
    saveProgress(newCompleted);
  }, [completedGuides, saveProgress]);

  const resetAllGuides = useCallback(() => {
    setCompletedGuides(new Set());
    saveProgress(new Set());
  }, [saveProgress]);

  return {
    isGuideOpen,
    currentGuide,
    startGuide,
    closeGuide,
    isGuideCompleted,
    markGuideCompleted,
    resetGuide,
    resetAllGuides,
    currentSteps,
  };
}

// Predefined guide steps for common workflows
export const GUIDE_STEPS = {
  FIRST_TIME_USER: [
    {
      id: 'welcome',
      title: '欢迎使用AI简历生成器',
      content: '让我们快速了解如何使用这个工具来生成匹配度高的专业简历。',
    },
    {
      id: 'jd-input',
      title: '输入岗位描述',
      content: '首先，将目标岗位的JD（职位描述）粘贴到输入框中。系统会自动分析岗位要求。',
      target: '[data-guide="jd-input"]',
    },
    {
      id: 'ai-analysis',
      title: 'AI分析',
      content: '系统会使用AI技术分析JD内容，提取关键技能要求和匹配度。',
      target: '[data-guide="ai-analysis"]',
    },
    {
      id: 'skill-matching',
      title: '技能匹配',
      content: '查看您的技能与岗位要求的匹配度，了解优势和需要改进的地方。',
      target: '[data-guide="skill-matching"]',
    },
    {
      id: 'generate-resume',
      title: '生成简历',
      content: '基于分析结果，系统会生成针对性的简历内容，您可以导出为PDF格式。',
      target: '[data-guide="generate-resume"]',
    },
  ] as GuideStep[],

  JD_ANALYSIS: [
    {
      id: 'paste-jd',
      title: '粘贴岗位描述',
      content: '将完整的岗位描述粘贴到文本框中。包含职责、要求、技能等信息会提高分析准确性。',
      target: '[data-guide="jd-textarea"]',
    },
    {
      id: 'choose-ai-engine',
      title: '选择AI引擎',
      content: 'GPT-4o提供更精准的分析，Transformers.js在本地处理保护隐私。',
      target: '[data-guide="ai-engine-selector"]',
    },
    {
      id: 'start-analysis',
      title: '开始分析',
      content: '点击分析按钮，系统会提取关键词、技能要求和匹配度评分。',
      target: '[data-guide="analyze-button"]',
      action: {
        text: '开始分析',
        onClick: () => {
          // This would trigger the actual analysis
          console.log('Starting JD analysis...');
        },
      },
    },
  ] as GuideStep[],

  SKILL_MATCHING: [
    {
      id: 'view-radar-chart',
      title: '技能雷达图',
      content: '雷达图直观显示您在各个技能类别的匹配度，外圈表示岗位要求，内圈表示您的水平。',
      target: '[data-guide="radar-chart"]',
    },
    {
      id: 'skill-gaps',
      title: '技能差距分析',
      content: '查看具体的技能差距，了解哪些技能需要提升以及优先级。',
      target: '[data-guide="skill-gaps"]',
    },
    {
      id: 'recommendations',
      title: '改进建议',
      content: '系统会提供具体的技能提升建议和学习资源推荐。',
      target: '[data-guide="recommendations"]',
    },
  ] as GuideStep[],
};