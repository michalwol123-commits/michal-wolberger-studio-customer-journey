import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Star, Phone, Mail, Truck } from 'lucide-react';
import SupplierCategoryBadge, { categoryLabel } from '@/components/suppliers/SupplierCategoryBadge';
import AddSupplierDialog from '@/components/suppliers/AddSupplierDialog';
import SuppliersTable from '@/components/suppliers/SuppliersTable';
import ViewToggle from '@/components/shared/ViewToggle';

const PRICE_LABELS = { low: 'נמוך', mid: 'בינוני', high: 'גבוה' };

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [view, setView] = useState('cards');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 500),
  });

  const filtered = suppliers.filter(s => {
    if (!s.is_active && s.is_active !== undefined) return false;
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    if (search && !s.name.includes(search) && !s.phone?.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="ספקים" subtitle={`${filtered.length} ספקים`}>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={() => setShowAdd(true)} className="gap-1">
            <Plus className="w-4 h-4" />הוסף ספק
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או טלפון..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="קטגוריה" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            <SelectItem value="carpenter">נגר</SelectItem>
            <SelectItem value="electrician">חשמלאי</SelectItem>
            <SelectItem value="plumber">אינסטלטור</SelectItem>
            <SelectItem value="painter">צבעי</SelectItem>
            <SelectItem value="ac">מזגנים</SelectItem>
            <SelectItem value="kitchen">מטבח</SelectItem>
            <SelectItem value="flooring">ריצוף</SelectItem>
            <SelectItem value="stainless">נירוסטה</SelectItem>
            <SelectItem value="glass">זגגות</SelectItem>
            <SelectItem value="textile">טקסטיל</SelectItem>
            <SelectItem value="lighting">תאורה</SelectItem>
            <SelectItem value="contractor">קבלן</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="אין ספקים" description="הוסיפי ספק ראשון" />
      ) : view === 'table' ? (
        <SuppliersTable suppliers={filtered} onEdit={(s) => { setEditSupplier(s); setShowAdd(true); }} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditSupplier(s); setShowAdd(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <SupplierCategoryBadge category={s.category} />
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {s.phone && (
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{s.phone}</div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{s.email}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {s.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{s.rating}/5</span>
                      </div>
                    )}
                    {s.price_level && (
                      <span className="text-xs">מחיר: {PRICE_LABELS[s.price_level]}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddSupplierDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditSupplier(null); }}
        initialData={editSupplier}
      />
    </div>
  );
}