import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddClientDialog from '@/components/clients/AddClientDialog';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const activeStatuses = ['proposal_approved', 'active_client', 'completed_client'];

export default function Clients() {
  const { user, isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editClient, setEditClient] = useState(null);
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
      toast.success('הלקוחות נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(c => c.id));

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const filtered = clients
    .filter(c => activeStatuses.includes(c.status))
    .filter(c => isAdmin || c.owner === user?.email)
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => !search || c.name?.includes(search) || c.phone?.includes(search) || c.email?.includes(search));

  return (
    <div>
      <PageHeader title="לקוחות" subtitle={`${filtered.length} לקוחות`}>
        <ExportCSVButton
          data={filtered}
          columns={[
            { key: 'name', label: 'שם' },
            { key: 'phone', label: 'טלפון' },
            { key: 'email', label: 'אימייל' },
            { key: 'status', label: 'סטטוס' },
            { key: 'source', label: 'מקור' },
          ]}
          filename="לקוחות"
        />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="proposal_approved">הצעה אושרה</SelectItem>
            <SelectItem value="active_client">לקוח פעיל</SelectItem>
            <SelectItem value="completed_client">הושלם</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="לקוחות" />}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {isAdmin && (
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  </th>
                )}
                <th className="text-right px-4 py-3 font-medium">שם</th>
                <th className="text-right px-4 py-3 font-medium">טלפון</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">אימייל</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">מקור</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.includes(client.id)} onCheckedChange={() => toggleSelect(client.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link to={`/clients/${client.id}`} className="font-medium text-primary hover:underline">{client.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">{client.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell" dir="ltr">{client.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {client.source && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{client.source}</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                  <td className="px-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditClient(client); setShowEdit(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && <DeleteButton onDelete={() => deleteMutation.mutate(client.id)} entityLabel="לקוח" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={Users} title="אין לקוחות" />}
      </div>
      <AddClientDialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditClient(null); }} initialData={editClient} />
    </div>
  );
}