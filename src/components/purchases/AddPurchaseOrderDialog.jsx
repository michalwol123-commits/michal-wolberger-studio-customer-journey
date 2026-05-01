import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusOptions = [
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלח' },
  { value: 'confirmed', label: 'אושר' },
  { value: 'delivered', label: 'סופק' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function AddPurchaseOrderDialog({ open, onOpenChange, initialData, projectId }) {
  const isEdit = !!initialData;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    project_id: projectId || '',
    supplier_id: '',
    category: '',
    description: '',
    amount: '',
    status: 'draft',
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        project_id: initialData.project_id || projectId || '',
        supplier_id: initialData.supplier_id || '',
        category: initialData.category || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        status: initialData.status || 'draft',
        order_date: initialData.order_date || '',
        delivery_date: initialData.delivery_date || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ is_active: true }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => base44.entities.Project.filter({ status: 'active' }),
    enabled: !projectId,
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.PurchaseOrder.update(initialData.id, data)
      : base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      ...form,
      amount: Number(form.amount) || 0,
    });
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת הזמנת רכש' : 'הזמנת רכש חדשה'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!projectId && (
            <div>
              <Label>פרויקט</Label>
              <Select value={form.project_id} onValueChange={v => set('project_id', v)}>
                <SelectTrigger><SelectValue placeholder="בחרי פרויקט" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>ספק</Label>
            <Select value={form.supplier_id} onValueChange={v => {
              set('supplier_id', v);
              const sup = suppliers.find(s => s.id === v);
              if (sup) set('category', sup.category);
            }}>
              <SelectTrigger><SelectValue placeholder="בחרי ספק" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.category})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>קטגוריה</Label>
              <Input value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
            <div>
              <Label>סכום (₪)</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>תיאור</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="h-20" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך הזמנה</Label>
              <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
            </div>
            <div>
              <Label>אספקה צפויה</Label>
              <Input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {isEdit ? 'עדכון' : 'יצירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}