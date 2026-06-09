import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderKanban, Phone, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const columns = [
  { id: 'lead', label: 'ליד' },
  { id: 'qualified', label: 'מתעניין' },

  { id: 'proposal_presented', label: 'הוגשה בפגישה' },
  { id: 'proposal_sent', label: 'הצעה נשלחה' },
  { id: 'proposal_approved', label: 'הצעה אושרה' },
  { id: 'active_client', label: 'לקוח פעיל' },
  { id: 'completed_client', label: 'הושלם' },
  { id: 'archived', label: 'ארכיון' },
];

export default function Pipeline() {
  const { user, isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('הלקוח נמחק');
    },
  });

  const filtered = clients
    .filter(c => isAdmin || c.owner === user?.email)
    .filter(c => sourceFilter === 'all' || c.source === sourceFilter)
    .filter(c => interestFilter === 'all' || c.interest_level === interestFilter)
    .filter(c => !search || c.name?.includes(search) || c.phone?.includes(search) || c.email?.includes(search));

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="מסע הלקוח — Kanban" />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם, טלפון, אימייל..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המקורות</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="referral">הפנייה</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="website">אתר</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>
        <Select value={interestFilter} onValueChange={setInterestFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל רמות העניין</SelectItem>
            <SelectItem value="hot">חם</SelectItem>
            <SelectItem value="warm">חמים</SelectItem>
            <SelectItem value="cold">קר</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
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
                  <div
                    key={client.id}
                    className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <Link to={`/clients/${client.id}`} className="font-medium text-sm text-primary hover:underline">
                        {client.name}
                      </Link>
                      {isAdmin && <DeleteButton onDelete={() => deleteMutation.mutate(client.id)} entityLabel="לקוח" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {client.source && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{client.source}</span>
                      )}
                      {client.interest_level && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${client.interest_level === 'hot' ? 'bg-red-100 text-red-700' : client.interest_level === 'warm' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {client.interest_level === 'hot' ? 'חם' : client.interest_level === 'warm' ? 'חמים' : 'קר'}
                        </span>
                      )}
                    </div>
                    {client.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {client.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
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