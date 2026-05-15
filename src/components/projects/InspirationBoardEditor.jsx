import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Link, Sparkles, Trash2, Eye, EyeOff, Send } from 'lucide-react';

const TYPE_LABELS = { render: 'רנדר', inspiration: 'השראה', texture: 'טקסטורה', sketch: 'סקיצה', material: 'חומרים' };
const TYPE_COLORS = { render: 'bg-blue-100 text-blue-800', inspiration: 'bg-purple-100 text-purple-800', texture: 'bg-green-100 text-green-800', sketch: 'bg-yellow-100 text-yellow-800', material: 'bg-orange-100 text-orange-800' };

export default function InspirationBoardEditor({ projectId, project }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [addMode, setAddMode] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedType, setSelectedType] = useState('inspiration');
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['inspiration-items', projectId],
    queryFn: () => base44.entities.InspirationItem.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
  });

  const filtered = activeFilter === 'all' ? items : items.filter(i => i.type === activeFilter);
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['inspiration-items', projectId] });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    if (uploadResult?.file_url) {
      await base44.entities.InspirationItem.create({
        project_id: projectId, uploader_role: 'staff', type: selectedType,
        file_url: uploadResult.file_url, title: file.name.replace(/\.[^.]+$/, ''),
        is_approved: false, order: items.length,
      });
      refetch();
      setAddMode(null);
    }
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = async () => {
    if (!externalUrl.trim()) return;
    setIsLoading(true);
    await base44.entities.InspirationItem.create({
      project_id: projectId, uploader_role: 'staff', type: selectedType,
      external_url: externalUrl.trim(), title: urlTitle.trim() || externalUrl.trim(),
      is_approved: false, order: items.length,
    });
    refetch();
    setAddMode(null);
    setExternalUrl('');
    setUrlTitle('');
    setIsLoading(false);
  };

  const handleAiRender = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const result = await base44.integrations.Core.GenerateImage({ prompt: aiPrompt.trim() });
    if (result?.url) {
      await base44.entities.InspirationItem.create({
        project_id: projectId, uploader_role: 'staff', type: 'render',
        file_url: result.url, ai_prompt: aiPrompt.trim(),
        title: 'רנדר AI: ' + aiPrompt.substring(0, 40),
        is_approved: false, order: items.length,
      });
      refetch();
      setAddMode(null);
      setAiPrompt('');
    }
    setAiLoading(false);
  };

  const toggleApprove = async (item) => {
    await base44.entities.InspirationItem.update(item.id, { is_approved: !item.is_approved });
    refetch();
  };

  const handleDelete = async (item) => {
    if (!confirm('למחוק פריט זה?')) return;
    await base44.entities.InspirationItem.delete(item.id);
    refetch();
  };

  const publishAll = async () => {
    const unpublished = items.filter(i => !i.is_approved);
    for (const item of unpublished) {
      await base44.entities.InspirationItem.update(item.id, { is_approved: true });
    }
    refetch();
  };

  if (itemsLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['all', ...Object.keys(TYPE_LABELS)].map(t => (
          <button
            key={t}
            onClick={() => setActiveFilter(t)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'all'
              ? `הכל (${items.length})`
              : `${TYPE_LABELS[t]} (${items.filter(i => i.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Add actions */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={() => setAddMode(addMode === 'upload' ? null : 'upload')}>
          <Upload size={14} className="ml-1" /> העלה תמונה
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddMode(addMode === 'url' ? null : 'url')}>
          <Link size={14} className="ml-1" /> קישור חיצוני
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddMode(addMode === 'ai' ? null : 'ai')}>
          <Sparkles size={14} className="ml-1" /> רנדר AI
        </Button>
      </div>

      {/* Upload panel */}
      {addMode === 'upload' && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <p className="text-sm font-medium">העלאת תמונה</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} disabled={isLoading} />
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" /> מעלה...
            </p>
          )}
        </div>
      )}

      {/* URL panel */}
      {addMode === 'url' && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <Input placeholder="כתובת URL (Pinterest, Houzz...)" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} dir="ltr" />
          <Input placeholder="כותרת (אופציונלי)" value={urlTitle} onChange={e => setUrlTitle(e.target.value)} />
          <Button size="sm" onClick={handleAddUrl} disabled={isLoading || !externalUrl.trim()}>הוסף</Button>
        </div>
      )}

      {/* AI panel */}
      {addMode === 'ai' && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <Textarea placeholder="תאר את החזון העיצובי..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} />
          <Button size="sm" onClick={handleAiRender} disabled={aiLoading || !aiPrompt.trim()}>
            {aiLoading ? <><Loader2 size={14} className="animate-spin ml-1" /> יוצר...</> : <><Sparkles size={14} className="ml-1" /> צור רנדר</>}
          </Button>
        </div>
      )}

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">אין פריטים עדיין</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border bg-card shadow-sm">
              <div className="aspect-square bg-muted relative">
                {item.file_url ? (
                  <img src={item.file_url} alt={item.title || ''} className="w-full h-full object-cover" />
                ) : item.external_url ? (
                  <a href={item.external_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center h-full flex-col gap-2 text-muted-foreground hover:text-primary">
                    <Link size={32} />
                    <span className="text-xs text-center px-2 break-all">{item.title}</span>
                  </a>
                ) : null}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => toggleApprove(item)}
                    className={`p-2 rounded-full text-white ${item.is_approved ? 'bg-green-500' : 'bg-white/20 hover:bg-green-500'} transition-colors`}
                    title={item.is_approved ? 'בטל פרסום' : 'פרסם ללקוח'}
                  >
                    {item.is_approved ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type] || 'bg-muted'}`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  {item.is_approved && <span className="text-xs text-green-600 flex items-center gap-0.5"><Eye size={10} /> פורסם</span>}
                  {item.uploader_role === 'client' && <span className="text-xs text-blue-600">מהלקוחה</span>}
                </div>
                {item.title && <p className="text-xs text-muted-foreground mt-1 truncate">{item.title}</p>}
                {item.client_reaction && item.client_reaction !== 'none' && (
                  <p className="text-xs mt-0.5">
                    {item.client_reaction === 'love' ? '❤️' : item.client_reaction === 'like' ? '👍' : item.client_reaction === 'neutral' ? '😐' : '👎'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish all button */}
      {items.some(i => !i.is_approved) && (
        <div className="border-t pt-4">
          <Button className="w-full" onClick={publishAll}>
            <Send size={16} className="ml-2" />
            פרסם הכל ({items.filter(i => !i.is_approved).length} פריטים)
          </Button>
        </div>
      )}
    </div>
  );
}