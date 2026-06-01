import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AddCommissionDialog({ open, onOpenChange, projectId }) {
  const queryClient = useQueryClient();

  const { data: projectSuppliers = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplier.filter({ project_id: projectId }),
    enabled: open,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
    enabled: open,
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));

  const [form, setForm] = useState({
    supplier_id: '',
    purchase_amount: '',
    commission_rate: '',
    status: 'pending',
  });

  const commissionAmount = form.purchase_amount && form.commission_rate
    ? Math.round(Number(form.purchase_amount) * Number(form.commission_rate)) / 100
    : 0;

  // Auto-fill rate from supplier
  useEffect(() => {
    if (form.supplier_id) {
      const supplier = supplierMap[form.supplier_id];
      if (supplier?.commission_rate) {
        setForm(f => ({ ...f, commission_rate: String(supplier.commission_rate) }));
      }
    }
  }, [form.supplier_id, supplierMap]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Commission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', projectId] });
      toast.success('עמלה נוצרה');
      onOpenChange(false);
      setForm({ supplier_id: '', purchase_amount: '', commission_rate: '', status: 'pending' });
    },
  });

  const handleSubmit = () => {
    if (!form.supplier_id || !form.purchase_amount || !form.commission_rate) {
      toast.error('יש למלא את כל השדות');
      return;
    }

    // Find the project_supplier_id if exists
    const ps = projectSuppliers.find(p => p.supplier_id === form.supplier_id);

    createMutation.mutate({
      supplier_id: form.supplier_id,
      project_id: projectId,
      project_supplier_id: ps?.id || undefined,
      purchase_amount: Number(form.purchase_amount),
      commission_rate: Number(form.commission_rate),
      commission_amount: commissionAmount,
      status: form.status,
    });
  };

  // Build supplier options from project suppliers
  const supplierOptions = projectSuppliers.map(ps => ({
    id: ps.supplier_id,
    name: supplierMap[ps.supplier_id]?.name || '—',
    amount: ps.agreed_amount || ps.quoted_amount,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">הוסף עמלה ידנית</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>ספק</Label>
            <Select value={form.supplier_id} onValueChange={v => {
              const opt = supplierOptions.find(o => o.id === v);
              setForm(f => ({
                ...f,
                supplier_id: v,
                purchase_amount: opt?.amount ? String(opt.amount) : f.purchase_amount,
              }));
            }}>
              <SelectTrigger><SelectValue placeholder="בחר ספק" /></SelectTrigger>
              <SelectContent>
                {supplierOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>סכום קנייה (₪)</Label>
            <Input
              type="number"
              value={form.purchase_amount}
              onChange={e => setForm(f => ({ ...f, purchase_amount: e.target.value }))}
            />
          </div>

          <div>
            <Label>אחוז עמלה (%)</Label>
            <Input
              type="number"
              value={form.commission_rate}
              onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <span className="text-sm text-muted-foreground">עמלה מחושבת: </span>
            <span className="font-semibold text-lg">₪{commissionAmount.toLocaleString()}</span>
          </div>

          <div>
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="invoiced">נשלחה דרישה</SelectItem>
                <SelectItem value="received">התקבלה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'שומר...' : 'צור עמלה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}