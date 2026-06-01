import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, ExternalLink, Loader2, UserPlus } from 'lucide-react';
import { categoryLabel } from './SupplierCategoryBadge';
import AddSupplierDialog from './AddSupplierDialog';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'ממתין' },
  { value: 'quoted', label: 'הצעה' },
  { value: 'approved', label: 'מאושר' },
  { value: 'rejected', label: 'נדחה' },
  { value: 'completed', label: 'הושלם' },
];

const BUDGET_CATEGORIES = [
  { value: '', label: 'כללי (ללא קטגוריה)' },
  { value: 'מטבח', label: 'מטבח' },
  { value: 'נגרות', label: 'נגרות' },
  { value: 'חשמל', label: 'חשמל' },
  { value: 'אינסטלציה', label: 'אינסטלציה' },
  { value: 'ריצוף', label: 'ריצוף' },
  { value: 'צבע', label: 'צבע' },
  { value: 'מזגנים', label: 'מזגנים' },
  { value: 'תאורה', label: 'תאורה' },
  { value: 'טקסטיל', label: 'טקסטיל' },
  { value: 'זגגות', label: 'זגגות' },
  { value: 'נירוסטה', label: 'נירוסטה' },
  { value: 'קבלן', label: 'קבלן' },
  { value: 'אחר', label: 'אחר' },
];

export default function ProjectSupplierDialog({ open, onOpenChange, projectId, editData }) {
  const queryClient = useQueryClient();
  const isEdit = !!editData;

  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const [form, setForm] = useState({
    supplier_id: '',
    budget_category: '',
    quoted_amount: '',
    agreed_amount: '',
    status: 'pending',
    attachment_url: '',
    notes: '',
  });

  useEffect(() => {
    if (editData) {
      setForm({
        supplier_id: editData.supplier_id || '',
        budget_category: editData.budget_category || '',
        quoted_amount: editData.quoted_amount || '',
        agreed_amount: editData.agreed_amount || '',
        status: editData.status || 'pending',
        attachment_url: editData.attachment_url || '',
        notes: editData.notes || '',
      });
    } else {
      setForm({
        supplier_id: '',
        budget_category: '',
        quoted_amount: '',
        agreed_amount: '',
        status: 'pending',
        attachment_url: '',
        notes: '',
      });
    }
  }, [editData, open]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const activeSuppliers = suppliers.filter(s => s.is_active !== false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectSupplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectSupplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      onOpenChange(false);
    },
  });

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, attachment_url: file_url }));
    setUploading(false);

    // Auto-extract price
    if (isEdit) {
      setExtracting(true);
      base44.functions.invoke('extractSupplierQuote', {
        file_url,
        project_supplier_id: editData.id,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      }).finally(() => setExtracting(false));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    const payload = {
      project_id: projectId,
      supplier_id: form.supplier_id,
      category: supplier?.category || '',
      budget_category: form.budget_category || '',
      quoted_amount: form.quoted_amount ? Number(form.quoted_amount) : null,
      agreed_amount: form.agreed_amount ? Number(form.agreed_amount) : null,
      status: form.status,
      attachment_url: form.attachment_url || null,
      notes: form.notes,
    };

    if (isEdit) {
      updateMutation.mutate({ id: editData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEdit ? 'עריכת ספק בפרויקט' : 'הוסף ספק לפרויקט'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier selector with + new */}
            <div>
              <Label>ספק *</Label>
              <div className="flex gap-2">
                <Select value={form.supplier_id} onValueChange={v => update('supplier_id', v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="בחר ספק" /></SelectTrigger>
                  <SelectContent>
                    {activeSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {categoryLabel(s.category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => setShowNewSupplier(true)}
                >
                  <UserPlus className="w-4 h-4" />
                  חדש
                </Button>
              </div>
            </div>

            {/* Budget category */}
            <div>
              <Label>קטגוריה תקציבית</Label>
              <Select value={form.budget_category} onValueChange={v => update('budget_category', v)}>
                <SelectTrigger><SelectValue placeholder="כללי" /></SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>הצעה (₪)</Label>
                <Input
                  type="number"
                  value={form.quoted_amount}
                  onChange={e => update('quoted_amount', e.target.value)}
                />
              </div>
              <div>
                <Label>סגור (₪)</Label>
                <Input
                  type="number"
                  value={form.agreed_amount}
                  onChange={e => update('agreed_amount', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div>
              <Label>קובץ הצעה</Label>
              <div className="flex items-center gap-2 mt-1">
                {uploading || extracting ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {extracting ? 'מחלץ מחיר...' : 'מעלה...'}
                  </div>
                ) : form.attachment_url ? (
                  <>
                    <a href={form.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />צפה בקובץ
                    </a>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      };
                      input.click();
                    }}>
                      <Upload className="w-3.5 h-3.5 ml-1" />החלף
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = (e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    };
                    input.click();
                  }}>
                    <Upload className="w-3.5 h-3.5 ml-1" />העלה קובץ
                  </Button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="h-16" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button type="submit" disabled={!form.supplier_id}>
                {isEdit ? 'עדכן' : 'הוסף ספק'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddSupplierDialog open={showNewSupplier} onOpenChange={setShowNewSupplier} />
    </>
  );
}