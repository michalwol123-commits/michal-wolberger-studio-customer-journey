import React from 'react';
import SupplierCategoryBadge from './SupplierCategoryBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Star, Percent, Pencil } from 'lucide-react';

const PRICE_LABELS = { low: 'נמוך', mid: 'בינוני', high: 'גבוה' };

export default function SuppliersTable({ suppliers, onEdit, onDelete, commissionsBySupplier, selectedIds = [], onToggleSelect, onToggleAll, isAdmin }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds.length === suppliers.length && suppliers.length > 0} onCheckedChange={onToggleAll} />
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">טלפון</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">דירוג</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">עמלה %</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">צפוי</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">התקבל</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">ממתין</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => {
              const agg = commissionsBySupplier?.[s.id] || { expected: 0, received: 0, pending: 0 };
              return (
                <tr
                  key={s.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => onToggleSelect?.(s.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3"><SupplierCategoryBadge category={s.category} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground" dir="ltr">{s.phone || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {s.rating ? (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{s.rating}/5
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{s.commission_rate ? `${s.commission_rate}%` : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{agg.expected > 0 ? `₪${agg.expected.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-green-600">{agg.received > 0 ? `₪${agg.received.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-amber-600">{agg.pending > 0 ? `₪${agg.pending.toLocaleString()}` : '—'}</td>
                  <td className="px-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && <DeleteButton onDelete={() => onDelete?.(s.id)} entityLabel="ספק" />}
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