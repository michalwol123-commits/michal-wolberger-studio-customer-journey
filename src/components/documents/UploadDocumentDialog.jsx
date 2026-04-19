import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, FileText } from 'lucide-react';
import useCurrentUser from '@/lib/useCurrentUser';

const docTypes = [
  { value: 'plan', label: 'תוכנית' },
  { value: 'concept', label: 'קונספט' },
  { value: 'render', label: 'רנדר' },
  { value: 'contract', label: 'חוזה' },
  { value: 'quote', label: 'הצעת מחיר' },
  { value: 'photo', label: 'תמונה' },
  { value: 'gantt', label: 'גאנט' },
  { value: 'budget', label: 'תקציב' },
  { value: 'material_list', label: 'רשימת חומרים' },
  { value: 'inspection_report', label: 'דוח פיקוח' },
  { value: 'other', label: 'אחר' },
];

export default function UploadDocumentDialog({ open, onOpenChange, projectId, clientId }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '', type: 'other', stage: '', visible_to_client: false,
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [versioningDoc, setVersioningDoc] = useState(null);

  const { data: existingDocs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 500),
  });

  // Find matching existing docs for versioning check
  const matchingDocs = existingDocs.filter(d =>
    d.is_current !== false &&
    d.name === form.name &&
    ((projectId && d.project_id === projectId) || (clientId && d.client_id === clientId))
  );

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!form.name) {
        setForm(prev => ({ ...prev, name: selected.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleNameChange = (name) => {
    setForm(prev => ({ ...prev, name }));
    setVersioningDoc(null); // reset versioning choice on name change
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      resetAndClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
  });

  const resetAndClose = () => {
    setForm({ name: '', type: 'other', stage: '', visible_to_client: false });
    setFile(null);
    setVersioningDoc(null);
    setUploading(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const docData = {
      name: form.name,
      type: form.type,
      stage: form.stage ? Number(form.stage) : undefined,
      visible_to_client: form.visible_to_client,
      file_url,
      project_id: projectId || undefined,
      client_id: clientId || undefined,
      uploaded_by: user?.email,
      uploaded_at: new Date().toISOString(),
      owner: user?.email,
    };

    if (versioningDoc) {
      // New version flow
      docData.parent_doc_id = versioningDoc.parent_doc_id || versioningDoc.id;
      docData.version_number = (versioningDoc.version_number || 1) + 1;

      // Mark old doc as not current
      await updateMutation.mutateAsync({ id: versioningDoc.id, data: { is_current: false } });
      createMutation.mutate(docData);
    } else {
      docData.version_number = 1;
      docData.is_current = true;
      createMutation.mutate(docData);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const showVersionPrompt = form.name && matchingDocs.length > 0 && !versioningDoc;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            העלאת מסמך
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File picker */}
          <div>
            <Label>קובץ *</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">לחץ לבחירת קובץ</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div>
            <Label>שם המסמך *</Label>
            <Input value={form.name} onChange={e => handleNameChange(e.target.value)} required />
          </div>

          {/* Versioning prompt */}
          {showVersionPrompt && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-2">
                קיים מסמך בשם "{form.name}" (גרסה {matchingDocs[0].version_number || 1})
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setVersioningDoc(matchingDocs[0])}
                >
                  העלה כגרסה {(matchingDocs[0].version_number || 1) + 1}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm(prev => ({ ...prev, name: prev.name + ' (עותק)' }))}
                >
                  מסמך חדש
                </Button>
              </div>
            </div>
          )}

          {versioningDoc && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ יועלה כגרסה {(versioningDoc.version_number || 1) + 1} של "{versioningDoc.name}"
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <Label>סוג מסמך</Label>
              <Select value={form.type} onValueChange={v => update('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage */}
            <div>
              <Label>שלב פרויקט</Label>
              <Select value={form.stage} onValueChange={v => update('stage', v)}>
                <SelectTrigger><SelectValue placeholder="בחר שלב" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — שאלון</SelectItem>
                  <SelectItem value="2">2 — תכנית</SelectItem>
                  <SelectItem value="3">3 — תכניות עבודה</SelectItem>
                  <SelectItem value="4">4 — קונספט</SelectItem>
                  <SelectItem value="5">5 — קניות</SelectItem>
                  <SelectItem value="6">6 — תמחור קבלנים</SelectItem>
                  <SelectItem value="7">7 — ביצוע</SelectItem>
                  <SelectItem value="8">8 — התקנה</SelectItem>
                  <SelectItem value="9">9 — מסירה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visible to client */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="visible_to_client"
              checked={form.visible_to_client}
              onCheckedChange={v => update('visible_to_client', v)}
            />
            <Label htmlFor="visible_to_client" className="cursor-pointer text-sm">
              גלוי ללקוח בפורטל
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>ביטול</Button>
            <Button type="submit" disabled={!file || !form.name || uploading}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</>
              ) : 'העלה מסמך'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}