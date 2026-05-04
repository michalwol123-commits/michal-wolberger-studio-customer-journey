import React from 'react';
import SupplierCategoryBadge from './SupplierCategoryBadge';
import { Star } from 'lucide-react';

const PRICE_LABELS = { low: 'נמוך', mid: 'בינוני', high: 'גבוה' };

export default function SuppliersTable({ suppliers, onEdit }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">טלפון</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">אימייל</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">דירוג</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">רמת מחיר</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr
                key={s.id}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onEdit?.(s)}
              >
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3"><SupplierCategoryBadge category={s.category} /></td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground" dir="ltr">{s.phone || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground" dir="ltr">{s.email || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {s.rating ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{s.rating}/5
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{s.price_level ? PRICE_LABELS[s.price_level] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}