import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import ViewToggle from '@/components/shared/ViewToggle';
import CommunicationsTable from '@/components/communications/CommunicationsTable';

const typeLabels = {
  whatsapp: 'WhatsApp', email: 'אימייל', call: 'שיחה', meeting: 'פגישה',
  note: 'הערה', system_error: 'שגיאת מערכת', portal_activity: 'פעילות פורטל'
};

export default function Communications() {
  const { user, isAdmin } = useCurrentUser();
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards');

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.Communication.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  const filtered = communications
    .filter(c => {
      if (!isAdmin && c.type === 'system_error') return false;
      if (!isAdmin) {
        const client = clientMap[c.client_id];
        if (!client || client.owner !== user?.email) return false;
      }
      return true;
    })
    .filter(c => typeFilter === 'all' || c.type === typeFilter)
    .filter(c => !search || c.content?.includes(search) || clientMap[c.client_id]?.name?.includes(search));

  return (
    <div>
      <PageHeader title="תקשורת" subtitle="לוג הודעות ותקשורת">
        <ViewToggle view={view} onViewChange={setView} />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש בתוכן..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">אימייל</SelectItem>
            <SelectItem value="call">שיחה</SelectItem>
            <SelectItem value="meeting">פגישה</SelectItem>
            <SelectItem value="note">הערה</SelectItem>
            {isAdmin && <SelectItem value="system_error">שגיאת מערכת</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="אין תקשורת" />
      ) : view === 'table' ? (
        <CommunicationsTable communications={filtered} clientMap={clientMap} isAdmin={isAdmin} />
      ) : (
        <div className="space-y-2">
          {filtered.map(comm => {
            const client = clientMap[comm.client_id];
            return (
              <Card key={comm.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {comm.direction === 'inbound' 
                        ? <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                        : <ArrowUpRight className="w-4 h-4 text-green-500" />
                      }
                      <span className="text-xs font-medium">{typeLabels[comm.type] || comm.type}</span>
                      {comm.status && <StatusBadge status={comm.status} />}
                      {client && <span className="text-xs text-muted-foreground">• {client.name}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {comm.created_date ? format(new Date(comm.created_date), 'dd/MM HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-sm">{comm.content}</p>
                  {isAdmin && comm.error_detail && (
                    <p className="text-xs text-destructive mt-1">שגיאה: {comm.error_detail}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}