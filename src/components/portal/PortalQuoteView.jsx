import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import ArtIcon from './ArtIcon';

const packageLabels = { basic: 'בסיסי', mid: 'ביניים', premium: 'פרימיום' };

const quoteStatusStyle = {
  approved: { color: '#6b7a4f', label: 'מאושרת' },
  sent: { color: '#8a7060', label: 'נשלחה' },
  sent_for_signature: { color: '#4a3728', label: 'ממתינה לחתימה' },
  contract_sent_for_signature: { color: '#4a3728', label: 'הסכם לחתימה' },
};

export default function PortalQuoteView({ projectId, clientId, stageNum }) {
  const { data: quotes = [] } = useQuery({
    queryKey: ['portal-quotes', clientId],
    queryFn: () => base44.entities.Quote.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  // Stage 3: show all sent/viewed quotes (not drafts)
  // Stage 4: show only approved quote
  const visibleQuotes = stageNum === 4
    ? quotes.filter(q => q.status === 'approved')
    : quotes.filter(q => ['sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved'].includes(q.status));

  if (visibleQuotes.length === 0) return null;

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="doc" size={48} />
        <div>
          <p className="p-label mb-0.5">ההשקעה שלך</p>
          <h3 className="p-display text-lg">{stageNum === 4 ? 'ההצעה שנבחרה' : 'הצעות מחיר'}</h3>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {visibleQuotes.map(q => {
          const st = quoteStatusStyle[q.status] || { color: '#8a7060', label: q.status };
          return (
            <div
              key={q.id}
              className="flex items-center justify-between gap-4 p-4 transition-colors"
              style={{ border: '1px solid #e8e0d8' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: '#2a1f18' }}>{q.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1" style={{ color: '#8a7060' }}>
                  <span className="p-display text-base" style={{ color: '#2a1f18' }}>₪{q.total_amount?.toLocaleString()}</span>
                  {q.package_type && <span>· חבילת {packageLabels[q.package_type] || q.package_type}</span>}
                  {q.approved_at && (
                    <span>· אושרה {format(new Date(q.approved_at), 'dd/MM/yyyy')}</span>
                  )}
                </div>
                {q.scope && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#8a7060' }}>{q.scope}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="p-label !text-[10px] px-2.5 py-1" style={{ border: `1px solid ${st.color}`, color: st.color }}>
                  {st.label}
                </span>
                {(q.file_url || q.url) && (
                  <a
                    href={q.file_url || q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                    style={{ color: '#4a3728' }}
                  >
                    לצפייה ←
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}