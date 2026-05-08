import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2 } from 'lucide-react';

const typeOptions = [
  { value: 'intro', label: 'היכרות' },
  { value: 'qualifying', label: 'אפיון' },
  { value: 'quote_presentation', label: 'הצגת הצעת מחיר' },
  { value: 'stage_review', label: 'סקירת שלב' },
  { value: 'site_visit', label: 'ביקור אתר' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'design_approval', label: 'אישור עיצוב' },
];

const defaultForm = {
  client_id: '', project_id: '', quote_id: '', type: 'intro',
  scheduled_at: '', duration: 45, location: '',
  status: 'scheduled', summary: ''
};

export default function AddMeetingDialog({ open, onOpenChange, initialData, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        client_id: initialData.client_id || '',
        project_id: initialData.project_id || '',
        quote_id: initialData.quote_id || '',
        type: initialData.type || 'intro',
        scheduled_at: initialData.scheduled_at ? initialData.scheduled_at.slice(0, 16) : '',
        duration: initialData.duration || 45,
        location: initialData.location || '',
        status: initialData.status || 'scheduled',
        summary: initialData.summary || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData, open]);

  const mutation = useMutation({
    mutationFn: (data) => initialData
      ? base44.entities.Meeting.update(initialData.id, data)
      : base44.entities.Meeting.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onOpenChange(false);
      if (onCreated && !initialData) onCreated(result);
    },
  });

  const [conflictWarning, setConflictWarning] = useState(null);
  const [checking, setChecking] = useState(false);

  const doCreate = () => {
    const payload = {
      ...form,
      duration: Number(form.duration),
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
    };
    if (!payload.project_id) delete payload.project_id;
    if (!payload.quote_id) delete payload.quote_id;
    setConflictWarning(null);
    mutation.mutate(payload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Skip conflict check on edit
    if (initialData) {
      doCreate();
      return;
    }

    setChecking(true);
    setConflictWarning(null);
    const res = await base44.functions.invoke('checkCalendarConflict', {
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration: Number(form.duration),
    });

    setChecking(false);
    if (res.data?.hasConflict) {
      setConflictWarning(res.data.conflictingEvents);
    } else {
      doCreate();
    }
  };

  const clientProjects = projects.filter(p => p.client_id === form.client_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{initialData ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>לקוח *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v, project_id: '' }))}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {clientProjects.length > 0 && (
            <div>
              <Label>פרויקט (אופציונלי)</Label>
              <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא</SelectItem>
                  {clientProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סוג פגישה *</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>משך (דקות)</Label>
              <Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>תאריך ושעה *</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
          </div>

          <div>
            <Label>מיקום</Label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="כתובת או לינק Zoom" />
          </div>

          <div>
            <Label>סיכום / הערות</Label>
            <Textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={2} />
          </div>

          {conflictWarning && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                <AlertTriangle className="w-4 h-4" />
                יש פגישות חופפות ביומן!
              </div>
              <ul className="text-xs text-amber-800 space-y-1 pr-4">
                {conflictWarning.map((ev, i) => (
                  <li key={i}>
                    {ev.summary} — {ev.start ? new Date(ev.start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                    {ev.end ? ` עד ${new Date(ev.end).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="destructive" onClick={doCreate} disabled={mutation.isPending}>
                  צור בכל זאת
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConflictWarning(null)}>
                  חזור לעריכה
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={!form.client_id || !form.scheduled_at || mutation.isPending || checking}>
              {checking && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'עדכון' : 'צור פגישה'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}