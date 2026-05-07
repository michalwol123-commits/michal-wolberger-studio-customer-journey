import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, UserPlus, Pencil } from 'lucide-react';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import AddClientDialog from '@/components/clients/AddClientDialog';
import { toast } from 'sonner';

export default function Leads() {
  const { user, isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Client.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedIds([]);
      toast.success('הלידים נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === leads.length ? [] : leads.map(l => l.id));

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const leads = clients
    .filter(c => ['lead', 'qualified', 'proposal_sent'].includes(c.status))
    .filter(c => isAdmin || c.assigned_to === user?.email || c.owner === user?.email)
    .filter(c => !search || c.name?.includes(search) || c.phone?.includes(search) || c.email?.includes(search));

  return (
    <div>
      <PageHeader title="לידים" subtitle={`${leads.length} לידים פעילים`}>
        <ExportCSVButton
          data={leads}
          columns={[
            { key: 'name', label: 'שם' },
            { key: 'phone', label: 'טלפון' },
            { key: 'source', label: 'מקור' },
            { key: 'interest_level', label: 'רמת עניין' },
            { label: 'תאריך', format: r => r.created_date ? format(new Date(r.created_date), 'dd/MM/yyyy') : '' },
          ]}
          filename="לידים"
        />
        <Button onClick={() => { setEditLead(null); setShowAdd(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          ליד חדש
        </Button>
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

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="לידים" />}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {isAdmin && (
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={selectedIds.length === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
                  </th>
                )}
                <th className="text-right px-4 py-3 font-medium">שם</th>
                <th className="text-right px-4 py-3 font-medium">טלפון</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">מקור</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תאריך</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link to={`/clients/${lead.id}`} className="font-medium text-primary hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">{lead.phone}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {lead.source && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{lead.source}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditLead(lead); setShowAdd(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && <DeleteButton onDelete={() => deleteMutation.mutate(lead.id)} entityLabel="ליד" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && <EmptyState icon={UserPlus} title="אין לידים" description="הוסיפי ליד חדש כדי להתחיל" />}
      </div>

      <AddClientDialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) setEditLead(null); }} defaultStatus="lead" initialData={editLead} />
    </div>
  );
}