import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל' },
  { value: 'on_hold', label: 'מוקפא' },
];

export default function AddProjectDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    client_id: '',
    status: 'active',
    stage_current: 1,
    total_budget: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date_est: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('הפרויקט נוצר בהצלחה');
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      client_id: '',
      status: 'active',
      stage_current: 1,
      total_budget: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date_est: '',
    });
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      stage_current: Number(form.stage_current),
      progress: 0,
    };
    if (form.total_budget) payload.total_budget = Number(form.total_budget);
    else delete payload.total_budget;
    if (!form.end_date_est) delete payload.end_date_est;
    if (!form.client_id) delete payload.client_id;

    createMutation.mutate(payload);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">פרויקט חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>שם הפרויקט *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div>
            <Label>לקוח</Label>
            <Select value={form.client_id} onValueChange={v => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="בחרי לקוח" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שלב נוכחי</Label>
              <Select value={String(form.stage_current)} onValueChange={v => set('stage_current', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>תקציב כולל (₪)</Label>
            <Input type="number" value={form.total_budget} onChange={e => set('total_budget', e.target.value)} placeholder="אופציונלי" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>תאריך התחלה</Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <Label>תאריך סיום משוער</Label>
              <Input type="date" value={form.end_date_est} onChange={e => set('end_date_est', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? 'יוצר...' : 'צור פרויקט'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}