import React from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';

const stages = [
  { key: 's1_status', num: 1, label: 'שאלון' },
  { key: 's2_status', num: 2, label: 'תכנית + גאנט' },
  { key: 's3_status', num: 3, label: 'תכניות עבודה' },
  { key: 's4_status', num: 4, label: 'קונספט עיצובי' },
  { key: 's5_status', num: 5, label: 'ימי קניות' },
  { key: 's6_status', num: 6, label: 'תמחור + ספקים' },
  { key: 's7_status', num: 7, label: 'ביצוע' },
  { key: 's8_status', num: 8, label: 'התקנה' },
  { key: 's9_status', num: 9, label: 'מסירה' },
];

export default function PortalTimeline({ project }) {
  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const status = project[stage.key] || 'pending';
        const isCurrent = project.stage_current === stage.num;

        return (
          <div key={stage.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                status === 'completed' ? 'bg-green-100 text-green-600' :
                status === 'in_progress' || isCurrent ? 'bg-primary/15 text-primary ring-2 ring-primary/30' :
                'bg-muted text-muted-foreground'
              }`}>
                {status === 'completed' ? <Check className="w-4 h-4" /> :
                 status === 'in_progress' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 <Circle className="w-3.5 h-3.5" />}
              </div>
              {i < stages.length - 1 && (
                <div className={`w-0.5 h-8 ${status === 'completed' ? 'bg-green-300' : 'bg-border'}`} />
              )}
            </div>
            <div className="pt-1">
              <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                שלב {stage.num} — {stage.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}