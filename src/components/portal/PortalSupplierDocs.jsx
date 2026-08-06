import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ArtIcon from './ArtIcon';

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
    <div key={order.id} className="flex items-center justify-between gap-3 p-4 transition-colors" style={{ border: '1px solid #e8e0d8' }}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#2a1f18' }}>{order.description || order.category || 'מסמך ספק'}</p>
        <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>
          {supplierName(order.supplier_id)} · {order.category || '—'} · ₪{(order.amount || 0).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showBadge && (
          <span className="p-label !text-[10px] px-2.5 py-1" style={{ border: '1px solid #6b7a4f', color: '#6b7a4f' }}>
            מאושר
          </span>
        )}
        {order.attachment_url && (
          <a href={order.attachment_url} target="_blank" rel="noopener noreferrer"
            className="text-xs underline" style={{ color: '#4a3728' }}>
            צפייה ←
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="box" size={48} floatDelay={1} />
        <div>
          <p className="p-label mb-0.5">רכש והזמנות</p>
          <h3 className="p-display text-lg">מסמכי ספקים</h3>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {quotes.length > 0 && (
          <div>
            <p className="p-label mb-2">הצעות מחיר מספקים</p>
            <div className="space-y-2">
              {quotes.map(o => renderItem(o, false))}
            </div>
          </div>
        )}
        {confirmed.length > 0 && (
          <div>
            <p className="p-label mb-2">הזמנות מאושרות</p>
            <div className="space-y-2">
              {confirmed.map(o => renderItem(o, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}