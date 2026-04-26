import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import STAGES from '@/lib/stageConfig';

export default function StageSelector({ project, selectedStage, onSelect }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
      {STAGES.map(stage => {
        const status = project[stage.key] || 'pending';
        const isCurrent = project.stage_current === stage.num;
        const isSelected = selectedStage === stage.num;

        return (
          <button
            key={stage.num}
            onClick={() => onSelect(stage.num)}
            className={`relative text-center p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
              isSelected
                ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md'
                : isCurrent
                ? 'border-primary/50 bg-primary/5'
                : status === 'completed'
                ? 'border-green-200 bg-green-50 hover:border-green-300'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm font-bold ${
              status === 'completed'
                ? 'bg-green-500 text-white'
                : status === 'in_progress'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {status === 'completed' ? <Check className="w-4 h-4" /> : stage.num}
            </div>
            <p className="text-[10px] sm:text-xs font-medium leading-tight">{stage.shortLabel}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {status === 'completed' ? 'הושלם' : status === 'in_progress' ? 'בביצוע' : 'ממתין'}
            </p>
          </button>
        );
      })}
    </div>
  );
}