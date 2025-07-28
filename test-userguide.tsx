// Test UserGuide component types
import React from 'react';
import { UserGuide, GuideStep } from './src/components/help/UserGuide';

// Test GuideStep interface
const testSteps: GuideStep[] = [
  {
    id: 'step1',
    title: '欢迎使用',
    content: '这是第一步引导',
    target: '.welcome-button',
    position: 'bottom',
    action: {
      text: '开始',
      onClick: () => console.log('Step 1 action')
    }
  },
  {
    id: 'step2',
    title: '功能介绍',
    content: '这是第二步引导',
    target: '.feature-panel',
    position: 'top'
  }
];

// Test UserGuide component
const TestUserGuide = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>开始引导</button>
      <UserGuide
        steps={testSteps}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={() => console.log('Guide completed')}
        className="custom-guide"
      />
    </div>
  );
};

console.log('UserGuide types test passed');
export default TestUserGuide;