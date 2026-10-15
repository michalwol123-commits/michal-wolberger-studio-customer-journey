import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import STAGES, { TOTAL_STAGES } from '@/lib/stageConfig';
import { getChecklistCompletion } from '@/lib/stageChecklist';
import StageChangeDialog from './StageChangeDialog';

// Next-stage button. It no longer blocks on the checklist: missing required items are shown as a note,
// and the dialog (setProjectStage dry run) explains exactly what will happen before Michal confirms.
export default function StageAdvanceButton({ project }) {
  const [open, setOpen] = useState(false);
  const currentStage = project.stage_current || 1;
  const nextStage = currentStage + 1;
  const nextStageConfig = STAGES.find(s => s.num === nextStage);

  if (currentStage >= TOTAL_STAGES) return null;

  let checklistData = {};
  try { checklistData = JSON.parse(project.stage_checklist_data || '{}'); } catch {}
  const { requiredMet } = getChecklistCompletion(currentStage, checklistData);
  const openItems = currentStage >= 4 && !requiredMet;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <ArrowLeft className="w-4 h-4" />
        קדמי לשלב {nextStage} — {nextStageConfig?.shortLabel}
      </Button>
      {openItems && <span className="text-xs text-amber-700">יש פריטי חובה פתוחים בצ'קליסט. אפשר להמשיך בכל זאת.</span>}
      <StageChangeDialog project={project} targetStage={nextStage} open={open} onOpenChange={setOpen} />
    </div>
  );
}
