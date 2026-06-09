import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const typeLabels = {
  whatsapp: 'WhatsApp', email: 'אימייל', call: 'שיחה', meeting: 'פגישה',
  note: 'הערה', system_error: 'שגיאת מערכת', portal_activity: 'פעילות פורטל'
};

export default function CommunicationsTable({ communications, clientMap, isAdmin, onDelete, selectedIds = [], onToggleSelect, onToggleAll }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds.length === communications.length && communications.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium w-8"></th>
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תוכן</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">תאריך</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              {isAdmin && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {communications.map(c => {
              const client = clientMap[c.client_id];
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => onToggleSelect?.(c.id)} />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    {c.direction === 'inbound'
                      ? <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                      : <ArrowUpRight className="w-4 h-4 text-green-500" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-xs">{typeLabels[c.type] || c.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[250px]">{c.content}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {c.created_date ? new Date(c.created_date).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }) : '—'}
                  </td>
                  <td className="px-4 py-3">{c.status && <StatusBadge status={c.status} />}</td>
                  {isAdmin && (
                    <td className="px-2">
                      <DeleteButton onDelete={() => onDelete?.(c.id)} entityLabel="הודעה" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}