import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const typeLabels = {
  whatsapp: 'WhatsApp', email: 'אימייל', call: 'שיחה', meeting: 'פגישה',
  note: 'הערה', system_error: 'שגיאת מערכת', portal_activity: 'פעילות פורטל'
};

export default function CommunicationsTable({ communications, clientMap, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right w-8"></TableHead>
              <TableHead className="text-right">סוג</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">תוכן</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {communications.map(c => {
              const client = clientMap[c.client_id];
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.direction === 'inbound'
                      ? <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                      : <ArrowUpRight className="w-4 h-4 text-green-500" />
                    }
                  </TableCell>
                  <TableCell className="font-medium text-xs">{typeLabels[c.type] || c.type}</TableCell>
                  <TableCell>{client?.name || '—'}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">{c.content}</TableCell>
                  <TableCell>{c.status && <StatusBadge status={c.status} />}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.created_date ? format(new Date(c.created_date), 'dd/MM HH:mm') : '—'}
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