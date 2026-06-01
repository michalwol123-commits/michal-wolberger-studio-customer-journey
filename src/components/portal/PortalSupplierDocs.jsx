import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function PortalSupplierDocs({ project }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['portal-supplier-docs', project.id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ project_id: project.id }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-portal'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const quotes = orders.filter(o => o.status === 'sent');
  const confirmed = orders.filter(o => o.status === 'confirmed');

  if (quotes.length === 0 && confirmed.length === 0) return null;

  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  const renderItem = (order, showBadge) => (
    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{order.description || order.category || 'מסמך ספק'}</p>
          <p className="text-xs text-muted-foreground">
            {supplierName(order.supplier_id)} • {order.category || '—'} • ₪{(order.amount || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showBadge && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> מאושר
          </span>
        )}
        {order.attachment_url && (
          <a href={order.attachment_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> צפייה
          </a>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          מסמכי ספקים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">הצעות מחיר מספקים</p>
            <div className="space-y-2">
              {quotes.map(o => renderItem(o, false))}
            </div>
          </div>
        )}
        {confirmed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">הזמנות מאושרות</p>
            <div className="space-y-2">
              {confirmed.map(o => renderItem(o, true))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}