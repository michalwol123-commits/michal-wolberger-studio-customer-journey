import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseOrdersTable({ orders, supplierName, projectName, onEdit, onDelete, selectedIds, onToggleSelect, onToggleAll, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds?.length === orders.length && orders.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium">תיאור</th>
              <th className="text-right px-4 py-3 font-medium">פרויקט</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">ספק</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium">סכום</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">אספקה</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {isAdmin && (
                  <td className="px-3 py-3">
                    <Checkbox checked={selectedIds?.includes(o.id)} onCheckedChange={() => onToggleSelect(o.id)} />
                  </td>
                )}
                <td className="px-4 py-3 font-medium">{o.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{projectName(o.project_id)}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{supplierName(o.supplier_id)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{o.category || '—'}</td>
                <td className="px-4 py-3">₪{(o.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {o.delivery_date ? format(new Date(o.delivery_date), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-2 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(o)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {isAdmin && <DeleteButton onDelete={() => onDelete(o.id)} entityLabel="הזמנה" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}