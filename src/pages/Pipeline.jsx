import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/lib/useCurrentUser';
import { FolderKanban, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const columns = [
  { id: 'lead', label: 'ליד' },
  { id: 'qualified', label: 'מתעניין' },
  { id: 'proposal_sent', label: 'הצעה נשלחה' },
  { id: 'proposal_approved', label: 'הצעה אושרה' },
  { id: 'active_client', label: 'לקוח פעיל' },
  { id: 'completed_client', label: 'הושלם' },
  { id: 'archived', label: 'ארכיון' },
];

export default function Pipeline() {
  const { user, isAdmin } = useCurrentUser();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const filtered = isAdmin ? clients : clients.filter(c => c.owner === user?.email);

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="מסע הלקוח — Kanban" />
      
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colClients = filtered.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="min-w-[260px] w-[260px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold font-heading">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {colClients.length}
                </span>
              </div>
              <div className="space-y-2">
                {colClients.map(client => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="block bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium text-sm mb-1">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                    </div>
                    {client.source && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{client.source}</span>
                    )}
                    {client.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {client.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
                {colClients.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    אין לקוחות
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}