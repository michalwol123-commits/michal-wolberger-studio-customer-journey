import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const priorityLabels = { low: 'נמוך', normal: 'רגיל', high: 'גבוה', urgent: 'דחוף' };
const priorityColors = { low: 'text-gray-500', normal: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };

export default function TasksTable({ tasks, clientMap, onStatusChange }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">משימה</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">עדיפות</TableHead>
              <TableHead className="text-right">תאריך יעד</TableHead>
              <TableHead className="text-right">אחראי</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right w-16">פעולה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(t => {
              const client = clientMap[t.client_id];
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{client?.name || '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${priorityColors[t.priority] || ''}`}>
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                  </TableCell>
                  <TableCell>{t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-xs">{t.assigned_to || '—'}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell>
                    {t.status === 'open' && (
                      <button onClick={() => onStatusChange(t.id, 'in_progress')} className="text-xs text-primary hover:underline">התחל</button>
                    )}
                    {t.status === 'in_progress' && (
                      <button onClick={() => onStatusChange(t.id, 'done')} className="text-xs text-green-600 hover:underline">סיים</button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}