import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import AddClientDialog from '@/components/clients/AddClientDialog';
import ViewToggle from '@/components/shared/ViewToggle';
import { Card, CardContent } from '@/components/ui/card';

export default function Leads() {
  const { user, isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState('table');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const leads = clients
    .filter(c => c.status === 'lead')
    .filter(c => isAdmin || c.assigned_to === user?.email || c.owner === user?.email)
    .filter(c => !search || c.name?.includes(search) || c.phone?.includes(search) || c.email?.includes(search));

  return (
    <div>
      <PageHeader title="לידים" subtitle={`${leads.length} לידים פעילים`}>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            ליד חדש
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {view === 'cards' ? (
        leads.length === 0 ? (
          <EmptyState icon={UserPlus} title="אין לידים" description="הוסיפי ליד חדש כדי להתחיל" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {leads.map(lead => (
              <Link key={lead.id} to={`/clients/${lead.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{lead.name}</h3>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p dir="ltr">{lead.phone}</p>
                      {lead.source && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{lead.source}</span>}
                      {lead.created_date && <p className="text-xs">{format(new Date(lead.created_date), 'dd/MM/yyyy')}</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">מקור</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${lead.id}`} className="font-medium text-primary hover:underline">{lead.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">{lead.phone}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {lead.source && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{lead.source}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leads.length === 0 && <EmptyState icon={UserPlus} title="אין לידים" description="הוסיפי ליד חדש כדי להתחיל" />}
        </div>
      )}

      <AddClientDialog open={showAdd} onOpenChange={setShowAdd} defaultStatus="lead" />
    </div>
  );
}