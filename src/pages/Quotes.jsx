import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
import { Plus, Search, FileText, Send } from 'lucide-react';
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

  const markSentMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.update(id, { status: 'sent' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast.success('הסטטוס שונה ל״נשלח״'); },
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

  const generatePDF = async (quote, clientName) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;';
    div.innerHTML = '<div style="width:794px;min-height:1123px;background:#fff;font-family:Arial,Arial Hebrew,sans-serif;direction:rtl;color:#1a1a1a;"><div style="background:#8B7355;padding:40px 50px;color:white;"><div style="font-size:28px;font-weight:700;">Michal Wolberger</div><div style="font-size:14px;margin-top:4px;">עיצוב פנים</div></div><div style="padding:40px 50px;"><div style="text-align:center;font-size:24px;font-weight:600;color:#8B7355;margin-bottom:30px;border-bottom:2px solid #C9A96E;padding-bottom:16px;">הצעת מחיר</div><div style="text-align:right;margin-bottom:24px;line-height:2.2;font-size:15px;"><div><strong>לקוח:</strong> ' + (clientName || '') + '</div><div><strong>כותרת:</strong> ' + (quote.title || '') + '</div><div><strong>תאריך:</strong> ' + new Date().toLocaleDateString('he-IL') + '</div></div><div style="background:#F5F0EA;border-radius:8px;padding:24px 28px;margin-bottom:24px;text-align:center;"><div style="font-size:13px;color:#8B7355;margin-bottom:6px;">סהכ לתשלום</div><div style="font-size:32px;font-weight:700;">' + Number(quote.total_amount||0).toLocaleString('he-IL') + ' ILS</div></div>' + (quote.scope ? '<div style="margin-top:20px;"><div style="font-size:14px;font-weight:600;color:#8B7355;margin-bottom:8px;">היקף העבודה</div><div style="font-size:14px;line-height:1.7;">' + quote.scope + '</div></div>' : '') + '</div><div style="text-align:center;font-size:12px;color:#888;border-top:1px solid #eee;padding:16px 50px 0;">Michal Wolberger | עיצוב פנים | 052-468-7812</div></div>';
    document.body.appendChild(div);
    try {
      const canvas = await html2canvas(div.firstElementChild, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
      pdf.save('quote_' + (clientName || 'client') + '.pdf');

      // Upload to Base44 and save file_url on the Quote entity
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], 'quote_' + (clientName || 'client') + '.pdf', { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Quote.update(quote.id, { file_url });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

    } finally {
      document.body.removeChild(div);
    }
  };

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
        <Button data-tutorial="add-quote-btn" onClick={() => { setEditQuote(null); setShowAdd(true); }} className="gap-1">
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

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={(ids) => bulkDeleteMutation.mutate(ids || selectedIds)} entityLabel="הצעות" />}

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
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {q.status === 'draft' && (
                        <button onClick={() => markSentMutation.mutate(q.id)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800" title="סמן כנשלח"><Send className="w-3 h-3" /></button>
                      )}
                      <button onClick={() => generatePDF(q, clientMap[q.client_id]?.name)} className="flex items-center gap-1 text-sm text-[#8B7355] hover:text-[#C9A96E]" title="הורד PDF"><FileText className="w-3 h-3" />הורד PDF</button>
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