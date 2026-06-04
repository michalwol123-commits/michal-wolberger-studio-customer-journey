import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle, AlertCircle, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const VISIT_TYPE_LABELS = {
  supervision: '📋 דוח פיקוח',
  installation: '🔧 דוח התקנות',
};

const REACTIONS = [
  { value: 'love', emoji: '❤️', label: 'מעולה!' },
  { value: 'like', emoji: '👍', label: 'טוב' },
  { value: 'neutral', emoji: '😐', label: 'לא בטוח/ה' },
  { value: 'dislike', emoji: '👎', label: 'יש בעיה' },
];

const SEV_COLORS = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};
const SEV_LABELS = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };
const CAT_LABELS = {
  structure: '🧱 בנייה', finishing: '🎨 גמרים', electrical: '⚡ חשמל',
  plumbing: '🔧 אינסטלציה', carpentry: '🪵 נגרות', other: '📌 אחר',
};

export default function PortalFieldVisits({ project, visitTypeFilter }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [commentMap, setCommentMap] = useState({});
  const [savingId, setSavingId] = useState(null);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['portal-field-visits', project.id],
    queryFn: () => base44.entities.FieldVisit.filter({ project_id: project.id }),
  });

  // Filter by visit type if specified, and only completed visits
  const completed = visits
    .filter(v => v.status === 'completed')
    .filter(v => !visitTypeFilter || v.visit_type === visitTypeFilter)
    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));

  // Fetch findings for expanded visit
  const { data: findings = [] } = useQuery({
    queryKey: ['portal-findings', expandedId],
    queryFn: () => base44.entities.FieldFinding.filter({ field_visit_id: expandedId }),
    enabled: !!expandedId,
  });

  const handleReaction = async (visit, reaction) => {
    setSavingId(visit.id + '_r');
    await base44.entities.FieldVisit.update(visit.id, {
      client_reaction: visit.client_reaction === reaction ? 'none' : reaction,
    });
    queryClient.invalidateQueries({ queryKey: ['portal-field-visits', project.id] });
    setSavingId(null);
  };

  const handleComment = async (visit) => {
    setSavingId(visit.id + '_c');
    await base44.entities.FieldVisit.update(visit.id, {
      client_comment: commentMap[visit.id] ?? '',
    });
    queryClient.invalidateQueries({ queryKey: ['portal-field-visits', project.id] });
    setSavingId(null);
  };

  if (isLoading || completed.length === 0) return null;

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-[#8B7355]" />
        {visitTypeFilter === 'installation' ? 'דוחות התקנות' : visitTypeFilter === 'supervision' ? 'דוחות פיקוח' : 'דוחות ביקור שטח'}
      </h3>

      {completed.map(visit => {
        const checklist = (() => { try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; } })();
        const okCount = checklist.filter(i => i.status === 'ok').length;
        const issueItems = checklist.filter(i => i.status === 'issue');
        const dateStr = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('he-IL') : '—';
        const isExpanded = expandedId === visit.id;
        const commentVal = commentMap[visit.id] ?? visit.client_comment ?? '';

        return (
          <Card key={visit.id} className="border-r-4 border-r-[#8B7355] bg-white overflow-hidden">
            <CardContent className="pt-3 pb-3 px-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm text-[#2C2C2C]">{VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {dateStr}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {visit.report_pdf_url && (
                    <a href={visit.report_pdf_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs bg-[#8B7355] text-white px-3 py-1.5 rounded-xl hover:bg-[#7a6548] transition-colors">
                      <Download className="w-3 h-3" /> PDF
                    </a>
                  )}
                  <button onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                    className="p-1 text-gray-400 hover:text-gray-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Summary counts */}
              {checklist.length > 0 && (
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {okCount} תקין</span>
                  {issueItems.length > 0 && <span className="flex items-center gap-1 text-orange-500"><AlertCircle className="w-3 h-3" /> {issueItems.length} ממצאים</span>}
                </div>
              )}

              {/* Staff reply */}
              {visit.staff_reply && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                  <span className="font-medium text-amber-800">מיכל: </span>
                  <span className="text-amber-700">{visit.staff_reply}</span>
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
                  {/* Checklist issues */}
                  {issueItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">⚠️ ממצאי צ'קליסט</p>
                      <div className="space-y-2">
                        {issueItems.map(item => (
                          <div key={item.id} className="bg-red-50 rounded-xl px-3 py-2">
                            <p className="text-sm font-medium text-gray-800">{item.label}</p>
                            {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                            {item.photo_url && <img src={item.photo_url} alt="" className="mt-1.5 w-full max-h-40 object-cover rounded-lg" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formal findings */}
                  {findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">🔍 ממצאים ({findings.length})</p>
                      <div className="space-y-2">
                        {findings.map((f, i) => (
                          <div key={f.id} className="border border-gray-100 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-300">#{f.finding_number || i + 1}</span>
                              <Badge className={`text-xs ${SEV_COLORS[f.severity] || SEV_COLORS.medium}`}>
                                {SEV_LABELS[f.severity] || f.severity}
                              </Badge>
                              <span className="text-xs text-gray-500">{CAT_LABELS[f.category] || f.category}</span>
                            </div>
                            <p className="text-sm text-gray-800">{f.description}</p>
                            {f.location && <p className="text-xs text-gray-400">📍 {f.location}</p>}
                            {f.photo_url && <img src={f.photo_url} alt="" className="mt-2 w-full max-h-40 object-cover rounded-lg" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meeting summary */}
                  {(visit.attendees || visit.decisions || visit.next_steps || visit.general_notes) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">📝 סיכום ביקור</p>
                      <div className="space-y-2 text-sm">
                        {visit.attendees && <div><span className="text-xs text-gray-400">נוכחים: </span><span className="text-gray-700">{visit.attendees}</span></div>}
                        {visit.decisions && <div><span className="text-xs text-gray-400">מה סוכם: </span><span className="text-gray-700 whitespace-pre-wrap">{visit.decisions}</span></div>}
                        {visit.next_steps && <div><span className="text-xs text-gray-400">צעדים הבאים: </span><span className="text-gray-700 whitespace-pre-wrap">{visit.next_steps}</span></div>}
                        {visit.general_notes && <div><span className="text-xs text-gray-400">הערות: </span><span className="text-gray-700 whitespace-pre-wrap">{visit.general_notes}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Client reaction */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">מה דעתך על הדוח?</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {REACTIONS.map(opt => (
                        <button key={opt.value} onClick={() => handleReaction(visit, opt.value)}
                          disabled={savingId === visit.id + '_r'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-all ${
                            visit.client_reaction === opt.value
                              ? 'bg-[#8B7355] border-[#8B7355] text-white scale-105'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-[#8B7355]'
                          }`}>
                          <span>{opt.emoji}</span><span>{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="הערות שלך לדוח..."
                      rows={2}
                      value={commentVal}
                      onChange={e => setCommentMap(m => ({ ...m, [visit.id]: e.target.value }))}
                      className="text-xs resize-none"
                    />
                    {commentMap[visit.id] !== undefined && commentMap[visit.id] !== (visit.client_comment ?? '') && (
                      <Button size="sm" variant="outline" className="text-xs w-full border-[#8B7355] text-[#8B7355]"
                        onClick={() => handleComment(visit)} disabled={savingId === visit.id + '_c'}>
                        {savingId === visit.id + '_c' ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                        שמור הערה
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}