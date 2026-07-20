import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Link, Upload, Loader2, Calendar, FileSignature } from 'lucide-react';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';
import { toast } from 'sonner';
import ComparisonTableEditor from '@/components/quotes/ComparisonTableEditor';

const packageOptions = [
  { value: 'small', label: 'S — ליווי בסיסי' },
  { value: 'medium', label: 'M — ליווי מלא' },
  { value: 'large', label: 'L — פרימיום (מיכל מנהלת תקציב)' },
];

const quoteTypeOptions = [
  { value: 'generated', label: 'יצירה במערכת', icon: FileText, desc: 'PDF מעוצב אוטומטי' },
  { value: 'link', label: 'לינק חיצוני', icon: Link, desc: 'חשבונית ירוקה / Google Docs' },
  { value: 'uploaded', label: 'העלאת PDF', icon: Upload, desc: 'קובץ ממערכת חיצונית' },
];

const defaultForm = {
  client_id: '', title: '', quote_type: 'generated', package_type: 'medium',
  total_amount: '', price_small: '', price_medium: '', price_large: '',
  scope: '', url: '', file_url: '', meeting_date: '',
  send_via: 'email', status: 'draft', notes: '', version: 1, comparison: null,
  // contract overrides (empty = pulled from client card)
  contract_name: '', contract_id_number: '', contract_phone: '',
  contract_address: '', contract_email: '', contract_date: '',
};

