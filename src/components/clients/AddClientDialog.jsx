import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import useCurrentUser from '@/lib/useCurrentUser';

export default function AddClientDialog({ open, onOpenChange, defaultStatus = 'lead', initialData = null }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const emptyForm = { name: '', phone: '', email: '', source: '', source_detail: '', budget_range: '', property_type: '', notes: '', birthday: '', anniversary: '' };
  const [form, setForm] = useState(emptyForm);

  React.useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        source: initialData.source || '',
        source_detail: initialData.source_detail || '',
        budget_range: initialData.budget_range || '',
        property_type: initialData.property_type || '',
        notes: initialData.notes || '',
        birthday: initialData.birthday || '',
        anniversary: initialData.anniversary || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialData, open]);

  const mutation = useMutation({
    mutationFn: (data) => initialData
      ? base44.entities.Client.update(initialData.id, data)
      : base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
      setForm(emptyForm);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (initialData) {
      mutation.mutate(form);
    } else {
      mutation.mutate({
        ...form,
        status: defaultStatus,
        owner: user?.email,
      });
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{initialData ? 'עריכת לקוח/ליד' : 'ליד חדש'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שם מלא *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} required />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} dir="ltr" required />
            </div>
          </div>
          <div>
            <Label>אימייל *</Label>
            <Input value={form.email} onChange={e => update('email', e.target.value)} type="email" dir="ltr" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>מקור</Label>
              <Select value={form.source} onValueChange={v => update('source', v)}>
                <SelectTrigger><SelectValue placeholder="בחר מקור" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="referral">המלצה</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="website">אתר</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג נכס</Label>
              <Select value={form.property_type} onValueChange={v => update('property_type', v)}>
                <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">דירה</SelectItem>
                  <SelectItem value="house">בית</SelectItem>
                  <SelectItem value="office">משרד</SelectItem>
                  <SelectItem value="commercial">מסחרי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>טווח תקציב</Label>
            <Select value={form.budget_range} onValueChange={v => update('budget_range', v)}>
              <SelectTrigger><SelectValue placeholder="בחר תקציב" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="up_to_100k">עד ₪100K</SelectItem>
                <SelectItem value="100_300k">₪100K-300K</SelectItem>
                <SelectItem value="300_500k">₪300K-500K</SelectItem>
                <SelectItem value="above_500k">מעל ₪500K</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>יום הולדת</Label>
              <Input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} />
            </div>
            <div>
              <Label>יום נישואין</Label>
              <Input type="date" value={form.anniversary} onChange={e => update('anniversary', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'שומר...' : initialData ? 'עדכן' : 'צור ליד'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}