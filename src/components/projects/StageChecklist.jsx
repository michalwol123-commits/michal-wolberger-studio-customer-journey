import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Upload, ArrowLeft, Calendar, Play, ExternalLink, CheckCircle2, Circle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getStageChecklist, getChecklistCompletion } from '@/lib/stageChecklist';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';

export default function StageChecklist({ project, stageNum, onNavigateTab }) {
  const queryClient = useQueryClient();
  const config = getStageChecklist(stageNum);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [meetingConfig, setMeetingConfig] = useState(null);

  // Parse stored checklist data
  const checklistData = useMemo(() => {
    try { return JSON.parse(project.stage_checklist_data || '{}'); } catch { return {}; }
  }, [project.stage_checklist_data]);

  const stageData = checklistData[stageNum] || {};

  // Auto-checks: questionnaire submitted
  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires', project.client_id],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: project.client_id }),
    enabled: stageNum === 5,
  });
  const detailedSubmitted = questionnaires.some(q => q.type === 'detailed' && q.status === 'submitted');

  // Auto-checks: all payments paid
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', project.id],
    queryFn: () => base44.entities.Payment.filter({ project_id: project.id }),
    enabled: stageNum === 13,
  });
  const allPaymentsPaid = payments.length > 0 && payments.every(p => p.status === 'paid');

  // Compute auto-check state
  const getAutoState = (item) => {
    if (item.action?.type === 'auto_check_questionnaire') return detailedSubmitted;
    if (item.action?.type === 'auto_check_payments') return allPaymentsPaid;
    return false;
  };

  const isChecked = (item) => {
    if (item.type === 'auto') return getAutoState(item);
    return !!stageData[item.id];
  };

  // Filter shopping day items based on quota
  const visibleItems = useMemo(() => {
    if (!config) return [];
    const quota = project.shopping_days_quota || 5;
    return config.items.filter(item => {
      if (item.shoppingDay) return item.shoppingDay <= quota;
      return true;
    });
  }, [config, project.shopping_days_quota]);

  const completion = useMemo(() => {
    if (!config) return { total: 0, completed: 0, percent: 0, requiredMet: true };
    const total = visibleItems.length;
    const completed = visibleItems.filter(item => isChecked(item)).length;
    const requiredMet = visibleItems.filter(i => i.required).every(i => isChecked(i));
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, requiredMet };
  }, [visibleItems, stageData, detailedSubmitted, allPaymentsPaid]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (newStageData) => {
      const updated = { ...checklistData, [stageNum]: newStageData };
      return base44.entities.Project.update(project.id, {
        stage_checklist_data: JSON.stringify(updated),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  // Shopping day mutation — updates shopping_days_used
  const shoppingMutation = useMutation({
    mutationFn: (usedCount) => base44.entities.Project.update(project.id, { shopping_days_used: usedCount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const handleToggle = async (item, checked) => {
    const newData = { ...stageData, [item.id]: checked };
    saveMutation.mutate(newData);

    // Handle shopping days
    if (item.shoppingDay) {
      const quota = project.shopping_days_quota || 5;
      const shoppingItems = visibleItems.filter(i => i.shoppingDay);
      const usedCount = shoppingItems.filter(i => {
        if (i.id === item.id) return checked;
        return !!stageData[i.id];
      }).length;
      shoppingMutation.mutate(usedCount);
    }

    // Handle concept approval timestamp
    if (stageNum === 8 && item.id === 's8_3' && checked) {
      base44.entities.Project.update(project.id, { concept_approved_at: new Date().toISOString() });
    }

    // Handle client signoff
    if (stageNum === 13 && item.id === 's13_5' && checked) {
      base44.entities.Project.update(project.id, { client_signoff: true });
    }

    // Auto-update matching milestone in Gantt
    if (item.milestone_key) {
      updateMilestoneFromChecklist(item, checked);
    }
  };

  const updateMilestoneFromChecklist = async (item, checked) => {
    const milestones = await base44.entities.ProjectMilestone.filter({ project_id: project.id });
    const match = milestones.find(m => m.stage === stageNum);
    if (match) {
      const newStatus = checked ? 'completed' : 'in_progress';
      if (match.status !== newStatus) {
        await base44.entities.ProjectMilestone.update(match.id, { status: newStatus });
        queryClient.invalidateQueries({ queryKey: ['milestones', project.id] });
        toast.success(checked ? 'אבן דרך עודכנה ל"הושלם" בגאנט' : 'אבן דרך עודכנה ל"בביצוע" בגאנט');
      }
    }
  };

  const handleAction = async (item) => {
    const action = item.action;
    if (!action) return;

    switch (action.type) {
      case 'upload_doc':
        setUploadConfig({ docType: action.docType, stage: action.stage });
        break;
      case 'navigate_tab':
        onNavigateTab?.(action.tab);
        break;
      case 'add_meeting':
        setMeetingConfig({ type: action.meetingType });
        break;
      case 'run_function':
        toast.info('מפעיל...');
        await base44.functions.invoke(action.functionName, {
          client_id: project.client_id,
          project_id: project.id,
        });
        toast.success('בוצע בהצלחה');
        break;
    }
  };

  if (!config) return null;

  const actionIcon = (item) => {
    const a = item.action;
    if (!a) return null;
    if (a.type === 'upload_doc') return <Upload className="w-3.5 h-3.5" />;
    if (a.type === 'navigate_tab') return <ExternalLink className="w-3.5 h-3.5" />;
    if (a.type === 'add_meeting') return <Calendar className="w-3.5 h-3.5" />;
    if (a.type === 'run_function') return <Play className="w-3.5 h-3.5" />;
    return null;
  };

  const actionLabel = (item) => {
    const a = item.action;
    if (!a) return null;
    if (a.type === 'upload_doc') return 'העלאה';
    if (a.type === 'navigate_tab') return 'מעבר';
    if (a.type === 'add_meeting') return 'תיאום';
    if (a.type === 'run_function') return 'הפעלה';
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              צ'קליסט — {config.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{completion.completed}/{completion.total}</span>
          </div>
          <Progress value={completion.percent} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-1">
          {visibleItems.map(item => {
            const checked = isChecked(item);
            const isAuto = item.type === 'auto';
            const isButton = item.type === 'button';

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  checked ? 'bg-green-50/50 border-green-200' : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
                {/* Checkbox / Auto indicator */}
                {isAuto ? (
                  <div className="flex items-center justify-center w-5 h-5">
                    {checked
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                ) : (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(val) => handleToggle(item, val)}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                )}

                {/* Label */}
                <span className={`flex-1 text-sm ${checked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                  {item.required && !checked && (
                    <span className="text-destructive text-xs mr-1">*</span>
                  )}
                  {isAuto && <span className="text-xs text-muted-foreground mr-1">(אוטומטי)</span>}
                </span>

                {/* Action button */}
                {isButton && item.action && !checked && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAction(item)}
                  >
                    {actionIcon(item)}
                    {actionLabel(item)}
                  </Button>
                )}
              </div>
            );
          })}

          {/* Required warning */}
          {!completion.requiredMet && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
              <Lock className="w-4 h-4" />
              יש להשלים את כל פריטי החובה (*) לפני קידום לשלב הבא
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      {uploadConfig && (
        <UploadDocumentDialog
          open={!!uploadConfig}
          onOpenChange={(open) => { if (!open) setUploadConfig(null); }}
          projectId={project.id}
          clientId={project.client_id}
          defaultStage={uploadConfig.stage}
        />
      )}

      {/* Meeting dialog */}
      {meetingConfig && (
        <AddMeetingDialog
          open={!!meetingConfig}
          onOpenChange={(open) => { if (!open) setMeetingConfig(null); }}
          initialData={{
            client_id: project.client_id,
            project_id: project.id,
            type: meetingConfig.type,
          }}
        />
      )}
    </>
  );
}