import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import STAGES from '@/lib/stageConfig';

const BUDGET_CATEGORIES = [
  'מטבח', 'ריצוף', 'חשמל', 'אינסטלציה', 'נגרות', 'צבע', 'מזגנים',
  'תאורה', 'טקסטיל', 'זכוכית', 'נירוסטה', 'קבלן ביצוע', 'עיצוב', 'אחר',
];

export default function AddBudgetItemDialog({ open, onOpenChange, projectId, initialData }) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [form, setForm] = useState(initialData || {
    category: '', planned_amount: '', actual_amount: '', supplier_id: '', stage: '', notes: '',
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.BudgetItem.update(initialData.id, data)
      : base44.entities.BudgetItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      project_id: projectId,
      planned_amount: Number(form.planned_amount),
      actual_amount: form.actual_amount ? Number(form.actual_amount) : 0,
      stage: form.stage ? Number(form.stage) : undefined,
      supplier_id: form.supplier_id || undefined,
    });
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'עריכת פריט תקציב' : 'הוספת פריט תקציב'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>קטגוריה *</Label>
            <Select value={form.category} onValueChange={v => update('category', v)}>
              <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
              <SelectContent>
                {BUDGET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סכום מתוכנן (₪) *</Label>
              <Input type="number" value={form.planned_amount} onChange={e => update('planned_amount', e.target.value)} required />
            </div>
            <div>
              <Label>סכום בפועל (₪)</Label>
              <Input type="number" value={form.actual_amount} onChange={e => update('actual_amount', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ספק</Label>
              <Select value={form.supplier_id} onValueChange={v => update('supplier_id', v)}>
                <SelectTrigger><SelectValue placeholder="בחר ספק" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.is_active !== false).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שלב</Label>
              <Select value={form.stage ? String(form.stage) : ''} onValueChange={v => update('stage', v)}>
                <SelectTrigger><SelectValue placeholder="בחר שלב" /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s.num} value={String(s.num)}>{s.num} — {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="h-16" />
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