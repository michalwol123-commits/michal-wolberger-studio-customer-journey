import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

const priorityLabels = { low: 'נמוך', normal: 'רגיל', high: 'גבוה', urgent: 'דחוף' };
const priorityColors = { low: 'text-gray-500', normal: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };

export default function TasksTable({ tasks, clientMap, onStatusChange, onDelete, selectedIds, onToggleSelect, onToggleAll, isAdmin, onPrepareQuote }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds?.length === tasks.length && tasks.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium">משימה</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">תאריך יעד</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">עדיפות</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">אחראי</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => {
              const client = clientMap[t.client_id];
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds?.includes(t.id)} onCheckedChange={() => onToggleSelect(t.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{client?.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium ${priorityColors[t.priority] || ''}`}>
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{t.assigned_to || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-2 text-xs flex items-center gap-1">
                    {t.status === 'open' && t.title?.includes('הצעת מחיר') && t.client_id && onPrepareQuote && (
                      <button onClick={() => onPrepareQuote(t.client_id)} className="text-accent hover:underline">הכן</button>
                    )}
                    {t.status === 'open' && (
                      <button onClick={() => onStatusChange(t.id, 'in_progress')} className="text-primary hover:underline">התחל</button>
                    )}
                    {t.status === 'in_progress' && (
                      <button onClick={() => onStatusChange(t.id, 'done')} className="text-green-600 hover:underline">סיים</button>
                    )}
                    {isAdmin && <DeleteButton onDelete={() => onDelete(t.id)} entityLabel="משימה" />}
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