import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const packageLabels = { basic: 'בסיסי', mid: 'ביניים', premium: 'פרימיום' };

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
    : quotes.filter(q => ['sent', 'sent_for_signature', 'approved'].includes(q.status));

  if (visibleQuotes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {stageNum === 4 ? 'ההצעה שנבחרה' : 'הצעות מחיר'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleQuotes.map(q => (
          <div
            key={q.id}
            className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                q.status === 'approved' ? 'bg-green-100' : 'bg-primary/10'
              }`}>
                {q.status === 'approved'
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <FileText className="w-5 h-5 text-primary" />
                }
              </div>
              <div>
                <p className="text-sm font-medium">{q.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>₪{q.total_amount?.toLocaleString()}</span>
                  {q.package_type && <span>• חבילת {packageLabels[q.package_type] || q.package_type}</span>}
                  {q.approved_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      אושרה {format(new Date(q.approved_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
                {q.scope && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.scope}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={q.status} />
              {(q.file_url || q.url) && (
                <a
                  href={q.file_url || q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}