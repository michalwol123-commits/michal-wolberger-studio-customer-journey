import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import ArtIcon from './ArtIcon';

const VISIT_TYPE_LABELS = {
  supervision: 'דוח פיקוח',
  installation: 'דוח התקנות',
};

const REACTIONS = [
  { value: 'love', label: 'מעולה!' },
  { value: 'like', label: 'טוב' },
  { value: 'neutral', label: 'לא בטוח/ה' },
  { value: 'dislike', label: 'יש בעיה' },
];

const SEV_COLORS = {
  low: { border: '1px solid #c8bdb2', color: '#8a7060' },
  medium: { border: '1px solid #8a7060', color: '#8a7060' },
  high: { border: '1px solid #8a5a4a', color: '#8a5a4a' },
};
const SEV_LABELS = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };
const CAT_LABELS = {
  structure: 'בנייה', finishing: 'גמרים', electrical: 'חשמל',
  plumbing: 'אינסטלציה', carpentry: 'נגרות', other: 'אחר',
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
    <div className="p-card" dir="rtl">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="camera" size={48} />
        <div>
          <p className="p-label mb-0.5">מהשטח</p>
          <h3 className="p-display text-lg">
            {visitTypeFilter === 'installation' ? 'דוחות התקנות' : visitTypeFilter === 'supervision' ? 'דוחות פיקוח' : 'דוחות ביקור שטח'}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {completed.map(visit => {
          const checklist = (() => { try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; } })();
          const okCount = checklist.filter(i => i.status === 'ok').length;
          const issueItems = checklist.filter(i => i.status === 'issue');
          const dateStr = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('he-IL') : '—';
          const isExpanded = expandedId === visit.id;
          const commentVal = commentMap[visit.id] ?? visit.client_comment ?? '';

          return (
            <div key={visit.id} className="overflow-hidden" style={{ border: '1px solid #e8e0d8', borderRightWidth: 3, borderRightColor: '#c8bdb2' }}>
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#2a1f18' }}>{VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}</p>
                    <p className="p-label !text-[10px] mt-1">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {visit.report_pdf_url && (
                      <a href={visit.report_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="p-btn text-xs !py-1.5 !px-4">
                        PDF <span className="p-arrow">←</span>
                      </a>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                      className="p-1.5 text-xs transition-transform"
                      style={{ color: '#8a7060', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                      ←
                    </button>
                  </div>
                </div>

                {/* Summary counts */}
                {checklist.length > 0 && (
                  <div className="flex gap-4 mt-3 text-xs">
                    <span style={{ color: '#6b7a4f' }}>{okCount} תקין</span>
                    {issueItems.length > 0 && <span style={{ color: '#8a5a4a' }}>{issueItems.length} ממצאים</span>}
                  </div>
                )}

                {/* Staff reply */}
                {visit.staff_reply && (
                  <div className="mt-3 p-3 text-xs" style={{ background: '#f0ebe4', border: '1px solid #e0d8ce' }}>
                    <span className="font-medium" style={{ color: '#2a1f18' }}>מיכל: </span>
                    <span style={{ color: '#4a3728' }}>{visit.staff_reply}</span>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 space-y-5" style={{ borderTop: '1px solid #e8e0d8' }}>
                    {/* Checklist issues */}
                    {issueItems.length > 0 && (
                      <div>
                        <p className="p-label !text-[10px] mb-2">ממצאי צ'קליסט</p>
                        <div className="space-y-2">
                          {issueItems.map(item => (
                            <div key={item.id} className="px-3 py-2.5" style={{ background: '#f0ebe4', borderRight: '2px solid #8a5a4a' }}>
                              <p className="text-sm font-medium" style={{ color: '#2a1f18' }}>{item.label}</p>
                              {item.note && <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>{item.note}</p>}
                              {item.photo_url && <img src={item.photo_url} alt="" className="mt-2 w-full max-h-40 object-cover" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formal findings */}
                    {findings.length > 0 && (
                      <div>
                        <p className="p-label !text-[10px] mb-2">ממצאים ({findings.length})</p>
                        <div className="space-y-2">
                          {findings.map((f, i) => (
                            <div key={f.id} className="px-3 py-2.5" style={{ border: '1px solid #e8e0d8' }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs" style={{ color: '#c8bdb2' }}>#{f.finding_number || i + 1}</span>
                                <span className="p-label !text-[10px] px-2 py-0.5" style={SEV_COLORS[f.severity] || SEV_COLORS.medium}>
                                  {SEV_LABELS[f.severity] || f.severity}
                                </span>
                                <span className="text-xs" style={{ color: '#8a7060' }}>{CAT_LABELS[f.category] || f.category}</span>
                              </div>
                              <p className="text-sm" style={{ color: '#2a1f18' }}>{f.description}</p>
                              {f.location && <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>{f.location}</p>}
                              {f.photo_url && <img src={f.photo_url} alt="" className="mt-2 w-full max-h-40 object-cover" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meeting summary */}
                    {(visit.attendees || visit.decisions || visit.next_steps || visit.general_notes) && (
                      <div>
                        <p className="p-label !text-[10px] mb-2">סיכום ביקור</p>
                        <div className="space-y-2 text-sm">
                          {visit.attendees && <div><span className="text-xs" style={{ color: '#8a7060' }}>נוכחים: </span><span style={{ color: '#4a3728' }}>{visit.attendees}</span></div>}
                          {visit.decisions && <div><span className="text-xs" style={{ color: '#8a7060' }}>מה סוכם: </span><span className="whitespace-pre-wrap" style={{ color: '#4a3728' }}>{visit.decisions}</span></div>}
                          {visit.next_steps && <div><span className="text-xs" style={{ color: '#8a7060' }}>צעדים הבאים: </span><span className="whitespace-pre-wrap" style={{ color: '#4a3728' }}>{visit.next_steps}</span></div>}
                          {visit.general_notes && <div><span className="text-xs" style={{ color: '#8a7060' }}>הערות: </span><span className="whitespace-pre-wrap" style={{ color: '#4a3728' }}>{visit.general_notes}</span></div>}
                        </div>
                      </div>
                    )}

                    {/* Client reaction */}
                    <div className="space-y-3">
                      <p className="p-label !text-[10px]">מה דעתך על הדוח?</p>
                      <div className="flex gap-2 flex-wrap">
                        {REACTIONS.map(opt => (
                          <button key={opt.value} onClick={() => handleReaction(visit, opt.value)}
                            disabled={savingId === visit.id + '_r'}
                            className="px-3.5 py-1.5 text-xs transition-all"
                            style={visit.client_reaction === opt.value
                              ? { background: '#2a1f18', border: '1px solid #2a1f18', color: '#f5f0eb' }
                              : { background: 'transparent', border: '1px solid #c8bdb2', color: '#4a3728' }}>
                            {opt.label}
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
                        <button className="p-btn-outline text-xs w-full !py-2"
                          onClick={() => handleComment(visit)} disabled={savingId === visit.id + '_c'}>
                          {savingId === visit.id + '_c' ? 'שומר...' : 'שמור הערה'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}