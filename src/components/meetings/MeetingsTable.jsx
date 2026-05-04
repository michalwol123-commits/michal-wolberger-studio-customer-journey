import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const typeLabels = {
  intro: 'היכרות', qualifying: 'אפיון', stage_review: 'סקירת שלב',
  site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function MeetingsTable({ meetings, clientMap, onEdit }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">תאריך</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">שעה</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">משך</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">מיקום</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map(m => {
              const client = clientMap[m.client_id];
              return (
                <tr
                  key={m.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onEdit?.(m)}
                >
                  <td className="px-4 py-3 font-medium">{typeLabels[m.type] || m.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3">{m.scheduled_at ? format(new Date(m.scheduled_at), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{m.scheduled_at ? format(new Date(m.scheduled_at), 'HH:mm') : '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{m.duration} דק׳</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">{m.location || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}