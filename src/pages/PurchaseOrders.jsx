import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import AddPurchaseOrderDialog from '@/components/purchases/AddPurchaseOrderDialog';

const statusOptions = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלח' },
  { value: 'confirmed', label: 'אושר' },
  { value: 'delivered', label: 'סופק' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function PurchaseOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 500),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';
  const projectName = (id) => projects.find(p => p.id === id)?.name || '—';

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const sName = supplierName(o.supplier_id).toLowerCase();
      const pName = projectName(o.project_id).toLowerCase();
      return (o.description || '').toLowerCase().includes(q) || sName.includes(q) || pName.includes(q);
    }
    return true;
  });

  const totalActive = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div>
      <PageHeader title="הזמנות רכש" subtitle={`סה״כ פעיל: ₪${totalActive.toLocaleString()}`}>
        <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }} className="gap-1">
          <Plus className="w-4 h-4" />הזמנה חדשה
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי תיאור, ספק, פרויקט..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="אין הזמנות רכש" description="הוסיפי הזמנת רכש ראשונה" />
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {projectName(order.project_id)} • {supplierName(order.supplier_id)} • {order.category || '—'} • ₪{(order.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_date && `הזמנה: ${format(new Date(order.order_date), 'dd/MM/yyyy')}`}
                      {order.delivery_date && ` • אספקה: ${format(new Date(order.delivery_date), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(order); setShowDialog(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(order.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddPurchaseOrderDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        initialData={editing}
      />
    </div>
  );
}