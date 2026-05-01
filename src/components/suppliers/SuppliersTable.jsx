import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SupplierCategoryBadge from '@/components/suppliers/SupplierCategoryBadge';
import { Star } from 'lucide-react';

const PRICE_LABELS = { low: 'נמוך', mid: 'בינוני', high: 'גבוה' };

export default function SuppliersTable({ suppliers, onEdit }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">קטגוריה</TableHead>
              <TableHead className="text-right">טלפון</TableHead>
              <TableHead className="text-right hidden sm:table-cell">אימייל</TableHead>
              <TableHead className="text-right">דירוג</TableHead>
              <TableHead className="text-right">רמת מחיר</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map(s => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onEdit(s)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell><SupplierCategoryBadge category={s.category} /></TableCell>
                <TableCell dir="ltr">{s.phone || '—'}</TableCell>
                <TableCell className="hidden sm:table-cell" dir="ltr">{s.email || '—'}</TableCell>
                <TableCell>
                  {s.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{s.rating}/5
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell>{s.price_level ? PRICE_LABELS[s.price_level] : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}