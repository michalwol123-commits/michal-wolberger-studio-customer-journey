import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStageByNum } from '@/lib/stageConfig';

// Moving a project to any stage (next one, a jump forward, or back) through setProjectStage —
// the same function the WhatsApp agent uses. First shows what will happen, then asks to confirm.
const call = async (body) => {
  const res = await base44.functions.invoke('setProjectStage', body);
  const data = res?.data ?? res;
  if (!data?.ok) throw new Error(data?.error || 'הפעולה נכשלה');
  return data;
};

export default function StageChangeDialog({ project, targetStage, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const current = project.stage_current || 1;
  const forward = targetStage > current;
  const [leaveAs, setLeaveAs] = useState(forward ? 'completed' : 'pending');
  const [notify, setNotify] = useState(forward);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const params = useCallback(() => ({
    project_id: project.id, target_stage: targetStage, mode: 'jump', leave_current_as: leaveAs, notify_client: notify,
  }), [project.id, targetStage, leaveAs, notify]);

  useEffect(() => {
    if (!open) return;
    setLeaveAs(forward ? 'completed' : 'pending');
    setNotify(forward);
  }, [open, targetStage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    call({ ...params(), dry_run: true })
      .then(setPreview)
      .catch(err => { setPreview(null); toast.error(err.message); })
      .finally(() => setLoading(false));
  }, [open, params]);

  const confirm = async () => {
    setSaving(true);
    try {
      await call({ ...params(), dry_run: false });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(`הפרויקט עבר לשלב ${targetStage} — ${getStageByNum(targetStage)?.label}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const target = getStageByNum(targetStage);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">מעבר לשלב {targetStage} — {target?.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">שלב {current} ({getStageByNum(current)?.shortLabel}) יסומן:</p>
            <div className="flex flex-wrap gap-2">
              {(forward ? [['completed', 'הושלם'], ['skipped', 'דולג']] : [['pending', 'ממתין'], ['completed', 'הושלם'], ['skipped', 'דולג']]).map(([v, label]) => (
                <Button key={v} type="button" size="sm" variant={leaveAs === v ? 'default' : 'outline'} onClick={() => setLeaveAs(v)}>{label}</Button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={notify} onCheckedChange={v => setNotify(!!v)} />
            לשלוח ללקוח הודעת עדכון בוואטסאפ
          </label>

          <div className="rounded-lg border bg-muted/40 p-3 min-h-[80px]">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> בודקת מה יקרה…</div>
            ) : preview ? (
              <ul className="list-disc pr-5 space-y-1">
                {preview.consequences.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button type="button" onClick={confirm} disabled={!preview || loading || saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} אישור ומעבר
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
