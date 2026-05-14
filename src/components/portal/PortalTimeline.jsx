import React from 'react';
import { Check, Circle, Loader2, ChevronLeft } from 'lucide-react';
import STAGES from '@/lib/stageConfig';

export default function PortalTimeline({ project, selectedStage, onSelectStage }) {
  return (
    <div className="space-y-1">
      {STAGES.map((stage, i) => {
        const status = project[stage.key] || 'pending';
        const isCurrent = project.stage_current === stage.num;
        const isSelected = selectedStage === stage.num;
        // All stages are clickable for planning view navigation
        const isClickable = true;

        return (
          <button
            key={stage.key}
            onClick={() => onSelectStage(stage.num)}
            disabled={false}
            className={`w-full flex items-start gap-3 text-right rounded-lg px-2 py-1.5 transition-all ${
              isSelected ? 'bg-primary/10 ring-1 ring-primary/30' :
              'hover:bg-muted/50 cursor-pointer'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                status === 'completed' ? 'bg-green-100 text-green-600' :
                status === 'in_progress' || isCurrent ? 'bg-primary/15 text-primary ring-2 ring-primary/30' :
                'bg-muted text-muted-foreground'
              }`}>
                {status === 'completed' ? <Check className="w-4 h-4" /> :
                 status === 'in_progress' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 <Circle className="w-3.5 h-3.5" />}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-0.5 h-6 ${status === 'completed' ? 'bg-green-300' : 'bg-border'}`} />
              )}
            </div>
            <div className="pt-1 flex-1 flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isSelected ? 'text-primary font-semibold' :
                  isCurrent ? 'text-primary' : 
                  status === 'completed' ? 'text-foreground' : 
                  'text-muted-foreground'
                }`}>
                  {stage.icon} שלב {stage.num} — {stage.shortLabel}
                </p>
              </div>
              {isClickable && (
                <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}