import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, MinusCircle, Download, Send, Loader2, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

function StaffReplyInput({ visit, visitId, onUpdate }) {
  const [reply, setReply] = React.useState(visit?.staff_reply || '');
  const [saving, setSaving] = React.useState(false);
  const hasChanged = reply !== (visit?.staff_reply || '');

  return (
    <Card className="border-gray-100">
      <CardContent className="pt-3 pb-3 space-y-2">
        <p className="text-xs text-gray-500 font-medium">✏️ תגובת מיכל ללקוח</p>
        <Textarea
          placeholder="כתבי תגובה לדוח הזה (תוצג ללקוח בפורטל)..."
          value={reply}
          onChange={e => setReply(e.target.value)}
          className="text-sm min-h-[60px]"
        />
        {hasChanged && (
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await base44.entities.FieldVisit.update(visitId, { staff_reply: reply });
              toast.success('תגובה נשמרה');
              onUpdate?.();
              setSaving(false);
            }}
            className="w-full bg-[#8B7355] hover:bg-[#7a6548] text-white text-xs"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
            שמור תגובה
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const CATEGORY_LABELS = {
  structure: '🧱 בנייה', finishing: '🎨 גמרים', electrical: '⚡ חשמל',
  plumbing: '🔧 אינסטלציה', carpentry: '🪵 נגרות', other: '📌 אחר',
};
const SEV_COLORS = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};

export default function FieldVisitSummary({ visitId, onEdit, onClose, onDelete }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: visits = [] } = useQuery({
    queryKey: ['field-visit-detail', visitId],
    queryFn: () => base44.entities.FieldVisit.filter({ id: visitId }),
  });
  const visit = visits[0];

  const { data: findings = [] } = useQuery({
    queryKey: ['findings', visitId],
    queryFn: () => base44.entities.FieldFinding.filter({ field_visit_id: visitId }),
    enabled: !!visitId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.FieldVisit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-visit-detail', visitId] }),
  });

  const handlePreviewReport = async () => {
    if (!visit) return;
    setPreviewing(true);
    try {
      // Save as completed first, then generate preview PDF without sending email
      await updateMutation.mutateAsync({
        id: visitId,
        status: 'completed',
      });
      const res = await base44.functions.invoke('generateFieldReport', { visitId, mode: 'preview' });
      const url = res.data?.file_url;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('לא התקבל קישור ל-PDF');
      }
    } catch {
      toast.error('שגיאה ביצירת תצוגה מקדימה');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendReport = async () => {
    if (!visit) return;
    setSending(true);
    try {
      await updateMutation.mutateAsync({ id: visitId, status: 'completed' });
      const res = await base44.functions.invoke('generateFieldReport', { visitId });
      if (res.data?.success) {
        toast.success('הדוח נוצר ונשלח בהצלחה ✉️');
      } else {
        toast.success('הדוח נוצר בהצלחה');
      }
      queryClient.invalidateQueries({ queryKey: ['field-visit-detail', visitId] });
    } catch {
      toast.error('שגיאה בשליחת הדוח');
    } finally {
      setSending(false);
    }
  };

  if (!visit) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#8B7355]" /></div>;

  const checklist = (() => { try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; } })();
  const okItems    = checklist.filter(i => i.status === 'ok');
  const issueItems = checklist.filter(i => i.status === 'issue');
  const naItems    = checklist.filter(i => i.status === 'na');
  const dateStr    = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('he-IL') : '—';
  const typeLabel  = visit.visit_type === 'supervision' ? '📋 פיקוח' : '🔧 התקנות';

  return (
    <div className="space-y-4 pb-6" dir="rtl">
      <Card className="border-r-4 border-r-[#8B7355]">
        <CardContent className="pt-4 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-[#5A4632] text-lg">{typeLabel}</h2>
              <p className="text-sm text-gray-500">{dateStr}</p>
            </div>
            <Badge className={visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
              {visit.status === 'completed' ? 'הושלם' : 'טיוטה'}
            </Badge>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> {okItems.length} תקין</span>
            <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-4 h-4" /> {issueItems.length} ממצאים</span>
            <span className="flex items-center gap-1 text-gray-400"><MinusCircle className="w-4 h-4" /> {naItems.length} לא רלוונטי</span>
          </div>
        </CardContent>
      </Card>

      {issueItems.length > 0 && (
        <Card>
          <CardContent className="pt-3">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">⚠️ ממצאי צ'קליסט</h3>
            <div className="space-y-2">
              {issueItems.map(item => (
                <div key={item.id} className="bg-red-50 rounded-xl px-3 py-2">
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                  {item.photo_url && <img src={item.photo_url} alt="" className="mt-1.5 w-full max-h-32 object-cover rounded-lg" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Card>
          <CardContent className="pt-3">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">🔍 ממצאים ({findings.length})</h3>
            <div className="space-y-2">
              {findings.map((f, i) => (
                <div key={f.id} className="border border-gray-100 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-300">#{f.finding_number || i + 1}</span>
                    <Badge className={`text-xs ${SEV_COLORS[f.severity] || SEV_COLORS.medium}`}>{f.severity === 'low' ? 'נמוך' : f.severity === 'high' ? 'גבוה' : 'בינוני'}</Badge>
                    <span className="text-xs text-gray-500">{CATEGORY_LABELS[f.category] || f.category}</span>
                  </div>
                  <p className="text-sm text-gray-800">{f.description}</p>
                  {f.location && <p className="text-xs text-gray-400">📍 {f.location}</p>}
                  {f.photo_url && <img src={f.photo_url} alt="" className="mt-2 w-full max-h-32 object-cover rounded-lg" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(visit.attendees || visit.decisions || visit.next_steps) && (
        <Card>
          <CardContent className="pt-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">📝 סיכום ביקור</h3>
            {visit.attendees && <div><p className="text-xs text-gray-400 mb-0.5">נוכחים</p><p className="text-sm text-gray-700">{visit.attendees}</p></div>}
            {visit.decisions && <div><p className="text-xs text-gray-400 mb-0.5">מה סוכם</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.decisions}</p></div>}
            {visit.next_steps && <div><p className="text-xs text-gray-400 mb-0.5">צעדים הבאים</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.next_steps}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Client feedback */}
      {(visit.client_reaction && visit.client_reaction !== 'none') || visit.client_comment ? (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="pt-3 space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">💬 תגובת הלקוח</h3>
            {visit.client_reaction && visit.client_reaction !== 'none' && (
              <p className="text-sm">
                {visit.client_reaction === 'love' ? '❤️ מעולה!' : visit.client_reaction === 'like' ? '👍 טוב' : visit.client_reaction === 'neutral' ? '😐 לא בטוח/ה' : '👎 יש בעיה'}
              </p>
            )}
            {visit.client_comment && <p className="text-sm text-gray-700">{visit.client_comment}</p>}
            {visit.staff_reply && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                <span className="font-medium text-amber-800">מיכל: </span>
                <span className="text-amber-700">{visit.staff_reply}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Staff reply input */}
      <StaffReplyInput visit={visit} visitId={visitId} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['field-visit-detail', visitId] })} />

      <Card className="border-[#8B7355]/20 bg-[#FAF8F5]">
        <CardContent className="pt-4 pb-4">
          {visit.report_pdf_url ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">✅ דוח נשלח{visit.report_sent_at ? ' ' + new Date(visit.report_sent_at).toLocaleDateString('he-IL') : ''}{visit.report_sent_to ? ' → ' + visit.report_sent_to : ''}</p>
              <div className="grid grid-cols-2 gap-2">
                <a href={visit.report_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-sm border border-[#8B7355] text-[#8B7355] rounded-xl py-2.5">
                  <Download className="w-4 h-4" /> צפה ב-PDF
                </a>
                <Button onClick={handleSendReport} disabled={sending} variant="outline" className="text-sm border-[#8B7355] text-[#8B7355]">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1" />}שלח שוב
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              {sending || previewing ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8B7355]" />
                  <p className="text-sm text-gray-500">{previewing ? 'מכין תצוגה מקדימה...' : 'מכין את הדוח...'}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-2">הדוח יישלח ללקוח במייל כ-PDF</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handlePreviewReport} variant="outline" className="border-[#8B7355] text-[#8B7355] h-12">
                      <Eye className="w-4 h-4 ml-1" /> תצוגה מקדימה
                    </Button>
                    <Button onClick={handleSendReport} className="bg-[#8B7355] hover:bg-[#7a6548] text-white h-12">
                      <Send className="w-4 h-4 ml-1" /> שלח דוח
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {onEdit && (
        <Button onClick={onEdit} variant="ghost" className="w-full text-gray-400 text-sm">✏️ ערוך ביקור</Button>
      )}
      {onDelete && (
        <Button
          onClick={async () => {
            if (!confirm('למחוק ביקור זה לצמיתות?')) return;
            setDeleting(true);
            try {
              await base44.entities.FieldVisit.delete(visitId);
              toast.success('הביקור נמחק');
              onDelete();
            } catch {
              toast.error('שגיאה במחיקה');
            } finally {
              setDeleting(false);
            }
          }}
          disabled={deleting}
          variant="ghost"
          className="w-full text-red-400 hover:text-red-600 text-sm"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
          🗑️ מחק ביקור
        </Button>
      )}
    </div>
  );
}