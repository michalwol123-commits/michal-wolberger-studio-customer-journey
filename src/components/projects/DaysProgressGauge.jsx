import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const DaysProgressGauge = ({ label, planned, actual, icon }) => {
  const remaining = Math.max(0, planned - actual);
  const percentage = planned > 0 ? (actual / planned) * 100 : 0;
  
  // Color logic: green → orange → red
  let color = '#22c55e'; // green
  if (percentage > 75) color = '#f97316'; // orange
  if (percentage >= 100) color = '#ef4444'; // red

  return (
    <Card className="p-4 text-center">
      <div className="flex items-center justify-center mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      
      {/* Progress ring */}
      <svg viewBox="0 0 100 100" className="w-24 h-24 mx-auto transform -rotate-90 mb-2">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${percentage * 2.827} 282.7`}
          strokeLinecap="round"
        />
      </svg>

      {/* Counter */}
      <p className="text-sm font-bold">{actual} / {planned}</p>
      <p className="text-xs text-muted-foreground">
        {remaining > 0 ? `${remaining} ימים נותרים` : '✓ הושלם'}
      </p>
    </Card>
  );
};

export default function DaysProgressMetrics({ project, stageNum }) {
  const getMetrics = () => {
    if (stageNum === 9) {
      return {
        label: '🛒 ימי קניות',
        planned: project.shopping_days_planned,
        actual: project.shopping_days_actual,
        icon: '🛒',
      };
    }
    if (stageNum === 11) {
      return {
        label: '👁️ ימי פיקוח',
        planned: project.supervision_days_planned,
        actual: project.supervision_days_actual,
        icon: '👁️',
      };
    }
    if (stageNum === 12) {
      return {
        label: '🔨 ימי התקנות',
        planned: project.installation_days_planned,
        actual: project.installation_days_actual,
        icon: '🔨',
      };
    }
    return null;
  };

  const metrics = getMetrics();
  if (!metrics || !metrics.planned) return null;

  return (
    <div className="grid grid-cols-1 gap-4">
      <DaysProgressGauge {...metrics} />
    </div>
  );
}