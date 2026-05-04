import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

const typeLabels = {
  whatsapp: 'WhatsApp', email: 'אימייל', call: 'שיחה', meeting: 'פגישה',
  note: 'הערה', system_error: 'שגיאת מערכת', portal_activity: 'פעילות פורטל'
};

export default function CommunicationsTable({ communications, clientMap, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-right px-4 py-3 font-medium w-8"></th>
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תוכן</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">תאריך</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {communications.map(c => {
              const client = clientMap[c.client_id];
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3">
                    {c.direction === 'inbound'
                      ? <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                      : <ArrowUpRight className="w-4 h-4 text-green-500" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-xs">{typeLabels[c.type] || c.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[250px]">{c.content}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {c.created_date ? format(new Date(c.created_date), 'dd/MM HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">{c.status && <StatusBadge status={c.status} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}