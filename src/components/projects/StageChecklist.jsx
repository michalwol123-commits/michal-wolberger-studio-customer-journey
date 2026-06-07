import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Upload, ArrowLeft, Calendar, Play, ExternalLink, CheckCircle2, Circle, Lock, Trash2, HardDrive, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { getStageChecklist, getChecklistCompletion } from '@/lib/stageChecklist';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';
import ImportDrivePhotosDialog from '@/components/projects/ImportDrivePhotosDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

export default function StageChecklist({ project, stageNum, onNavigateTab }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const config = getStageChecklist(stageNum);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [meetingConfig, setMeetingConfig] = useState(null);
  const [showSourcePicker, setShowSourcePicker] = useState(null); // holds {docType, stage} when picker is open
  const [showDriveImport, setShowDriveImport] = useState(false);

  const checklistData = useMemo(() => {
    try { return JSON.parse(project.stage_checklist_data || '{}'); } catch { return {}; }
  }, [project.stage_checklist_data]);

  const stageData = checklistData[stageNum] || {};

  const isDeleted = (itemId) => !!stageData[`_del_${itemId}`];

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires', project.client_id],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: project.client_id }),
    enabled: stageNum === 5,
  });
  const detailedSubmitted = questionnaires.some(q => q.type === 'detailed' && q.status === 'submitted');

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', project.id],
    queryFn: () => base44.entities.Payment.filter({ project_id: project.id }),
    enabled: stageNum === 13,
  });
  const allPaymentsPaid = payments.length > 0 && payments.every(p => p.status === 'paid');

  const { data: projectMeetings = [] } = useQuery({
    queryKey: ['meetings-stage-review', project.id],
    queryFn: () => base44.entities.Meeting.filter({ project_id: project.id }),
    enabled: stageNum === 4,
  });
  const hasStageReviewMeeting = projectMeetings.some(m => m.type === 'stage_review');

  // Contract documents for auto-check (stage 4)
  const { data: contractDocs = [] } = useQuery({
    queryKey: ['contract-docs', project.client_id],
    queryFn: () => base44.entities.Document.filter({ client_id: project.client_id, type: 'contract' }),
    enabled: stageNum === 4,
  });
  const hasContractSent = contractDocs.some(d => d.signature_status === 'pending_signature' || d.signature_status === 'signed');
  const hasContractSigned = contractDocs.some(d => d.signature_status === 'signed');

  const getAutoState = (item) => {
    if (item.action?.type === 'auto_check_questionnaire') return detailedSubmitted;
    if (item.action?.type === 'auto_check_payments') return allPaymentsPaid;
    if (item.action?.type === 'auto_check_stage_review') return hasStageReviewMeeting;
    if (item.action?.type === 'auto_check_floor_plan') return !!project.floor_plan_locked;
    if (item.action?.type === 'auto_check_contract_sent') return hasContractSent;
    if (item.action?.type === 'auto_check_contract_signed') return hasContractSigned;
    return false;
  };

  const isChecked = (item) => {
    if (item.type === 'auto') return getAutoState(item);
    return !!stageData[item.id];
  };

  React.useEffect(() => {
    if (!config) return;
    const autoItems = visibleItems.filter(i => i.type === 'auto');
    if (autoItems.length === 0) return;
    let needsUpdate = false;
    const newData = { ...stageData };
    for (const item of autoItems) {
      const autoVal = getAutoState(item);
      if (!!newData[item.id] !== autoVal) {
        newData[item.id] = autoVal;
        needsUpdate = true;
      }
    }
    if (needsUpdate) saveMutation.mutate(newData);
  }, [detailedSubmitted, allPaymentsPaid, hasStageReviewMeeting, project.floor_plan_locked, hasContractSent, hasContractSigned]);

  const visibleItems = useMemo(() => {
    if (!config) return [];
    const quota = project.shopping_days_planned || 5;
    const supQuota = project.supervision_days_planned || 0;
    const instQuota = project.installation_days_planned || 0;
    return config.items.filter(item => {
      if (item.shoppingDay && item.shoppingDay > quota) return false;
      if (item.supervisionDay && item.supervisionDay > supQuota) return false;
      if (item.installationDay && item.installationDay > instQuota) return false;
      if (isDeleted(item.id)) return false;
      return true;
    });
  }, [config, project.shopping_days_planned, project.supervision_days_planned, project.installation_days_planned, stageData]);

  const completion = useMemo(() => {
    if (!config) return { total: 0, completed: 0, percent: 0, requiredMet: true };
    const total = visibleItems.length;
    const completed = visibleItems.filter(item => isChecked(item)).length;
    const requiredMet = visibleItems.filter(i => i.required).every(i => isChecked(i));
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, requiredMet };
  }, [visibleItems, stageData, detailedSubmitted, allPaymentsPaid, project.floor_plan_locked]);

  const saveMutation = useMutation({
    mutationFn: (newStageData) => {
      const updated = { ...checklistData, [stageNum]: newStageData };
      return base44.entities.Project.update(project.id, { stage_checklist_data: JSON.stringify(updated) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  // Auto-complete stage status when all visible items are checked
  React.useEffect(() => {
    if (!config || !visibleItems.length) return;
    const allChecked = visibleItems.every(item => isChecked(item));
    const stageKey = `s${stageNum}_status`;
    const currentStatus = project[stageKey];
    if (allChecked && currentStatus !== 'completed') {
      base44.entities.Project.update(project.id, { [stageKey]: 'completed' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        toast.success(`שלב ${stageNum} הושלם!`);
      });
    }
  }, [completion.percent]);

  const shoppingMutation = useMutation({
    mutationFn: (usedCount) => base44.entities.Project.update(project.id, { shopping_days_actual: usedCount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const supervisionMutation = useMutation({
    mutationFn: (usedCount) => base44.entities.Project.update(project.id, { supervision_days_actual: usedCount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const installationMutation = useMutation({
    mutationFn: (usedCount) => base44.entities.Project.update(project.id, { installation_days_actual: usedCount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const handleToggle = async (item, checked) => {
    const newData = { ...stageData, [item.id]: checked };
    saveMutation.mutate(newData);
    if (item.shoppingDay) {
      const shoppingItems = visibleItems.filter(i => i.shoppingDay);
      const usedCount = shoppingItems.filter(i => {
        if (i.id === item.id) return checked;
        return !!stageData[i.id];
      }).length;
      shoppingMutation.mutate(usedCount);
    }
    if (item.supervisionDay) {
      const supItems = visibleItems.filter(i => i.supervisionDay);
      const usedCount = supItems.filter(i => {
        if (i.id === item.id) return checked;
        return !!stageData[i.id];
      }).length;
      supervisionMutation.mutate(usedCount);
    }
    if (item.installationDay) {
      const instItems = visibleItems.filter(i => i.installationDay);
      const usedCount = instItems.filter(i => {
        if (i.id === item.id) return checked;
        return !!stageData[i.id];
      }).length;
      installationMutation.mutate(usedCount);
    }
    if (stageNum === 8 && item.id === 's8_3' && checked) {
      base44.entities.Project.update(project.id, { concept_approved_at: new Date().toISOString() });
    }
    
    if (item.milestone_key) updateMilestoneFromChecklist(item, checked);
  };

  const handleDeleteItem = (item) => {
    const newData = { ...stageData, [`_del_${item.id}`]: true };
    saveMutation.mutate(newData);
    toast.success(`הפריט "${item.label}" הוסר מהצ'קליסט`);
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
      case 'upload_doc_or_drive':
        setShowSourcePicker({ docType: action.docType, stage: action.stage });
        break;
      case 'navigate_tab':
        onNavigateTab?.(action.tab);
        break;
      case 'add_meeting':
        setMeetingConfig({ type: action.meetingType });
        break;
      case 'run_function':
        toast.info('מפעיל...');
        await base44.functions.invoke(action.functionName, { client_id: project.client_id, project_id: project.id });
        toast.success('בוצע בהצלחה');
        break;
      case 'navigate_quotes':
        navigate('/quotes');
        break;
    }
  };

  if (!config) return null;

  const actionIcon = (item) => {
    const a = item.action;
    if (!a) return null;
    if (a.type === 'upload_doc' || a.type === 'upload_doc_or_drive') return <Upload className="w-3.5 h-3.5" />;
    if (a.type === 'navigate_tab') return <ExternalLink className="w-3.5 h-3.5" />;
    if (a.type === 'add_meeting') return <Calendar className="w-3.5 h-3.5" />;
    if (a.type === 'run_function') return <Play className="w-3.5 h-3.5" />;
    if (a.type === 'navigate_quotes') return <ExternalLink className="w-3.5 h-3.5" />;
    return null;
  };

  const actionLabel = (item) => {
    const a = item.action;
    if (!a) return null;
    if (a.type === 'upload_doc' || a.type === 'upload_doc_or_drive') return 'העלאה';
    if (a.type === 'navigate_tab') return 'מעבר';
    if (a.type === 'add_meeting') return 'תיאום';
    if (a.type === 'run_function') return 'הפעלה';
    if (a.type === 'navigate_quotes') return 'מעבר';
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
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors group/row ${
                  checked ? 'bg-green-50/50 border-green-200' : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
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
                <span className={`flex-1 text-sm ${checked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                  {item.required && !checked && <span className="text-destructive text-xs mr-1">*</span>}
                  {isAuto && <span className="text-xs text-muted-foreground mr-1">(אוטומטי)</span>}
                </span>
                {isButton && item.action && !checked && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction(item)}>
                    {actionIcon(item)}
                    {actionLabel(item)}
                  </Button>
                )}
                {!item.required && (
                  <button
                    onClick={() => handleDeleteItem(item)}
                    title="הסר פריט מהצ'קליסט"
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {!completion.requiredMet && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
              <Lock className="w-4 h-4" />
              יש להשלים את כל פריטי החובה (*) לפני קידום לשלב הבא
            </div>
          )}
        </CardContent>
      </Card>

      {uploadConfig && (
        <UploadDocumentDialog
          open={!!uploadConfig}
          onOpenChange={(open) => { if (!open) setUploadConfig(null); }}
          projectId={project.id}
          clientId={project.client_id}
          defaultStage={uploadConfig.stage}
        />
      )}

      {meetingConfig && (
        <AddMeetingDialog
          open={!!meetingConfig}
          onOpenChange={(open) => { if (!open) setMeetingConfig(null); }}
          initialData={{ client_id: project.client_id, project_id: project.id, type: meetingConfig.type }}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            toast.success('הפגישה נוצרה — קישור תיאום נשלח ללקוח אוטומטית');
            onNavigateTab?.('meetings');
          }}
        />
      )}

      {/* Source picker: computer vs Drive */}
      <Dialog open={!!showSourcePicker} onOpenChange={(open) => { if (!open) setShowSourcePicker(null); }}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading text-center">בחרי מקור העלאה</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                const cfg = showSourcePicker;
                setShowSourcePicker(null);
                setUploadConfig({ docType: cfg.docType, stage: cfg.stage });
              }}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Monitor className="w-8 h-8 text-primary" />
              <span className="text-sm font-medium">מהמחשב</span>
            </button>
            <button
              onClick={() => {
                setShowSourcePicker(null);
                setShowDriveImport(true);
              }}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <HardDrive className="w-8 h-8 text-primary" />
              <span className="text-sm font-medium">מ-Google Drive</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showDriveImport && (
        <ImportDrivePhotosDialog
          open={showDriveImport}
          onOpenChange={setShowDriveImport}
          projectId={project.id}
          stage={13}
        />
      )}
    </>
  );
}