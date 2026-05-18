import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Loader2, Check, Save, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CATEGORY_CONFIG } from './designConfig';

export default function ImportFromDriveDialog({ open, onOpenChange, projectId, onImported }) {
  const [step, setStep] = useState('search'); // search | loading | choose | extracting | review | saving
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await base44.functions.invoke('searchGoogleDrive', { query: query.trim() });
      setFiles(res.data?.files || []);
      if ((res.data?.files || []).length === 0) {
        setError('לא נמצאו קבצים. נסי מילות חיפוש אחרות.');
      }
    } catch (err) {
      setError('שגיאה בחיפוש. נסי שוב.');
    }
    setSearching(false);
  };

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setStep('choose');
  };

  const handleSaveAsDocument = async () => {
    setStep('loading');
    try {
      const webLink = `https://docs.google.com/document/d/${selectedFile.id}/edit`;
      await base44.entities.Document.create({
        project_id: projectId,
        name: selectedFile.name,
        file_url: webLink,
        type: 'other',
        approval_status: 'draft',
        visible_to_client: false,
      });
      toast.success(`"${selectedFile.name}" נשמר כמסמך בפרויקט`);
      onImported?.();
      handleClose();
    } catch (err) {
      setError('שגיאה בשמירת המסמך');
      setStep('choose');
    }
  };

  const handleExtractDesignItems = async () => {
    setStep('extracting');
    setError('');
    try {
      // First export the doc as PDF
      const fetchRes = await base44.functions.invoke('fetchGoogleDoc', { file_id: selectedFile.id });
      const fileUrl = fetchRes.data?.file_url;
      if (!fileUrl) {
        setError(fetchRes.data?.error || 'שגיאה בייצוא הקובץ');
        setStep('choose');
        return;
      }

      // Then extract design items using the existing importDesignPDF function
      const extractRes = await base44.functions.invoke('importDesignPDF', { file_url: fileUrl, project_id: projectId });
      if (extractRes.data?.error) {
        setError(extractRes.data.error);
        setStep('choose');
        return;
      }

      const extracted = extractRes.data?.items || [];
      setItems(extracted);
      setSummary(extractRes.data?.summary || '');
      setSelectedItems(new Set(extracted.map((_, i) => i)));
      setStep('review');
    } catch (err) {
      setError('שגיאה בעיבוד המסמך. נסי שוב.');
      setStep('choose');
    }
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSaveItems = async () => {
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
    toast.success(`${toSave.length} פריטים יובאו בהצלחה`);
    onImported?.();
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('search');
    setQuery('');
    setFiles([]);
    setSelectedFile(null);
    setItems([]);
    setSummary('');
    setSelectedItems(new Set());
    setError('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">ייבוא מ-Google Drive</DialogTitle>
        </DialogHeader>

        {/* Step: Search */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="חפשי קובץ בדרייב..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || !query.trim()} className="gap-1">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                חיפוש
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">נמצאו {files.length} קבצים:</p>
                {files.map(file => (
                  <Card
                    key={file.id}
                    className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => handleSelectFile(file)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(file.modifiedTime)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!searching && files.length === 0 && !error && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">חפשי מסמך בגוגל דרייב לפי שם</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Choose action */}
        {step === 'choose' && selectedFile && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedFile.modifiedTime)}</p>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <p className="text-sm text-muted-foreground">מה לעשות עם הקובץ?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={handleSaveAsDocument}>
                <CardContent className="p-4 text-center">
                  <Save className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <p className="font-medium text-sm">שמור כמסמך</p>
                  <p className="text-xs text-muted-foreground mt-1">שמירת קישור למסמך בפרויקט</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={handleExtractDesignItems}>
                <CardContent className="p-4 text-center">
                  <Wand2 className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="font-medium text-sm">ייבוא פריטי עיצוב</p>
                  <p className="text-xs text-muted-foreground mt-1">חילוץ אוטומטי לפי חדר וקטגוריה</p>
                </CardContent>
              </Card>
            </div>

            <Button variant="outline" onClick={() => { setSelectedFile(null); setStep('search'); setError(''); }}>
              ← חזרה לחיפוש
            </Button>
          </div>
        )}

        {/* Step: Loading / Extracting */}
        {(step === 'loading' || step === 'extracting') && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {step === 'extracting' ? 'מייצאת ומנתחת את המסמך... זה יכול לקחת עד דקה' : 'שומרת...'}
            </p>
          </div>
        )}

        {/* Step: Review extracted items */}
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
              <Button onClick={handleSaveItems} disabled={selectedItems.size === 0}>
                ייבוא {selectedItems.size} פריטים
              </Button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
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