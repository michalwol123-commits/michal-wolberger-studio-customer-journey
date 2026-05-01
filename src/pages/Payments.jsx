import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import StatsCard from '@/components/shared/StatsCard';
import useCurrentUser from '@/lib/useCurrentUser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';
import ViewToggle from '@/components/shared/ViewToggle';
import { Card, CardContent } from '@/components/ui/card';

export default function Payments() {
  const { isAdmin, loading } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('table');

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
        <ViewToggle view={view} onViewChange={setView} />
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

      {view === 'cards' ? (
        filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="אין תשלומים" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(pay => {
              const proj = projectMap[pay.project_id];
              const client = proj ? clientMap[proj.client_id] : null;
              return (
                <Card key={pay.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{pay.milestone}</p>
                        <p className="text-xs text-muted-foreground">{proj?.name || '—'} • {client?.name || '—'}</p>
                      </div>
                      <StatusBadge status={pay.status} />
                    </div>
                    <div className="text-sm space-y-1">
                      <p>סכום: <span className="font-medium">₪{pay.amount?.toLocaleString()}</span></p>
                      <p>שולם: ₪{(pay.amount_paid || 0).toLocaleString()}</p>
                      {pay.due_date && <p className="text-xs text-muted-foreground">יעד: {format(new Date(pay.due_date), 'dd/MM/yyyy')}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right px-4 py-3 font-medium">לקוח</th>
                  <th className="text-right px-4 py-3 font-medium">פרויקט</th>
                  <th className="text-right px-4 py-3 font-medium">אבן דרך</th>
                  <th className="text-right px-4 py-3 font-medium">סכום</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">שולם</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">תאריך יעד</th>
                  <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pay => {
                  const proj = projectMap[pay.project_id];
                  const client = proj ? clientMap[proj.client_id] : null;
                  return (
                    <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{client?.name || '—'}</td>
                      <td className="px-4 py-3">{proj?.name || '—'}</td>
                      <td className="px-4 py-3">{pay.milestone}</td>
                      <td className="px-4 py-3 font-medium">₪{pay.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">₪{(pay.amount_paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={pay.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon={CreditCard} title="אין תשלומים" />}
        </div>
      )}
    </div>
  );
}