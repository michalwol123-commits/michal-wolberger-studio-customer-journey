import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import ViewToggle from '@/components/shared/ViewToggle';
import useCurrentUser from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, ExternalLink, Link, Upload, Calendar } from 'lucide-react';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import { format } from 'date-fns';
import AddQuoteDialog from '@/components/quotes/AddQuoteDialog';
import QuotesTable from '@/components/quotes/QuotesTable';
import { toast } from 'sonner';

const packageLabels = { basic: 'בסיסי', mid: 'בינוני', premium: 'פרימיום' };

export default function Quotes() {
  const { user, isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('cards');
  const [showAdd, setShowAdd] = useState(false);
  const [editQuote, setEditQuote] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });
  const meetingsMap = {};
  meetings.forEach(m => { meetingsMap[m.id] = m; });

  const filtered = quotes
    .filter(q => isAdmin || q.owner === user?.email)
    .filter(q => statusFilter === 'all' || q.status === statusFilter)
    .filter(q => {
      if (!search) return true;
      const client = clientMap[q.client_id];
      return q.title?.includes(search) || client?.name?.includes(search);
    });

  const totalAmount = filtered.reduce((s, q) => s + (q.total_amount || 0), 0);
  const approvedCount = filtered.filter(q => q.status === 'approved').length;
  const pendingCount = filtered.filter(q => ['sent', 'viewed'].includes(q.status)).length;

  const handleEdit = (q) => { setEditQuote(q); setShowAdd(true); };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Quote.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setSelectedIds([]);
      toast.success('ההצעות נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(q => q.id));

  return (
    <div>
      <PageHeader title="הצעות מחיר" subtitle={`${filtered.length} הצעות • ₪${totalAmount.toLocaleString()}`}>
        <ExportCSVButton
          data={filtered}
          columns={[
            { key: 'title', label: 'כותרת' },
            { label: 'לקוח', format: r => clientMap[r.client_id]?.name || '' },
            { key: 'total_amount', label: 'סכום' },
            { key: 'package_type', label: 'חבילה' },
            { key: 'status', label: 'סטטוס' },
            { label: 'תאריך', format: r => r.created_date ? format(new Date(r.created_date), 'dd/MM/yyyy') : '' },
          ]}
          filename="הצעות_מחיר"
        />
        <ViewToggle view={view} onViewChange={setView} />
        <Button onClick={() => { setEditQuote(null); setShowAdd(true); }} className="gap-1">
          <Plus className="w-4 h-4" />הצעה חדשה
        </Button>
      </PageHeader>

      <div className="flex gap-3 mb-4 text-sm">
        <div className="bg-card border rounded-lg px-3 py-1.5">
          <span className="text-muted-foreground">ממתינות: </span>
          <span className="font-semibold">{pendingCount}</span>
        </div>
        <div className="bg-card border rounded-lg px-3 py-1.5">
          <span className="text-muted-foreground">אושרו: </span>
          <span className="font-semibold text-green-600">{approvedCount}</span>
        </div>
        {filtered.length > 0 && (
          <div className="bg-card border rounded-lg px-3 py-1.5">
            <span className="text-muted-foreground">המרה: </span>
            <span className="font-semibold">{Math.round((approvedCount / filtered.length) * 100)}%</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי כותרת או לקוח..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="draft">טיוטה</SelectItem>
            <SelectItem value="sent">נשלח</SelectItem>
            <SelectItem value="viewed">נצפה</SelectItem>
            <SelectItem value="approved">מאושר</SelectItem>
            <SelectItem value="rejected">נדחה</SelectItem>
            <SelectItem value="expired">פג תוקף</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="הצעות" />}

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="אין הצעות מחיר" description="צרי הצעה ראשונה" />
      ) : view === 'table' ? (
        <QuotesTable
          quotes={filtered}
          clientMap={clientMap}
          meetingsMap={meetingsMap}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(q => {
            const client = clientMap[q.client_id];
            return (
              <Card key={q.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(q)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      {isAdmin && (
                        <div onClick={e => e.stopPropagation()} className="pt-0.5">
                          <Checkbox checked={selectedIds.includes(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-sm">{q.title}</h3>
                        <p className="text-xs text-muted-foreground">{client?.name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={q.status} />
                      {isAdmin && (
                        <div onClick={e => e.stopPropagation()}>
                          <DeleteButton onDelete={() => deleteMutation.mutate(q.id)} entityLabel="הצעה" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="font-bold">₪{(q.total_amount || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {q.package_type && <span>{packageLabels[q.package_type]}</span>}
                      <span>v{q.version || 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{q.created_date ? format(new Date(q.created_date), 'dd/MM/yyyy') : ''}</span>
                    <div className="flex items-center gap-2">
                      {q.meeting_id && meetingsMap[q.meeting_id] && (
                        <span className="flex items-center gap-0.5 text-violet-500" title="פגישה נקבעה">
                          <Calendar className="w-3 h-3" />
                        </span>
                      )}
                      {q.quote_type && (
                        <span className="flex items-center gap-0.5">
                          {q.quote_type === 'generated' && <FileText className="w-3 h-3" />}
                          {q.quote_type === 'link' && <Link className="w-3 h-3" />}
                          {q.quote_type === 'uploaded' && <Upload className="w-3 h-3" />}
                        </span>
                      )}
                      {q.url && (
                        <a href={q.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />לינק
                        </a>
                      )}
                      {q.file_url && (
                        <a href={q.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline">
                          <FileText className="w-3 h-3" />PDF
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddQuoteDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditQuote(null); }}
        initialData={editQuote}
      />
    </div>
  );
}