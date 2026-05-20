import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'pending', label: 'ממתין' },
  { value: 'partial', label: 'חלקי' },
  { value: 'paid', label: 'שולם' },
  { value: 'overdue', label: 'באיחור' },
];

export default function EditPaymentDialog({ open, onOpenChange, payment }) {
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();
  const isNew = !payment?.id;

  useEffect(() => {
    if (payment) {
      setForm({
        status: payment.status || 'pending',
        amount: payment.amount || 0,
        amount_paid: payment.amount_paid || 0,
        paid_date: payment.paid_date || '',
        due_date: payment.due_date || '',
        milestone: payment.milestone || '',
        notes: payment.notes || '',
        client_id: payment.client_id || '',
        project_id: payment.project_id || '',
      });
    }
  }, [payment]);

  const mutation = useMutation({
    mutationFn: (data) => isNew
      ? base44.entities.Payment.create(data)
      : base44.entities.Payment.update(payment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(isNew ? 'התשלום נוצר' : 'התשלום עודכן');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount),
      amount_paid: Number(form.amount_paid),
    };
    if (isNew) {
      payload.client_id = payment.client_id;
      payload.project_id = payment.project_id;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'תשלום חדש' : 'עריכת תשלום'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>אבן דרך</Label>
            <Input value={form.milestone || ''} onChange={e => setForm({ ...form, milestone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סכום (₪)</Label>
              <Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>סכום ששולם (₪)</Label>
              <Input type="number" value={form.amount_paid || ''} onChange={e => setForm({ ...form, amount_paid: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>תאריך יעד</Label>
              <Input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>תאריך תשלום</Label>
              <Input type="date" value={form.paid_date || ''} onChange={e => setForm({ ...form, paid_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={val => setForm({ ...form, status: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'שומר...' : isNew ? 'צור תשלום' : 'שמור'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}