import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';

const packageLabels = { basic: 'בסיסי', mid: 'בינוני', premium: 'פרימיום' };

export default function QuotesTable({ quotes, clientMap, onEdit }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-right px-4 py-3 font-medium">כותרת</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">סכום</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">חבילה</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">גרסה</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תאריך</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => {
              const client = clientMap[q.client_id];
              return (
                <tr
                  key={q.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onEdit?.(q)}
                >
                  <td className="px-4 py-3 font-medium">{q.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3">₪{(q.total_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {packageLabels[q.package_type] || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">v{q.version || 1}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {q.created_date ? format(new Date(q.created_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-2">
                    {q.url && (
                      <a href={q.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}