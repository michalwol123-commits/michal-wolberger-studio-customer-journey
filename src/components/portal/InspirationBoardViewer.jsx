import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Link, CheckCircle, Clock } from 'lucide-react';

const REACTIONS = [
  { value: 'love', emoji: '❤️', label: 'אוהבת!' },
  { value: 'like', emoji: '👍', label: 'נחמד' },
  { value: 'neutral', emoji: '😐', label: 'לא בטוחה' },
  { value: 'dislike', emoji: '👎', label: 'לא בשבילי' },
];
const TYPE_LABELS = { render: 'רנדר', inspiration: 'השראה', texture: 'טקסטורה', sketch: 'סקיצה', material: 'חומרים' };

export default function InspirationBoardViewer({ projectId, project, onConceptApproved }) {
  const queryClient = useQueryClient();
  const [commentMap, setCommentMap] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [conceptApproved, setConceptApproved] = useState(project?.concept_status === 'approved');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inspiration-items-portal', projectId],
    queryFn: () => base44.entities.InspirationItem.filter({ project_id: projectId, is_approved: true }, 'order'),
    enabled: !!projectId,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['inspiration-items-portal', projectId] });

  const handleReaction = async (item, reaction) => {
    setSavingId(item.id + '_r');
    await base44.entities.InspirationItem.update(item.id, {
      client_reaction: item.client_reaction === reaction ? 'none' : reaction,
    });
    refetch();
    setSavingId(null);
  };

  const handleComment = async (item) => {
    setSavingId(item.id + '_c');
    await base44.entities.InspirationItem.update(item.id, { client_comment: commentMap[item.id] ?? '' });
    refetch();
    setSavingId(null);
  };

  const handleClientUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await base44.integrations.Core.UploadFile({ file });
    if (r?.file_url) {
      await base44.entities.InspirationItem.create({
        project_id: projectId, uploader_role: 'client', type: 'inspiration',
        file_url: r.file_url, title: 'השראה שלי: ' + file.name.replace(/\.[^.]+$/, ''),
        is_approved: true, order: items.length + 100,
      });
      refetch();
    }
    setUploading(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    await base44.entities.Project.update(projectId, { concept_status: 'approved' });
    setConceptApproved(true);
    if (onConceptApproved) onConceptApproved();
    setApproving(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Clock size={48} className="text-muted-foreground/40" />
        <h3 className="text-lg font-medium text-muted-foreground">לוח ההשראה בהכנה</h3>
        <p className="text-muted-foreground text-sm">מיכל עובדת על לוח ההשראה שלך. ברגע שיהיה מוכן תקבלי הודעה.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">לוח ההשראה שלך</h2>
        <p className="text-muted-foreground mt-1 text-sm">עברי על התמונות, הגיבי לכל אחת ובסוף אשרי את הקונספט</p>
      </div>

      {/* Masonry grid */}
      <div className="columns-2 md:columns-3 gap-3">
        {items.map(item => (
          <div key={item.id} className="break-inside-avoid mb-3 rounded-xl overflow-hidden border bg-card shadow-sm">
            {item.file_url ? (
              <img src={item.file_url} alt={item.title || ''} className="w-full object-cover" />
            ) : item.external_url ? (
              <a href={item.external_url} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center justify-center py-8 px-4 gap-2 text-primary hover:bg-accent/20">
                <Link size={28} />
                <span className="text-xs text-center text-muted-foreground">{item.title || item.external_url}</span>
              </a>
            ) : null}

            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</span>
                {item.uploader_role === 'client' && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">השראה שלי</span>
                )}
              </div>
              {item.title && <p className="text-xs font-medium text-foreground">{item.title}</p>}

              {/* Reactions */}
              <div className="flex gap-1.5 flex-wrap">
                {REACTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleReaction(item, opt.value)}
                    disabled={savingId === item.id + '_r'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                      item.client_reaction === opt.value
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-card border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    <span>{opt.emoji}</span><span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Comment */}
              <Textarea
                placeholder="הערה..."
                rows={2}
                value={commentMap[item.id] ?? item.client_comment ?? ''}
                onChange={e => setCommentMap(m => ({ ...m, [item.id]: e.target.value }))}
                className="text-xs resize-none"
              />
              {commentMap[item.id] !== undefined && commentMap[item.id] !== (item.client_comment ?? '') && (
                <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => handleComment(item)} disabled={savingId === item.id + '_c'}>
                  שמור הערה
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Client upload */}
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3">
        <Upload size={24} className="mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">יש לך תמונות השראה משלך? העלי כאן</p>
        <label className="cursor-pointer">
          <span className="inline-block px-4 py-2 border border-primary text-primary rounded-lg text-sm hover:bg-accent/20">
            {uploading ? 'מעלה...' : 'בחרי תמונה'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleClientUpload} disabled={uploading} />
        </label>
      </div>

      {/* Concept approval */}
      <div className={`border-2 rounded-xl p-6 text-center space-y-3 ${conceptApproved ? 'border-green-300 bg-green-50' : 'border-primary bg-accent/10'}`}>
        {conceptApproved ? (
          <>
            <CheckCircle size={40} className="mx-auto text-green-500" />
            <h3 className="text-lg font-bold text-green-700">הקונספט אושר!</h3>
            <p className="text-green-600 text-sm">תודה! מיכל תמשיך לשלב הבא.</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold">אישור קונספט עיצובי</h3>
            <p className="text-muted-foreground text-sm">עברת על ההשראה? לחצי לאישור הקונספט</p>
            <Button onClick={handleApprove} disabled={approving} className="px-8 py-3 text-base font-semibold">
              {approving ? <><Loader2 size={18} className="animate-spin ml-2" /> שומרת...</> : '✓ אישרתי את הקונספט!'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}