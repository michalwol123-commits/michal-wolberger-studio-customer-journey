import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2 } from 'lucide-react';
import STAGES, { TOTAL_STAGES } from '@/lib/stageConfig';
import { toast } from 'sonner';

export default function StageAdvanceButton({ project }) {
  const queryClient = useQueryClient();
  const currentStage = project.stage_current || 1;
  const nextStage = currentStage + 1;
  const currentStageConfig = STAGES.find(s => s.num === currentStage);
  const nextStageConfig = STAGES.find(s => s.num === nextStage);
  const currentKey = currentStageConfig?.key;
  const nextKey = nextStageConfig?.key;

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const progressPerStage = Math.round(100 / TOTAL_STAGES);
      const newProgress = Math.min(nextStage * progressPerStage, 100);

      const updateData = {
        stage_current: nextStage,
        progress: newProgress,
      };

      // Mark current stage as completed
      if (currentKey) updateData[currentKey] = 'completed';
      // Mark next stage as in_progress
      if (nextKey) updateData[nextKey] = 'in_progress';

      await base44.entities.Project.update(project.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`הפרויקט קודם לשלב ${nextStage} — ${nextStageConfig?.label}`);
    },
  });

  if (currentStage >= TOTAL_STAGES) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          קדמי לשלב {nextStage} — {nextStageConfig?.shortLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>קידום שלב פרויקט</AlertDialogTitle>
          <AlertDialogDescription>
            שלב {currentStage} ({currentStageConfig?.label}) יסומן כ"הושלם" והפרויקט יעבור לשלב {nextStage} ({nextStageConfig?.label}).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction onClick={() => advanceMutation.mutate()} disabled={advanceMutation.isPending}>
            {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            אשרי קידום
          </AlertDialogAction>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}