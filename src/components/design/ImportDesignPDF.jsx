import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORY_CONFIG } from './designConfig';

export default function ImportDesignPDF({ open, onOpenChange, projectId, onImported }) {
  const [step, setStep] = useState('upload'); // upload | processing | review | saving
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('processing');
    setError('');

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke('importDesignPDF', { file_url, project_id: projectId });

    if (response.data?.error) {
      setError(response.data.error);
      setStep('upload');
      return;
    }

    const extracted = response.data?.items || [];
    setItems(extracted);
    setSummary(response.data?.summary || '');
    setSelectedItems(new Set(extracted.map((_, i) => i)));
    setStep('review');
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSave = async () => {
    setStep('saving');
    const toSave = items.filter((_, i) => selectedItems.has(i)).map(item => ({
      project_id: projectId,
      room: item.room || 'כללי',
      category: item.category || 'other',
      title: item.title,
      description: item.description || '',
      options: JSON.stringify(item.options || []),
      supplier: item.supplier || '',
      supplier_phone: item.supplier_phone || '',
      stage: item.stage || 8,
      priority: item.priority || 'must',
      status: 'planned',
    }));

    await base44.entities.DesignItem.bulkCreate(toSave);
    onImported?.();
    onOpenChange(false);
    setStep('upload');
    setItems([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('upload');
    setItems([]);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">ייבוא מפת פרויקט מ-PDF</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              העלי את קובץ סיכום פגישת הייעוץ (PDF).<br />
              המערכת תפרק אותו אוטומטית לפריטים לפי חדר וקטגוריה.
            </p>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <label>
              <Button className="gap-2 cursor-pointer" asChild>
                <span><Upload className="w-4 h-4" />בחרי קובץ PDF</span>
              </Button>
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">קוראת את המסמך ומפרקת לפריטים...<br />זה יכול לקחת עד דקה</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {summary && (
              <Card><CardContent className="p-3 text-sm text-muted-foreground">{summary}</CardContent></Card>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">נמצאו {items.length} פריטים — בחרי מה לייבא:</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}>בחרי הכל</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>נקי הכל</Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {items.map((item, i) => {
                const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                const selected = selectedItems.has(i);
                return (
                  <Card key={i} className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-primary/50' : 'opacity-60'}`} onClick={() => toggleItem(i)}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                        {selected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm">{cat.icon}</span>
                          <span className="font-medium text-sm">{item.title}</span>
                          <Badge variant="outline" className="text-xs">{item.room}</Badge>
                          <Badge variant="secondary" className="text-xs">שלב {item.stage}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        )}
                        {item.supplier && <p className="text-xs text-muted-foreground mt-0.5">ספק: {item.supplier}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button onClick={handleSave} disabled={selectedItems.size === 0}>
                ייבוא {selectedItems.size} פריטים
              </Button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">שומרת פריטים...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}