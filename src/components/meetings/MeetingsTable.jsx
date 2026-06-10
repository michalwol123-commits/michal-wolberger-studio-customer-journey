import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const typeLabels = {
  intro: 'שיחת טלפון ראשונית', qualifying: 'אפיון', quote_presentation: 'היכרות והצגת הצעת מחיר',
  stage_review: 'סקירת שלב', site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function MeetingsTable({ meetings, clientMap, quotesMap, onEdit, onDelete, onComplete, selectedIds, onToggleSelect, onToggleAll, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds?.length === meetings.length && meetings.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">תאריך</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">שעה</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">משך</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">מיקום</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="w-20"></th>
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
                  {isAdmin && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds?.includes(m.id)} onCheckedChange={() => onToggleSelect(m.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      {typeLabels[m.type] || m.type}
                      {m.type === 'quote_presentation' && m.quote_id && quotesMap?.[m.quote_id] && (
                        <Link to="/quotes" onClick={e => e.stopPropagation()} title={`הצעה: ${quotesMap[m.quote_id].title}`}>
                          <FileText className="w-3.5 h-3.5 text-primary hover:text-primary/80" />
                        </Link>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3">{m.scheduled_at ? format(new Date(m.scheduled_at), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{m.scheduled_at ? format(new Date(m.scheduled_at), 'HH:mm') : '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{m.duration} דק׳</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">{m.location || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {m.status === 'scheduled' && onComplete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => onComplete(m)} title="סמן כהושלם">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && <DeleteButton onDelete={() => onDelete(m.id)} entityLabel="פגישה" />}
                    </div>
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