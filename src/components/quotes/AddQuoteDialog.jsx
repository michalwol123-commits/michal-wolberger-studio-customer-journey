import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const packageOptions = [
  { value: 'basic', label: 'בסיסי' },
  { value: 'mid', label: 'בינוני' },
  { value: 'premium', label: 'פרימיום' },
];

const defaultForm = {
  client_id: '', title: '', package_type: 'mid', total_amount: '',
  scope: '', url: '', status: 'draft', notes: '', version: 1,
};

export default function AddQuoteDialog({ open, onOpenChange, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        client_id: initialData.client_id || '',
        title: initialData.title || '',
        package_type: initialData.package_type || 'mid',
        total_amount: initialData.total_amount || '',
        scope: initialData.scope || '',
        url: initialData.url || '',
        status: initialData.status || 'draft',
        notes: initialData.notes || '',
        version: initialData.version || 1,
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData, open]);

  const mutation = useMutation({
    mutationFn: (data) => initialData
      ? base44.entities.Quote.update(initialData.id, data)
      : base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0,
      version: Number(form.version) || 1,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{initialData ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>לקוח *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>כותרת ההצעה *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="עיצוב דירת 4 חדרים..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סכום כולל (₪) *</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} />
            </div>
            <div>
              <Label>חבילה</Label>
              <Select value={form.package_type} onValueChange={v => setForm(p => ({ ...p, package_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {packageOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>גרסה</Label>
              <Input type="number" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">טיוטה</SelectItem>
                  <SelectItem value="sent">נשלח</SelectItem>
                  <SelectItem value="viewed">נצפה</SelectItem>
                  <SelectItem value="approved">מאושר</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>לינק למסמך ההצעה</Label>
            <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." dir="ltr" />
          </div>

          <div>
            <Label>תיאור / היקף</Label>
            <Textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} rows={2} />
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={!form.client_id || !form.title || mutation.isPending}>
              {initialData ? 'עדכון' : 'צור הצעה'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}