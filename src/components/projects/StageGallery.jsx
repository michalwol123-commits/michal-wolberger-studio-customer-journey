import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageIcon, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const typeLabels = {
  render: 'רנדר',
  concept: 'קונספט',
  photo: 'השראה / תמונה',
};

export default function StageGallery({ docs, title }) {
  const [selectedImg, setSelectedImg] = useState(null);
  const queryClient = useQueryClient();

  const toggleVisibility = async (e, doc) => {
    e.stopPropagation();
    await base44.entities.Document.update(doc.id, { visible_to_client: !doc.visible_to_client });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast.success(doc.visible_to_client ? 'הוסתר מהלקוח' : 'מוצג ללקוח');
  };

  const handleDelete = async (e, doc) => {
    e.stopPropagation();
    await base44.entities.Document.delete(doc.id);
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast.success('התמונה נמחקה');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {title || `מודבורד ורנדרים`} ({docs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedImg(doc)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all"
              >
                <img
                  src={doc.file_url}
                  alt={doc.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{doc.name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {typeLabels[doc.type] || doc.type}
                  </Badge>
                </div>
                {/* Admin controls overlay */}
                <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => toggleVisibility(e, doc)}
                    className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                    title={doc.visible_to_client ? 'הסתר מלקוח' : 'הצג ללקוח'}>
                    {doc.visible_to_client
                      ? <Eye className="w-3.5 h-3.5 text-green-400" />
                      : <EyeOff className="w-3.5 h-3.5 text-white/70" />}
                  </button>
                  <button onClick={(e) => handleDelete(e, doc)}
                    className="w-7 h-7 rounded-full bg-black/50 hover:bg-red-600/80 flex items-center justify-center transition-colors"
                    title="מחק תמונה">
                    <Trash2 className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </div>
                {/* Visibility indicator (always visible) */}
                {doc.visible_to_client && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white/50" title="גלוי ללקוח" />
                  </div>
                )}
                {!doc.visible_to_client && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-white/50" title="מוסתר מלקוח" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!selectedImg} onOpenChange={() => setSelectedImg(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedImg && (
            <div>
              <img
                src={selectedImg.file_url}
                alt={selectedImg.name}
                className="w-full max-h-[80vh] object-contain bg-black"
              />
              <div className="p-4 flex items-center justify-between" dir="rtl">
                <div>
                  <p className="font-medium">{selectedImg.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[selectedImg.type] || selectedImg.type} • גרסה {selectedImg.version_number || 1}
                    {selectedImg.visible_to_client && <span className="text-green-600 mr-2"> • גלוי ללקוח ✓</span>}
                  </p>
                </div>
                {selectedImg.file_url && (
                  <a href={selectedImg.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                    פתח בחלון חדש
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}