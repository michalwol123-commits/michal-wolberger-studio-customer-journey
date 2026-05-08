import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import StatsCard from '@/components/shared/StatsCard';
import useCurrentUser from '@/lib/useCurrentUser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import DeleteButton from '@/components/shared/DeleteButton';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import { CreditCard, AlertTriangle, CheckCircle, Clock, Pencil } from 'lucide-react';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import EditPaymentDialog from '@/components/payments/EditPaymentDialog';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';

export default function Payments() {
  const { isAdmin, loading } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState('all');
  const [editPayment, setEditPayment] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Payment.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setSelectedIds([]);
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(p => p.id));

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 200),
    enabled: isAdmin,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  if (!loading && !isAdmin) return <Navigate to="/" />;

  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p; });
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  const filtered = statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter);

  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_paid || 0), 0);

  return (
    <div>
      <PageHeader title="תשלומים" subtitle="מעקב תשלומים — Admin בלבד">
        <ExportCSVButton
          data={filtered}
          columns={[
            { label: 'לקוח', format: r => { const c = clientMap[r.client_id]; if (c) return c.name; const p = projectMap[r.project_id]; return p ? (clientMap[p.client_id]?.name || '') : ''; } },
            { label: 'פרויקט', format: r => projectMap[r.project_id]?.name || '' },
            { key: 'milestone', label: 'אבן דרך' },
            { key: 'amount', label: 'סכום' },
            { key: 'amount_paid', label: 'שולם' },
            { key: 'due_date', label: 'תאריך יעד' },
            { key: 'status', label: 'סטטוס' },
          ]}
          filename="תשלומים"
        />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatsCard title="ממתינים" value={`₪${totalPending.toLocaleString()}`} icon={Clock} color="warning" />
        <StatsCard title="באיחור" value={`₪${totalOverdue.toLocaleString()}`} icon={AlertTriangle} color="destructive" />
        <StatsCard title="שולם" value={`₪${totalPaid.toLocaleString()}`} icon={CheckCircle} color="success" />
      </div>

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="partial">חלקי</SelectItem>
            <SelectItem value="paid">שולם</SelectItem>
            <SelectItem value="overdue">באיחור</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="תשלומים" />

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </th>
                <th className="text-right px-4 py-3 font-medium">לקוח</th>
                <th className="text-right px-4 py-3 font-medium">פרויקט</th>
                <th className="text-right px-4 py-3 font-medium">אבן דרך</th>
                <th className="text-right px-4 py-3 font-medium">סכום</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">שולם</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תאריך יעד</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(pay => {
                const proj = projectMap[pay.project_id];
                const client = clientMap[pay.client_id] || (proj ? clientMap[proj.client_id] : null);
                return (
                  <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.includes(pay.id)} onCheckedChange={() => toggleSelect(pay.id)} />
                    </td>
                    <td className="px-4 py-3">{client?.name || '—'}</td>
                    <td className="px-4 py-3">{proj?.name || '—'}</td>
                    <td className="px-4 py-3">{pay.milestone}</td>
                    <td className="px-4 py-3 font-medium">₪{pay.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">₪{(pay.amount_paid || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={pay.status} /></td>
                    <td className="px-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPayment(pay)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <DeleteButton onDelete={() => deleteMutation.mutate(pay.id)} entityLabel="תשלום" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={CreditCard} title="אין תשלומים" />}
      </div>

      <EditPaymentDialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null); }} payment={editPayment} />
    </div>
  );
}