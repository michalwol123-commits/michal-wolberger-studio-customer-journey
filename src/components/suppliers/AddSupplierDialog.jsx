import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const categories = [
  { value: 'carpenter', label: 'נגר' },
  { value: 'electrician', label: 'חשמלאי' },
  { value: 'plumber', label: 'אינסטלטור' },
  { value: 'painter', label: 'צבעי' },
  { value: 'ac', label: 'מזגנים' },
  { value: 'kitchen', label: 'מטבח' },
  { value: 'flooring', label: 'ריצוף' },
  { value: 'stainless', label: 'נירוסטה' },
  { value: 'glass', label: 'זגגות' },
  { value: 'textile', label: 'טקסטיל' },
  { value: 'lighting', label: 'תאורה' },
  { value: 'contractor', label: 'קבלן' },
  { value: 'other', label: 'אחר' },
];

export default function AddSupplierDialog({ open, onOpenChange, initialData }) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [form, setForm] = useState(initialData || {
    name: '', category: 'other', phone: '', email: '', rating: '', price_level: 'mid', commission_rate: '', notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.Supplier.update(initialData.id, data)
      : base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.rating) payload.rating = Number(payload.rating);
    if (payload.commission_rate) payload.commission_rate = Number(payload.commission_rate);
    mutation.mutate(payload);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'עריכת ספק' : 'הוספת ספק'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>שם הספק *</Label>
            <Input value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>קטגוריה *</Label>
              <Select value={form.category} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>רמת מחיר</Label>
              <Select value={form.price_level} onValueChange={v => update('price_level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוך</SelectItem>
                  <SelectItem value="mid">בינוני</SelectItem>
                  <SelectItem value="high">גבוה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>טלפון</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <Label>דירוג (1-5)</Label>
              <Input type="number" min="1" max="5" value={form.rating} onChange={e => update('rating', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>מייל</Label>
              <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <Label>אחוז עמלה (%)</Label>
              <Input type="number" min="0" max="100" placeholder="5" value={form.commission_rate} onChange={e => update('commission_rate', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="h-20" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit">{isEdit ? 'עדכן' : 'הוסף ספק'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}