export default function AddQuoteDialog({ open, onOpenChange, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('quote');

  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [editMeetingId, setEditMeetingId] = useState(null);
  const [meetingId, setMeetingId] = useState(initialData?.meeting_id || null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 200),
  });

  // selected client — used to show what will be pulled into the contract by default
  const selClient = clients.find(c => c.id === form.client_id) || {};
  const selClientAddress = [selClient.address, selClient.city].filter(Boolean).join(', ');

  // price for a given package value (from the prices entered on the quote tab)
  const priceForPackage = (pt, src) => ({
    small: src.price_small, medium: src.price_medium, large: src.price_large,
  }[pt]);

  // When dialog opens: populate form from initialData or reset + clear stale mutation state
  useEffect(() => {
    mutation.reset();
    setTab('quote');
    if (initialData) {
      const mid = initialData.meeting_id || null;
      setMeetingId(mid);

      // If meeting_date is empty but linked meeting has scheduled_at, use it
      let meetingDate = initialData.meeting_date || '';
      if (!meetingDate && mid && meetings.length > 0) {
        const linkedMeeting = meetings.find(m => m.id === mid);
        if (linkedMeeting?.scheduled_at) {
          meetingDate = linkedMeeting.scheduled_at.split('T')[0];
        }
      }

      setForm({
        client_id: initialData.client_id || '',
        title: initialData.title || '',
        quote_type: initialData.quote_type || 'generated',
        package_type: initialData.package_type || 'medium',
        total_amount: initialData.total_amount || '',
        price_small: initialData.price_small || '',
        price_medium: initialData.price_medium || '',
        price_large: initialData.price_large || '',
        scope: initialData.scope || '',
        url: initialData.url || '',
        file_url: initialData.file_url || '',
        meeting_date: meetingDate,
        send_via: initialData.send_via || 'email',
        status: initialData.status || 'draft',
        notes: initialData.notes || '',
        version: initialData.version || 1,
        comparison: initialData.comparison ? (typeof initialData.comparison === 'string' ? JSON.parse(initialData.comparison) : initialData.comparison) : null,
        contract_name: initialData.contract_name || '',
        contract_id_number: initialData.contract_id_number || '',
        contract_phone: initialData.contract_phone || '',
        contract_address: initialData.contract_address || '',
        contract_email: initialData.contract_email || '',
        contract_date: initialData.contract_date || '',
      });
    } else {
      setMeetingId(null);
      setForm(defaultForm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-link existing quote_presentation meeting when client changes (new quote only)
  useEffect(() => {
    if (initialData || !form.client_id || meetings.length === 0) return;
    const pending = meetings.find(
      m => m.client_id === form.client_id && m.type === 'quote_presentation' && m.status === 'scheduled' && !m.quote_id
    );
    if (pending) {
      setMeetingId(pending.id);
      if (pending.scheduled_at) {
        setForm(p => ({ ...p, meeting_date: pending.scheduled_at.split('T')[0] }));
      }
    } else {
      setMeetingId(null);
      setForm(p => ({ ...p, meeting_date: '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const result = initialData
        ? await base44.entities.Quote.update(initialData.id, data)
        : await base44.entities.Quote.create(data);
      // If meeting exists, link quote to it
      if (meetingId && result?.id) {
        try {
          await base44.entities.Meeting.update(meetingId, { quote_id: result.id });
        } catch (_) { /* meeting may have been deleted — ignore */ }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error('שגיאה בשמירת ההצעה: ' + (err?.message || 'נסי שוב'));
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, file_url }));
    setUploading(false);
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0,
      price_small: form.price_small ? Number(form.price_small) : undefined,
      price_medium: form.price_medium ? Number(form.price_medium) : undefined,
      price_large: form.price_large ? Number(form.price_large) : undefined,
      version: Number(form.version) || 1,
      meeting_id: meetingId || undefined,
      comparison: form.comparison ? JSON.stringify(form.comparison) : '',
      // contract overrides — empty string = "pull from client card" at PDF time
      contract_name: form.contract_name || '',
      contract_id_number: form.contract_id_number || '',
      contract_phone: form.contract_phone || '',
      contract_address: form.contract_address || '',
      contract_email: form.contract_email || '',
      contract_date: form.contract_date || undefined,
    };
    // Remove irrelevant fields based on quote_type
    if (form.quote_type === 'generated' || form.quote_type === 'uploaded') {
      payload.url = '';
    }
    if (form.quote_type === 'link') {
      payload.file_url = '';
    }
    mutation.mutate(payload);
  };

  // total_amount is now OPTIONAL at quote stage (moved to the "הסכם" tab).
  const isReady = form.client_id && form.title && (
    form.quote_type === 'link' ? form.url :
    form.quote_type === 'uploaded' ? form.file_url :
    true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{initialData ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quote" className="gap-1.5"><FileText className="w-3.5 h-3.5" />הצעה</TabsTrigger>
              <TabsTrigger value="contract" className="gap-1.5"><FileSignature className="w-3.5 h-3.5" />הסכם</TabsTrigger>
            </TabsList>

            {/* ============ TAB: הצעה ============ */}
            <TabsContent value="quote" className="space-y-4 mt-4">
              {/* Quote type selector */}
              <div>
                <Label className="mb-2 block">סוג הצעה</Label>
                <div className="grid grid-cols-3 gap-2">
                  {quoteTypeOptions.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.quote_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, quote_type: opt.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client */}
              <div>
                <Label>לקוח *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label>כותרת ההצעה *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="עיצוב דירת 4 חדרים..." />
              </div>

              {/* Package prices S / M / L */}
              {form.quote_type === 'generated' && (
                <div>
                  <Label className="mb-2 block">מחירי חבילות (עמוד 16)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">S — בסיסי</Label>
                      <Input type="number" value={form.price_small} onChange={e => setForm(p => ({ ...p, price_small: e.target.value }))} placeholder="₪" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">M — מלא</Label>
                      <Input type="number" value={form.price_medium} onChange={e => setForm(p => ({ ...p, price_medium: e.target.value }))} placeholder="₪" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">L — פרימיום</Label>
                      <Input type="number" value={form.price_large} onChange={e => setForm(p => ({ ...p, price_large: e.target.value }))} placeholder="₪" />
                    </div>
                  </div>
                </div>
              )}

              {/* Comparison table (p-15) */}
              {form.quote_type === 'generated' && (
                <ComparisonTableEditor
                  value={form.comparison}
                  onChange={(v) => setForm(p => ({ ...p, comparison: v }))}
                />
              )}

              {/* Version */}
              <div>
                <Label>גרסה</Label>
                <Input type="number" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className="w-32" />
              </div>

              {/* Conditional fields based on quote_type */}
              {form.quote_type === 'link' && (
                <div>
                  <Label>לינק להצעת מחיר *</Label>
                  <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." dir="ltr" />
                </div>
              )}

              {form.quote_type === 'uploaded' && (
                <div>
                  <Label>העלאת קובץ PDF *</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {form.file_url && (
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">צפה בקובץ שהועלה</a>
                  )}
                </div>
              )}



              {/* Send via + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ערוץ שליחה</Label>
                  <Select value={form.send_via} onValueChange={v => setForm(p => ({ ...p, send_via: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">מייל בלבד</SelectItem>
                      <SelectItem value="whatsapp">וואטסאפ בלבד</SelectItem>
                      <SelectItem value="both">מייל + וואטסאפ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">טיוטה</SelectItem>
                      <SelectItem value="sent">נשלח</SelectItem>
                      <SelectItem value="sent_for_signature">נשלחה הצעה לחתימה</SelectItem>
                      <SelectItem value="contract_sent_for_signature">נשלח הסכם לחתימה</SelectItem>
                      <SelectItem value="approved">מאושר</SelectItem>
                      <SelectItem value="rejected">נדחה</SelectItem>
                      <SelectItem value="expired">פג תוקף</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Schedule meeting */}
              <div className="border-t pt-3">
                <Label className="mb-2 block">פגישת הצגת הצעה</Label>
                {meetingId ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <button type="button" className="flex items-center gap-2 flex-1 hover:underline" onClick={() => { setEditMeetingId(meetingId); setShowMeetingDialog(true); }}>
                      <Calendar className="w-4 h-4" />
                      <span>פגישה נקבעה</span>
                    </button>
                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { setMeetingId(null); }}>הסר</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowMeetingDialog(true)} disabled={!form.client_id}>
                    <Calendar className="w-3.5 h-3.5" />
                    קבע פגישה
                  </Button>
                )}
              </div>

              {/* הערות מאוחדות — אופציונלי, מופיעות מתחת למחירים ב-PDF */}
              <div>
                <Label>הערות (אופציונלי)</Label>
                <Textarea
                  value={form.scope}
                  onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}
                  rows={3}
                  placeholder="מה כלול בחבילה, הערות פנימיות, פרטים נוספים... יופיע מתחת לטבלת המחירים ב-PDF"
                />
              </div>
            </TabsContent>

            {/* ============ TAB: הסכם ============ */}
            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>סכום ההסכם (₪)</Label>
                  <Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} placeholder="לא חובה בשלב ההצעה" />
                </div>
                <div>
                  <Label>חבילה</Label>
                  <Select
                    value={form.package_type}
                    onValueChange={v => setForm(p => {
                      const price = priceForPackage(v, p);
                      return { ...p, package_type: v, total_amount: (price != null && price !== '') ? price : p.total_amount };
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {packageOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Manual contract overrides — empty = pulled from client card */}
              <div>
                <Label className="mb-1 block text-sm font-medium">פרטי ההסכם (אופציונלי)</Label>
                <p className="text-xs text-muted-foreground mb-2">השאירי ריק = יימשך אוטומטית מכרטיס הלקוח. תאריך ריק = תאריך החתימה / היום.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">שם בהסכם</Label>
                    <Input value={form.contract_name} onChange={e => setForm(p => ({ ...p, contract_name: e.target.value }))} placeholder={selClient.name || 'מכרטיס הלקוח'} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ת.ז / ח.פ</Label>
                    <Input value={form.contract_id_number} onChange={e => setForm(p => ({ ...p, contract_id_number: e.target.value }))} placeholder={selClient.id_number || 'מכרטיס הלקוח'} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">טלפון</Label>
                    <Input value={form.contract_phone} onChange={e => setForm(p => ({ ...p, contract_phone: e.target.value }))} placeholder={selClient.phone || 'מכרטיס הלקוח'} dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">מייל</Label>
                    <Input value={form.contract_email} onChange={e => setForm(p => ({ ...p, contract_email: e.target.value }))} placeholder={selClient.email || 'מכרטיס הלקוח'} dir="ltr" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">כתובת</Label>
                    <Input value={form.contract_address} onChange={e => setForm(p => ({ ...p, contract_address: e.target.value }))} placeholder={selClientAddress || 'מכרטיס הלקוח'} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">תאריך ההסכם</Label>
                    <Input type="date" value={form.contract_date} onChange={e => setForm(p => ({ ...p, contract_date: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1.5"><FileSignature className="w-4 h-4" />חתימה דו-שלבית</p>
                <p>לאחר שמירת ההצעה ויצירת ה-PDF, כאן יופיעו הכפתורים לשליחת ההצעה לחתימה (עמ' 15) ולשליחת ההסכם לחתימה (עמ' 24). תאריך החתימה יתמלא אוטומטית.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={!isReady || mutation.isPending}>
              {initialData ? 'עדכון' : 'צור הצעה'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AddMeetingDialog
        open={showMeetingDialog}
        onOpenChange={(open) => { setShowMeetingDialog(open); if (!open) setEditMeetingId(null); }}
        initialData={editMeetingId ? meetings.find(m => m.id === editMeetingId) : {
          client_id: form.client_id,
          type: 'quote_presentation',
        }}
        onCreated={(meeting) => {
          if (meeting?.id) {
            setMeetingId(meeting.id);
          }
          setEditMeetingId(null);
        }}
      />
    </Dialog>
  );
}