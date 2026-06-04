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
import { Plus, Search, FileText, Send, FileSignature, Loader2, Layers, RefreshCw } from 'lucide-react';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import { format } from 'date-fns';
import AddQuoteDialog from '@/components/quotes/AddQuoteDialog';
import QuotesTable from '@/components/quotes/QuotesTable';
import DocumentSignatureBadge from '@/components/documents/DocumentSignatureBadge';
import { toast } from 'sonner';

const packageLabels = { small: 'ליווי בסיסי', medium: 'ליווי מלא', large: 'פרימיום' };

// ===== חתימה דו-שלבית + שלב יחיד + "גרסה חדשה" (מוטמע כאן כי אי אפשר להוסיף קבצים) =====
// שלב 1 = הצעה (part:'quote'), שלב 2 = הסכם (part:'contract'), או הכל יחד (part:'full').
// "גרסה חדשה לחתימה" יוצרת Document חדש (version_number+1, parent_doc_id) בלי למחוק את הישן.
function QuoteSigningButtons({ quote, clientName, compact = false }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);

  const { data: docs = [] } = useQuery({
    queryKey: ['quote-docs', quote?.id],
    queryFn: () => base44.entities.Document.filter({ quote_id: quote.id }),
    enabled: !!quote?.id,
  });

  // הגרסה האחרונה לכל סוג (לפי version_number, ואז תאריך)
  const latestOf = (type) => docs
    .filter(d => d.type === type)
    .sort((a, b) =>
      (b.version_number || 1) - (a.version_number || 1) ||
      new Date(b.created_date || 0) - new Date(a.created_date || 0)
    )[0];
  const quoteDoc = latestOf('quote');
  const contractDoc = latestOf('contract');

  const sendForSignature = async (part, type, label, prevDoc) => {
    if (!quote?.id) { toast.error('צריך לשמור את ההצעה קודם'); return; }
    const key = `${part}${prevDoc ? '-rev' : ''}`;
    setBusy(key);
    try {
      const result = await base44.functions.invoke('generateQuotePDF', {
        client_id: quote.client_id,
        quote_id: quote.id,
        total_amount: quote.total_amount,
        meeting_date: quote.meeting_date,
        part,
      });
      const fileUrl = result?.data?.file_url || result?.file_url;
      if (!fileUrl) throw new Error(result?.data?.error || result?.error || 'יצירת ה-PDF נכשלה');

      const version = prevDoc ? (prevDoc.version_number || 1) + 1 : 1;
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      await base44.entities.Document.create({
        name: `${label} - ${clientName || ''}${version > 1 ? ` (גרסה ${version})` : ''}`.trim(),
        type,
        file_url: fileUrl,
        client_id: quote.client_id,
        quote_id: quote.id,
        version_number: version,
        parent_doc_id: prevDoc?.id || undefined,
        signature_token: token,
        signature_status: 'pending_signature',
      });

      const url = `${window.location.origin}/sign?token=${token}`;
      await navigator.clipboard.writeText(url);
      toast.success(`${label}${version > 1 ? ` (גרסה ${version})` : ''}: קישור חתימה הועתק! שלחי ללקוח/ה`);
      queryClient.invalidateQueries({ queryKey: ['quote-docs', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (e) {
      toast.error('שגיאה: ' + (e?.message || 'נסי שוב'));
    } finally {
      setBusy(null);
    }
  };

  if (!quote?.id) {
    return <p className="text-xs text-muted-foreground">שמרי את ההצעה כדי לשלוח לחתימה.</p>;
  }

  const sz = compact ? 'h-7 px-2 text-xs' : '';
  const Spin = <Loader2 className="w-3.5 h-3.5 animate-spin" />;

  return (
    <div className="space-y-2">
      {/* ===== שלב 1: הצעה ===== */}
      {!quoteDoc ? (
        <Button type="button" size="sm" variant="outline" className={`gap-1.5 ${sz}`} disabled={!!busy}
          onClick={() => sendForSignature('quote', 'quote', 'הצעת מחיר', null)}>
          {busy === 'quote' ? Spin : <FileText className="w-3.5 h-3.5" />}
          שלב 1: הצעה לחתימה
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">📄 הצעה (גרסה {quoteDoc.version_number || 1}):</span>
          <DocumentSignatureBadge doc={quoteDoc} />
          <Button type="button" size="sm" variant="ghost" className={`gap-1 ${sz}`} disabled={!!busy}
            onClick={() => sendForSignature('quote', 'quote', 'הצעת מחיר', quoteDoc)} title="ייצר PDF מעודכן ושלח גרסה חדשה לחתימה">
            {busy === 'quote-rev' ? Spin : <RefreshCw className="w-3 h-3" />}
            גרסה חדשה
          </Button>
        </div>
      )}

      {/* ===== שלב 2: הסכם ===== */}
      {!contractDoc ? (
        <Button type="button" size="sm" variant="outline" className={`gap-1.5 ${sz}`} disabled={!!busy}
          onClick={() => sendForSignature('contract', 'contract', 'הסכם', null)}>
          {busy === 'contract' ? Spin : <FileSignature className="w-3.5 h-3.5" />}
          שלב 2: הסכם לחתימה
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">✍️ הסכם (גרסה {contractDoc.version_number || 1}):</span>
          <DocumentSignatureBadge doc={contractDoc} />
          <Button type="button" size="sm" variant="ghost" className={`gap-1 ${sz}`} disabled={!!busy}
            onClick={() => sendForSignature('contract', 'contract', 'הסכם', contractDoc)} title="ייצר PDF מעודכן ושלח גרסה חדשה לחתימה">
            {busy === 'contract-rev' ? Spin : <RefreshCw className="w-3 h-3" />}
            גרסה חדשה
          </Button>
        </div>
      )}

      {/* ===== שלח הכל יחד — רק כשעוד לא נשלח כלום ===== */}
      {!quoteDoc && !contractDoc && (
        <Button type="button" size="sm" variant="ghost" className={`gap-1.5 ${sz}`} disabled={!!busy}
          onClick={() => sendForSignature('full', 'contract', 'הצעה + הסכם', null)}>
          {busy === 'full' ? Spin : <Layers className="w-3.5 h-3.5" />}
          שלח הכל יחד
        </Button>
      )}
    </div>
  );
}

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
    const result = await base44.functions.invoke('generateQuotePDF', {
      client_id: quote.client_id,
      quote_id: quote.id,
      title: quote.title,
      package_type: quote.package_type,
      total_amount: quote.total_amount,
      scope: quote.scope,
      meeting_date: quote.meeting_date,
    });
    const fileUrl = result?.data?.file_url || result?.file_url;
    if (!fileUrl) {
      alert(result?.data?.error || result?.error || 'יצירת ה-PDF נכשלה');
      return;
    }
    await base44.entities.Quote.update(quote.id, { file_url: fileUrl });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    const a = document.createElement('a');
    a.href = fileUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.download = 'quote_' + (clientName || 'client') + '.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
                  <div className="mt-3 pt-3 border-t" onClick={e => e.stopPropagation()}>
                    <QuoteSigningButtons quote={q} clientName={client?.name} compact />
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