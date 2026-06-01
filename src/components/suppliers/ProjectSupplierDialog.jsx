import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, ExternalLink, Loader2, UserPlus, Info, FileCheck, FilePlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { categoryLabel } from './SupplierCategoryBadge';
import AddSupplierDialog from './AddSupplierDialog';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'ממתין' },
  { value: 'quoted', label: 'הצעה' },
  { value: 'approved', label: 'מאושר' },
  { value: 'rejected', label: 'נדחה' },
  { value: 'completed', label: 'הושלם' },
];

const BUDGET_CATEGORIES = [
  { value: 'כללי', label: 'כללי (ללא קטגוריה)' },
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
  const [quoteTypePrompt, setQuoteTypePrompt] = useState(null); // { file_url, amount, isNewMode }

  const [form, setForm] = useState({
    supplier_id: '',
    budget_category: '',
    quoted_amount: '',
    agreed_amount: '',
    status: 'pending',
    attachment_url: '',
    notes: '',
    visible_to_client: true,
  });

  useEffect(() => {
    if (editData) {
      setForm({
        supplier_id: editData.supplier_id || '',
        budget_category: editData.budget_category || 'כללי',
        quoted_amount: editData.quoted_amount || '',
        agreed_amount: editData.agreed_amount || '',
        status: editData.status || 'pending',
        attachment_url: editData.attachment_url || '',
        notes: editData.notes || '',
        visible_to_client: true,
      });
    } else {
      setForm({
        supplier_id: '',
        budget_category: 'כללי',
        quoted_amount: '',
        agreed_amount: '',
        status: 'pending',
        attachment_url: '',
        notes: '',
        visible_to_client: true,
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

  const extractAndFillForm = async (file_url) => {
    try {
      const res = await base44.functions.invoke('extractSupplierQuote', {
        file_url,
        extract_only: true,
      });
      const ext = res?.data?.extracted;
      if (!ext) {
        setExtracting(false);
        return;
      }
      const updates = {};
      const extractedAmount = ext.amount || null;
      if (ext.budget_category && BUDGET_CATEGORIES.some(c => c.value === ext.budget_category)) {
        updates.budget_category = ext.budget_category;
      }
      // Try to match supplier by name, or create new one
      if (ext.supplier_name) {
        const nameTrimmed = ext.supplier_name.trim();
        const match = activeSuppliers.find(s =>
          s.name === nameTrimmed ||
          s.name.includes(nameTrimmed) ||
          nameTrimmed.includes(s.name)
        );
        if (match) {
          updates.supplier_id = match.id;
        } else {
          const newSupplier = await base44.entities.Supplier.create({
            name: nameTrimmed,
            phone: ext.supplier_phone || '',
            category: ext.supplier_category || 'other',
          });
          await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
          updates.supplier_id = newSupplier.id;
        }
      }
      setForm(prev => ({ ...prev, ...updates }));
      setExtracting(false);
      // Show quote type prompt for new mode
      setQuoteTypePrompt({ file_url, amount: extractedAmount, isNewMode: true });
    } catch {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, attachment_url: file_url }));
    setUploading(false);

    setExtracting(true);
    if (isEdit) {
      // Edit mode: extract amount then ask user what type of quote this is
      base44.functions.invoke('extractSupplierQuote', {
        file_url,
        extract_only: true,
      }).then((res) => {
        const amount = res?.data?.extracted?.amount;
        setQuoteTypePrompt({ file_url, amount, isNewMode: false });
      }).finally(() => setExtracting(false));
    } else {
      // New mode: extract, fill form, then ask quote type
      extractAndFillForm(file_url).then(() => {
        // After form is filled, show the quote type prompt
      });
    }
  };

  const handleSubmit = async (e) => {
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

    // Create Document record if file was uploaded
    if (form.attachment_url && !isEdit) {
      const isInvoice = form.status === 'completed';
      const supplierName = supplier?.name || 'ספק';
      await base44.entities.Document.create({
        project_id: projectId,
        type: isInvoice ? 'shopping_invoice' : 'quote',
        file_url: form.attachment_url,
        visible_to_client: form.visible_to_client,
        name: supplierName + (isInvoice ? ' — חשבונית' : ' — הצעת מחיר'),
      });
    }

    if (isEdit) {
      updateMutation.mutate({ id: editData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleQuoteTypeChoice = async (isInvoice) => {
    if (!quoteTypePrompt) return;
    const { file_url, amount, isNewMode } = quoteTypePrompt;
    setQuoteTypePrompt(null);

    if (isNewMode) {
      // New mode: just update the form fields based on choice
      if (isInvoice) {
        setForm(prev => ({
          ...prev,
          quoted_amount: amount || prev.quoted_amount,
          agreed_amount: amount || prev.agreed_amount,
          status: 'completed',
        }));
      } else {
        setForm(prev => ({
          ...prev,
          quoted_amount: amount || prev.quoted_amount,
          status: 'quoted',
        }));
      }
    } else {
      // Edit mode: update the backend record directly with override_amount
      await base44.functions.invoke('extractSupplierQuote', {
        file_url,
        project_supplier_id: editData.id,
        is_approved: isInvoice,
        override_amount: amount || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });

      if (isInvoice) {
        setForm(prev => ({
          ...prev,
          agreed_amount: amount || prev.agreed_amount,
          status: 'approved',
        }));
      } else {
        setForm(prev => ({
          ...prev,
          quoted_amount: amount || prev.quoted_amount,
        }));
      }
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEdit ? 'עריכת ספק בפרויקט' : 'הוסף ספק / הצעה / חשבונית'}
            </DialogTitle>
            {!isEdit && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground mt-1">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  ניתן לבחור ספק מהרשימה, או להעלות הצעת מחיר / חשבונית — המערכת תחלץ אוטומטית את שם הספק, המחיר והקטגוריה, ותוסיף את הספק לרשימה אם אינו קיים.
                </span>
              </div>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier selector with + new */}
            <div>
              <Label>ספק *</Label>
              <div className="flex gap-2">
                <Select value={form.supplier_id} onValueChange={v => update('supplier_id', v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="בחר ספק" /></SelectTrigger>
                  <SelectContent>
                    {activeSuppliers.filter(s => s.id).map(s => (
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
                    {extracting ? 'מחלץ פרטים...' : 'מעלה...'}
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

            {/* Visible to client */}
            {form.attachment_url && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="visible_to_client"
                  checked={form.visible_to_client}
                  onCheckedChange={(val) => update('visible_to_client', !!val)}
                />
                <Label htmlFor="visible_to_client" className="text-sm cursor-pointer">גלוי ללקוח בפורטל</Label>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="h-16" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button type="submit" disabled={!form.supplier_id}>
                {isEdit ? 'עדכן' : 'הוסף'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddSupplierDialog
        open={showNewSupplier}
        onOpenChange={setShowNewSupplier}
        onCreated={(newSupplier) => {
          if (newSupplier?.id) {
            setForm(prev => ({ ...prev, supplier_id: newSupplier.id }));
          }
        }}
      />

      {/* Quote type prompt — new quote or approved quote */}
      <Dialog open={!!quoteTypePrompt} onOpenChange={() => setQuoteTypePrompt(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">סוג המסמך</DialogTitle>
            <DialogDescription>
              {quoteTypePrompt?.amount
                ? `הסכום שחולץ: ₪${quoteTypePrompt.amount.toLocaleString()}`
                : 'לא ניתן היה לחלץ סכום מהמסמך'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={() => handleQuoteTypeChoice(false)}
            >
              <FilePlus className="w-5 h-5 text-primary shrink-0" />
              <div className="text-right">
                <div className="font-medium">הצעת מחיר</div>
                <div className="text-xs text-muted-foreground">יעדכן את שדה ההצעה — טרם אושר</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={() => handleQuoteTypeChoice(true)}
            >
              <FileCheck className="w-5 h-5 text-green-600 shrink-0" />
              <div className="text-right">
                <div className="font-medium">חשבונית / סגור</div>
                <div className="text-xs text-muted-foreground">שולם בפועל — יעדכן סגור + סטטוס הושלם</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}