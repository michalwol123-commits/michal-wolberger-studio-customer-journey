import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const typeOptions = [
  { value: 'intro', label: 'היכרות' },
  { value: 'qualifying', label: 'אפיון' },
  { value: 'stage_review', label: 'סקירת שלב' },
  { value: 'site_visit', label: 'ביקור אתר' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'design_approval', label: 'אישור עיצוב' },
];

const statusOptions = [
  { value: 'scheduled', label: 'מתוכנן' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
  { value: 'no_show', label: 'לא הגיע' },
  { value: 'rescheduled', label: 'נדחה' },
];

const defaultForm = {
  client_id: '',
  type: 'intro',
  scheduled_at: '',
  duration: 45,
  location: '',
  status: 'scheduled',
  summary: '',
};

export default function AddMeetingDialog({ open, onOpenChange, editMeeting }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  useEffect(() => {
    if (editMeeting) {
      setForm({
        client_id: editMeeting.client_id || '',
        type: editMeeting.type || 'intro',
        scheduled_at: editMeeting.scheduled_at ? editMeeting.scheduled_at.slice(0, 16) : '',
        duration: editMeeting.duration || 45,
        location: editMeeting.location || '',
        status: editMeeting.status || 'scheduled',
        summary: editMeeting.summary || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [editMeeting, open]);

  const mutation = useMutation({
    mutationFn: (data) => editMeeting
      ? base44.entities.Meeting.update(editMeeting.id, data)
      : base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editMeeting ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>לקוח</Label>
            <Select value={form.client_id} onValueChange={v => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>סוג פגישה</Label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>תאריך ושעה</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>משך (דקות)</Label>
              <Input type="number" value={form.duration} onChange={e => set('duration', Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>מיקום</Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="כתובת / לינק Zoom" />
          </div>
          <div>
            <Label>סיכום</Label>
            <Textarea value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="הערות..." rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'שומר...' : editMeeting ? 'עדכן' : 'צור פגישה'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}