import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import useCurrentUser from '@/lib/useCurrentUser';

export default function AddTaskDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    title: '', description: '', type: 'manual', priority: 'normal', due_date: '', assigned_to: '', client_id: '', project_id: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
      setForm({ title: '', description: '', type: 'manual', priority: 'normal', due_date: '', assigned_to: '', client_id: '', project_id: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      status: 'open',
      owner: user?.email,
      assigned_to: form.assigned_to || user?.email,
    });
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle className="font-heading">משימה חדשה</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>כותרת *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} required />
          </div>
          <div>
            <Label>תיאור</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סוג</Label>
              <Select value={form.type} onValueChange={v => update('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="payment_reminder">תזכורת תשלום</SelectItem>
                  <SelectItem value="approval">אישור</SelectItem>
                  <SelectItem value="site_visit">ביקור אתר</SelectItem>
                  <SelectItem value="supplier_contact">ספק</SelectItem>
                  <SelectItem value="manual">ידני</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>עדיפות</Label>
              <Select value={form.priority} onValueChange={v => update('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוך</SelectItem>
                  <SelectItem value="normal">רגיל</SelectItem>
                  <SelectItem value="high">גבוה</SelectItem>
                  <SelectItem value="urgent">דחוף</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>תאריך יעד *</Label>
            <Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>לקוח</Label>
              <Select value={form.client_id} onValueChange={v => update('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>פרויקט</Label>
              <Select value={form.project_id} onValueChange={v => update('project_id', v)}>
                <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'שומר...' : 'צור משימה'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}