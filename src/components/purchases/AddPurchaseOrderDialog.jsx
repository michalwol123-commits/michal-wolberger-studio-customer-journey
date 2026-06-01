import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, FileText } from 'lucide-react';

const statusOptions = [
  { value: 'sent', label: 'הצעת מחיר מספק' },
  { value: 'confirmed', label: 'הזמנה מאושרת מספק' },
];

export default function AddPurchaseOrderDialog({ open, onOpenChange, initialData, projectId }) {
  const isEdit = !!initialData;
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    project_id: projectId || '',
    supplier_id: '',
    category: '',
    description: '',
    amount: '',
    status: 'sent',
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    notes: '',
    attachment_url: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        project_id: initialData.project_id || projectId || '',
        supplier_id: initialData.supplier_id || '',
        category: initialData.category || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        status: initialData.status || 'sent',
        order_date: initialData.order_date || '',
        delivery_date: initialData.delivery_date || '',
        notes: initialData.notes || '',
        attachment_url: initialData.attachment_url || '',
      });
      setFile(null);
    } else {
      setForm({
        project_id: projectId || '',
        supplier_id: '',
        category: '',
        description: '',
        amount: '',
        status: 'sent',
        order_date: new Date().toISOString().slice(0, 10),
        delivery_date: '',
        notes: '',
        attachment_url: '',
      });
      setFile(null);
    }
  }, [initialData, open]);

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

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = async () => {
    setUploading(true);
    let attachmentUrl = form.attachment_url;

    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      attachmentUrl = file_url;
    }

    mutation.mutate({
      ...form,
      amount: Number(form.amount) || 0,
      attachment_url: attachmentUrl || undefined,
    });
    setUploading(false);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת מסמך ספק' : 'מסמך ספק חדש'}</DialogTitle>
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
            <Label>ספק *</Label>
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
              <Label>קטגוריה *</Label>
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

          {/* File upload */}
          <div>
            <Label>קובץ מצורף</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : form.attachment_url ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">קובץ קיים — לחצי להחלפה</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">לחצי לבחירת קובץ</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>סוג מסמך</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך</Label>
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
          <Button onClick={handleSubmit} disabled={mutation.isPending || uploading || !form.supplier_id || !form.category}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</> : isEdit ? 'עדכון' : 'יצירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}