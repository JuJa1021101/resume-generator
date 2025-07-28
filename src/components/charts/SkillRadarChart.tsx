import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { Skill } from '@/types';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface SkillRadarChartProps {
  skills: Skill[];
  userSkills?: Array<{ name: string; level: number }>;
  className?: string;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  skills,
  userSkills = [],
  className = ''
}) => {
  // 取前8个最重要的技能
  const topSkills = skills.slice(0, 8);

  if (topSkills.length === 0) {
    return (
      <div className={`h-64 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
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

  const data = {
    labels,
    datasets: [
      {
        label: '职位要求',
        data: requiredData,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
      },
      ...(userSkills.length > 0 ? [{
        label: '我的技能',
        data: userData,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
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
            return `${context.dataset.label}: ${context.parsed.r}/5`;
          }
        }
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 5,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return value.toString();
          }
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      },
    },
  };

  return (
    <div className={`h-64 ${className}`}>
      <Radar data={data} options={options} />
    </div>
  );
};