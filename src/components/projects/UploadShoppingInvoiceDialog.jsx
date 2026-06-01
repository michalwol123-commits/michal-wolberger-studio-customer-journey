import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CheckCircle, UserPlus } from 'lucide-react';
import AddSupplierDialog from '@/components/suppliers/AddSupplierDialog';
import { toast } from 'sonner';

const BUDGET_CATEGORIES = [
  { value: 'מטבח', label: 'מטבח' },
  { value: 'נגרות', label: 'נגרות' },
  { value: 'חשמל', label: 'חשמל' },
  { value: 'אינסטלציה', label: 'אינסטלציה' },
  { value: 'ריצוף', label: 'ריצוף' },
  { value: 'צבע', label: 'צבע' },
  { value: 'תאורה', label: 'תאורה' },
  { value: 'טקסטיל', label: 'טקסטיל' },
  { value: 'ריהוט', label: 'ריהוט' },
  { value: 'אחר', label: 'אחר' },
];

export default function UploadShoppingInvoiceDialog({ open, onOpenChange, projectId }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', budget_category: '', amount: '' });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });
  const activeSuppliers = suppliers.filter(s => s.is_active !== false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);
      setUploading(false);
      setExtracting(true);

      const res = await base44.functions.invoke('extractSupplierQuote', {
        file_url,
        extract_only: true,
      });
      const ext = res?.data?.extracted;
      const updates = {};

      if (ext?.amount) updates.amount = String(ext.amount);
      if (ext?.budget_category && BUDGET_CATEGORIES.some(c => c.value === ext.budget_category)) {
        updates.budget_category = ext.budget_category;
      }
      if (ext?.supplier_name) {
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
      setStep('confirm');
    } catch (err) {
      toast.error('שגיאה בהעלאה: ' + err.message);
      setUploading(false);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supplier = activeSuppliers.find(s => s.id === form.supplier_id);
      const amount = form.amount ? Number(form.amount) : null;

      await base44.entities.ProjectSupplier.create({
        project_id: projectId,
        supplier_id: form.supplier_id || null,
        category: supplier?.category || '',
        budget_category: form.budget_category || 'אחר',
        agreed_amount: amount,
        quoted_amount: amount,
        status: 'completed',
        attachment_url: fileUrl,
        notes: 'חשבונית מיום קניות',
      });

      await base44.entities.Document.create({
        project_id: projectId,
        type: 'shopping_invoice',
        stage: 9,
        file_url: fileUrl,
        visible_to_client: true,
        name: `חשבונית קניות${form.budget_category ? ' — ' + form.budget_category : ''}`,
      });

      queryClient.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('חשבונית נשמרה, תקציב עודכן ✅');
      onOpenChange(false);
      setStep('upload');
      setFileUrl('');
      setForm({ supplier_id: '', budget_category: '', amount: '' });
    } catch (err) {
      toast.error('שגיאה בשמירה: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">העלאת חשבונית קניות</DialogTitle>
          </DialogHeader>

          {step === 'upload' && !uploading && !extracting && (
            <div className="py-4">
              <label className="flex flex-col items-center gap-3 border-2 border-dashed border-muted rounded-lg p-8 cursor-pointer hover:border-primary transition-colors w-full">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center">
                  לחצי להעלאת חשבונית<br />
                  <span className="text-xs">תמונה או PDF — הסכום והקטגוריה יחולצו אוטומטית</span>
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {(uploading || extracting) && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {uploading ? 'מעלה קובץ...' : 'מנתח חשבונית...'}
              </p>
            </div>
          )}

          {step === 'confirm' && !uploading && !extracting && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">בדקי ותקני את הפרטים שחולצו:</p>

              <div>
                <Label>ספק / חנות <span className="text-muted-foreground text-xs">(אופציונלי)</span></Label>
                <div className="flex gap-2">
                  <Select value={form.supplier_id} onValueChange={v => update('supplier_id', v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="בחר ספק" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSuppliers.filter(s => s.id).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewSupplier(true)}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>קטגוריה תקציבית *</Label>
                <Select value={form.budget_category} onValueChange={v => update('budget_category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>סכום (₪) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => update('amount', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setStep('upload'); setFileUrl(''); }}>
                  חזרה
                </Button>
                <Button
                  className="flex-1"
                  disabled={!form.budget_category || !form.amount || saving}
                  onClick={handleSave}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />שומר...</>
                    : <><CheckCircle className="w-4 h-4 ml-1" />שמור חשבונית</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddSupplierDialog
        open={showNewSupplier}
        onOpenChange={setShowNewSupplier}
        onCreated={(newSupplier) => {
          if (newSupplier?.id) update('supplier_id', newSupplier.id);
        }}
      />
    </>
  );
}