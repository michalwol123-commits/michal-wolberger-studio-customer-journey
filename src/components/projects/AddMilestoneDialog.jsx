import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import STAGES from '@/lib/stageConfig';

const EMPTY_FORM = { title: '', stage: '', start_date: '', end_date: '', status: 'pending', assigned_to: '', notes: '' };

export default function AddMilestoneDialog({ open, onOpenChange, projectId, initialData }) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(initialData ? {
        title: initialData.title || '',
        stage: initialData.stage || '',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        status: initialData.status || 'pending',
        assigned_to: initialData.assigned_to || '',
        notes: initialData.notes || '',
      } : EMPTY_FORM);
    }
  }, [open, initialData]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.ProjectMilestone.update(initialData.id, data)
      : base44.entities.ProjectMilestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      project_id: projectId,
      stage: form.stage ? Number(form.stage) : undefined,
    });
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'עריכת אבן דרך' : 'הוספת אבן דרך'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>שם *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} required />
          </div>
          <div>
            <Label>שלב קשור</Label>
            <Select value={form.stage ? String(form.stage) : ''} onValueChange={v => update('stage', v)}>
              <SelectTrigger><SelectValue placeholder="בחר שלב" /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => (
                  <SelectItem key={s.num} value={String(s.num)}>{s.num} — {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>תאריך התחלה *</Label>
              <Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
            </div>
            <div>
              <Label>תאריך סיום *</Label>
              <Input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="in_progress">בביצוע</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                  <SelectItem value="delayed">מעוכב</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>אחראי</Label>
              <Input value={form.assigned_to} onChange={e => update('assigned_to', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit">{isEdit ? 'עדכן' : 'הוסף'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}