import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseOrdersTable({ orders, supplierName, projectName, onEdit, onDelete }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">תיאור</TableHead>
              <TableHead className="text-right">פרויקט</TableHead>
              <TableHead className="text-right">ספק</TableHead>
              <TableHead className="text-right">סכום</TableHead>
              <TableHead className="text-right hidden sm:table-cell">תאריך הזמנה</TableHead>
              <TableHead className="text-right hidden md:table-cell">אספקה</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{o.description}</TableCell>
                <TableCell>{projectName(o.project_id)}</TableCell>
                <TableCell>{supplierName(o.supplier_id)}</TableCell>
                <TableCell>₪{(o.amount || 0).toLocaleString()}</TableCell>
                <TableCell className="hidden sm:table-cell">{o.order_date ? format(new Date(o.order_date), 'dd/MM/yyyy') : '—'}</TableCell>
                <TableCell className="hidden md:table-cell">{o.delivery_date ? format(new Date(o.delivery_date), 'dd/MM/yyyy') : '—'}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(o)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(o.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}