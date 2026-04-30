import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import SupplierCategoryBadge, { categoryLabel } from './SupplierCategoryBadge';

export default function ProjectSuppliersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', quoted_amount: '', agreed_amount: '', notes: '' });

  const { data: projectSuppliers = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplier.filter({ project_id: projectId }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectSupplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      setShowAdd(false);
      setForm({ supplier_id: '', quoted_amount: '', agreed_amount: '', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectSupplier.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectSupplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const supplier = supplierMap[form.supplier_id];
    createMutation.mutate({
      project_id: projectId,
      supplier_id: form.supplier_id,
      category: supplier?.category || '',
      quoted_amount: form.quoted_amount ? Number(form.quoted_amount) : undefined,
      agreed_amount: form.agreed_amount ? Number(form.agreed_amount) : undefined,
      notes: form.notes,
      status: 'pending',
    });
  };

  const handleStatusChange = (ps, newStatus) => {
    updateMutation.mutate({ id: ps.id, data: { status: newStatus } });
  };

  // Group by category
  const grouped = {};
  projectSuppliers.forEach(ps => {
    const cat = ps.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ps);
  });

  const usedSupplierIds = new Set(projectSuppliers.map(ps => ps.supplier_id));
  const availableSuppliers = suppliers.filter(s => !usedSupplierIds.has(s.id) && s.is_active !== false);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
          <Plus className="w-4 h-4" />הוסף ספק לפרויקט
        </Button>
      </div>

      {projectSuppliers.length === 0 ? (
        <EmptyState title="אין ספקים" description="הוסיפי ספקים לפרויקט" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="font-heading font-semibold text-sm mb-2">{categoryLabel(cat)}</h4>
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right px-4 py-2 font-medium">ספק</th>
                      <th className="text-right px-4 py-2 font-medium">הצעה</th>
                      <th className="text-right px-4 py-2 font-medium">סגור</th>
                      <th className="text-right px-4 py-2 font-medium">סטטוס</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(ps => {
                      const supplier = supplierMap[ps.supplier_id];
                      return (
                        <tr key={ps.id} className="border-b last:border-0">
                          <td className="px-4 py-2 font-medium">{supplier?.name || '—'}</td>
                          <td className="px-4 py-2">{ps.quoted_amount ? `₪${ps.quoted_amount.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-2">{ps.agreed_amount ? `₪${ps.agreed_amount.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-2">
                            <Select value={ps.status} onValueChange={v => handleStatusChange(ps, v)}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">ממתין</SelectItem>
                                <SelectItem value="quoted">הצעה</SelectItem>
                                <SelectItem value="approved">מאושר</SelectItem>
                                <SelectItem value="rejected">נדחה</SelectItem>
                                <SelectItem value="completed">הושלם</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(ps.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">הוסף ספק לפרויקט</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label>ספק *</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm(prev => ({ ...prev, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר ספק" /></SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {categoryLabel(s.category)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סכום הצעה (₪)</Label>
                <Input type="number" value={form.quoted_amount} onChange={e => setForm(prev => ({ ...prev, quoted_amount: e.target.value }))} />
              </div>
              <div>
                <Label>סכום סגור (₪)</Label>
                <Input type="number" value={form.agreed_amount} onChange={e => setForm(prev => ({ ...prev, agreed_amount: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>ביטול</Button>
              <Button type="submit" disabled={!form.supplier_id}>הוסף</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}