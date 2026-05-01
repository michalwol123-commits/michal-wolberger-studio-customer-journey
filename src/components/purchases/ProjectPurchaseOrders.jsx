import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import AddPurchaseOrderDialog from './AddPurchaseOrderDialog';
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectPurchaseOrders({ projectId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ project_id: projectId }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  const sorted = [...orders].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalAmount = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? (o.amount || 0) : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">סה״כ: ₪{totalAmount.toLocaleString()} ({orders.length} הזמנות)</p>
        <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }} className="gap-1">
          <Plus className="w-4 h-4" />הזמנה חדשה
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="אין הזמנות רכש" description="הוסיפי הזמנת רכש ראשונה" />
      ) : (
        <div className="space-y-2">
          {sorted.map(order => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {supplierName(order.supplier_id)} • {order.category || '—'} • ₪{(order.amount || 0).toLocaleString()}
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
        projectId={projectId}
      />
    </div>
  );
}