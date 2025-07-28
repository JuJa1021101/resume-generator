import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Skill } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SkillBarChartProps {
  skills: Skill[];
  userSkills?: Array<{ name: string; level: number }>;
  className?: string;
  maxSkills?: number;
}

export const SkillBarChart: React.FC<SkillBarChartProps> = ({
  skills,
  userSkills = [],
  className = '',
  maxSkills = 10
}) => {
  // 取前N个最重要的技能
  const topSkills = skills.slice(0, maxSkills);

  if (topSkills.length === 0) {
    return (
      <div className={`h-48 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-500">暂无技能数据</span>
      </div>
    );
  }

  const labels = topSkills.map(skill => skill.name);

  // 职位要求数据
  const requiredData = topSkills.map(skill => skill.requiredLevel);

  // 用户技能数据
  const userData = topSkills.map(skill => {
    const userSkill = userSkills.find(us =>
      us.name.toLowerCase() === skill.name.toLowerCase()
    );
    return userSkill ? userSkill.level : 0;
  });

  // 重要性数据（转换为1-5的范围）
  const importanceData = topSkills.map(skill => Math.round(skill.importance * 5));

  const data = {
    labels,
    datasets: [
      {
        label: '职位要求',
        data: requiredData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: '重要程度',
        data: importanceData,
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
      },
      ...(userSkills.length > 0 ? [{
        label: '我的技能',
        data: userData,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      }] : [])
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y}/5`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return value.toString();
          }
        },
        title: {
          display: true,
          text: '技能等级'
        }
      },
      x: {
        title: {
          display: true,
          text: '技能名称'
        }
      }
    },
  };

  return (
    <div className={`h-48 ${className}`}>
      <Bar data={data} options={options} />
    </div>
  );
};