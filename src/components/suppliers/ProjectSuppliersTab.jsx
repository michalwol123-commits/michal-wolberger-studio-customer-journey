import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Phone, Upload, FileText, ExternalLink, Loader2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { categoryLabel } from './SupplierCategoryBadge';
import AddSupplierDialog from './AddSupplierDialog';

export default function ProjectSuppliersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', quoted_amount: '', agreed_amount: '', notes: '' });
  const [uploadingId, setUploadingId] = useState(null);
  const [extractingId, setExtractingId] = useState(null);
  const fileRef = useRef(null);

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

  const handleInlineAmount = (ps, field, value) => {
    const num = value === '' ? null : Number(value);
    updateMutation.mutate({ id: ps.id, data: { [field]: num } });
  };

  const handleFileUpload = async (ps, file) => {
    setUploadingId(ps.id);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadingId(null);
    setExtractingId(ps.id);
    // Call backend to extract amount + update history
    base44.functions.invoke('extractSupplierQuote', {
      file_url,
      project_supplier_id: ps.id
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
    }).finally(() => {
      setExtractingId(null);
    });
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
      <div className="flex justify-end gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={() => setShowNewSupplier(true)} className="gap-1">
          <Plus className="w-4 h-4" />ספק חדש
        </Button>
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
              <div className="bg-card rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right px-4 py-2 font-medium">ספק</th>
                      <th className="text-right px-4 py-2 font-medium w-10">☎</th>
                      <th className="text-right px-4 py-2 font-medium">הצעה (₪)</th>
                      <th className="text-right px-4 py-2 font-medium">סגור (₪)</th>
                      <th className="text-right px-4 py-2 font-medium">סטטוס</th>
                      <th className="text-right px-4 py-2 font-medium">קובץ</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(ps => {
                      const supplier = supplierMap[ps.supplier_id];
                      return (
                        <tr key={ps.id} className="border-b last:border-0">
                          <td className="px-4 py-2 font-medium">{supplier?.name || '—'}</td>
                          <td className="px-2 py-2">
                            {supplier?.phone && (
                              <a href={`tel:${supplier.phone}`} className="text-primary hover:text-primary/80">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs"
                              defaultValue={ps.quoted_amount || ''}
                              onBlur={(e) => handleInlineAmount(ps, 'quoted_amount', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs"
                              defaultValue={ps.agreed_amount || ''}
                              onBlur={(e) => handleInlineAmount(ps, 'agreed_amount', e.target.value)}
                            />
                          </td>
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
                          <td className="px-4 py-2">
                            {(uploadingId === ps.id || extractingId === ps.id) ? (
                              <div className="flex items-center gap-1">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {extractingId === ps.id ? 'מחלץ מחיר...' : 'מעלה...'}
                                </span>
                              </div>
                            ) : ps.attachment_url ? (
                              <div className="flex items-center gap-1">
                                <a href={ps.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  className="text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.onchange = (e) => {
                                      if (e.target.files?.[0]) handleFileUpload(ps, e.target.files[0]);
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.onchange = (e) => {
                                    if (e.target.files?.[0]) handleFileUpload(ps, e.target.files[0]);
                                  };
                                  input.click();
                                }}
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* Add existing supplier to project */}
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

      {/* Add brand new supplier */}
      <AddSupplierDialog open={showNewSupplier} onOpenChange={setShowNewSupplier} />
    </div>
  );
}