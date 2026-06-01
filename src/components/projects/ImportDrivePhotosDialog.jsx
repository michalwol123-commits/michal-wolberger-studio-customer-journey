import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Check, ImageIcon, HardDrive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ImportDrivePhotosDialog({ open, onOpenChange, projectId, stage }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    setSearching(true);
    setError('');
    setSelectedIds(new Set());
    const res = await base44.functions.invoke('searchDriveImages', { query: query.trim() });
    const found = res.data?.files || [];
    setFiles(found);
    if (found.length === 0) setError('לא נמצאו תמונות. נסי מילות חיפוש אחרות.');
    setSearching(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const handleImport = async () => {
    const selected = files.filter(f => selectedIds.has(f.id));
    if (selected.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    let successCount = 0;

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const res = await base44.functions.invoke('importDrivePhoto', {
        file_id: file.id,
        file_name: file.name,
        project_id: projectId,
        stage: stage || 13,
        visible_to_client: true,
      });
      if (res.data?.success) successCount++;
      setImportProgress(i + 1);
    }

    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast.success(`${successCount} תמונות יובאו בהצלחה מהדרייב`);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuery('');
    setFiles([]);
    setSelectedIds(new Set());
    setImporting(false);
    setImportProgress(0);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            ייבוא תמונות מ-Google Drive
          </DialogTitle>
        </DialogHeader>

        {importing ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              מייבא תמונה {importProgress} מתוך {selectedIds.size}...
            </p>
            <div className="w-48 mx-auto mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${(importProgress / selectedIds.size) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex gap-2">
              <Input
                placeholder="חפשי תמונות בדרייב..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching} className="gap-1">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                חיפוש
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Results grid */}
            {files.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">נמצאו {files.length} תמונות</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAll}>
                      {selectedIds.size === files.length ? 'בטלי הכל' : 'בחרי הכל'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <Button size="sm" onClick={handleImport} className="gap-1">
                        <Check className="w-4 h-4" />
                        ייבוא {selectedIds.size} תמונות
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
                  {files.map(file => {
                    const selected = selectedIds.has(file.id);
                    const thumb = file.thumbnailLink;
                    return (
                      <div
                        key={file.id}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                          selected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/30'
                        }`}
                        onClick={() => toggleSelect(file.id)}
                      >
                        {thumb ? (
                          <img
                            src={thumb.replace(/=s\d+/, '=s300')}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <p className="text-[10px] text-white truncate">{file.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Empty state */}
            {!searching && files.length === 0 && !error && (
              <div className="text-center py-10">
                <HardDrive className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">חפשי תמונות בגוגל דרייב לפי שם</p>
                <p className="text-xs text-muted-foreground mt-1">או השאירי ריק לחיפוש כל התמונות</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}