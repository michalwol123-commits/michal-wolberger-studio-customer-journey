import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

const typeLabels = {
  intro: 'היכרות', qualifying: 'אפיון', stage_review: 'סקירת שלב',
  site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function MeetingsTable({ meetings, clientMap, onEdit }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">סוג</TableHead>
            <TableHead className="text-right">לקוח</TableHead>
            <TableHead className="text-right">תאריך</TableHead>
            <TableHead className="text-right hidden sm:table-cell">שעה</TableHead>
            <TableHead className="text-right hidden md:table-cell">מיקום</TableHead>
            <TableHead className="text-right">סטטוס</TableHead>
            <TableHead className="text-right w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetings.map(m => {
            const client = clientMap[m.client_id];
            return (
              <TableRow key={m.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{typeLabels[m.type] || m.type}</TableCell>
                <TableCell>{client?.name || '—'}</TableCell>
                <TableCell>{m.scheduled_at ? format(new Date(m.scheduled_at), 'dd/MM/yyyy') : '—'}</TableCell>
                <TableCell className="hidden sm:table-cell">{m.scheduled_at ? format(new Date(m.scheduled_at), 'HH:mm') : '—'}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{m.location || '—'}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}