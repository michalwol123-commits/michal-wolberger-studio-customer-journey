import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Link, Upload, Loader2, Calendar } from 'lucide-react';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';

const packageOptions = [
  { value: 'basic', label: 'בסיסי' },
  { value: 'mid', label: 'בינוני' },
  { value: 'premium', label: 'פרימיום' },
];

const quoteTypeOptions = [
  { value: 'generated', label: 'יצירה במערכת', icon: FileText, desc: 'PDF מעוצב אוטומטי' },
  { value: 'link', label: 'לינק חיצוני', icon: Link, desc: 'חשבונית ירוקה / Google Docs' },
  { value: 'uploaded', label: 'העלאת PDF', icon: Upload, desc: 'קובץ ממערכת חיצונית' },
];

const defaultForm = {
  client_id: '', title: '', quote_type: 'generated', package_type: 'mid',
  total_amount: '', scope: '', url: '', file_url: '', meeting_date: '',
  send_via: 'email', status: 'draft', notes: '', version: 1,
};

export default function AddQuoteDialog({ open, onOpenChange, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [meetingId, setMeetingId] = useState(initialData?.meeting_id || null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 200),
  });

  // When dialog opens: populate form from initialData or reset
  useEffect(() => {
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
        package_type: initialData.package_type || 'mid',
        total_amount: initialData.total_amount || '',
        scope: initialData.scope || '',
        url: initialData.url || '',
        file_url: initialData.file_url || '',
        meeting_date: meetingDate,
        send_via: initialData.send_via || 'email',
        status: initialData.status || 'draft',
        notes: initialData.notes || '',
        version: initialData.version || 1,
      });
    } else {
      setMeetingId(null);
      setForm(defaultForm);
    }
  }, [initialData, open, meetings]);

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
  }, [form.client_id, meetings, initialData]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const result = initialData
        ? await base44.entities.Quote.update(initialData.id, data)
        : await base44.entities.Quote.create(data);
      // If meeting exists, link quote to it
      if (meetingId && result?.id) {
        await base44.entities.Meeting.update(meetingId, { quote_id: result.id });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onOpenChange(false);
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

  const handleGeneratePDF = async () => {
    if (!form.client_id || !form.title || !form.total_amount) return;
    setGenerating(true);
    const res = await base44.functions.invoke('generateQuotePDF', {
      client_id: form.client_id,
      title: form.title,
      package_type: form.package_type,
      total_amount: Number(form.total_amount),
      scope: form.scope,
      meeting_date: form.meeting_date,
    });
    setForm(p => ({ ...p, file_url: res.data.file_url }));
    setGenerating(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0,
      version: Number(form.version) || 1,
      meeting_id: meetingId || undefined,
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

  const isReady = form.client_id && form.title && (
    form.quote_type === 'link' ? form.url :
    form.quote_type === 'uploaded' ? form.file_url :
    form.total_amount
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">{initialData ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Amount + Package (for generated & link) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סכום כולל (₪) {form.quote_type !== 'link' ? '*' : ''}</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} />
            </div>
            <div>
              <Label>חבילה</Label>
              <Select value={form.package_type} onValueChange={v => setForm(p => ({ ...p, package_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {packageOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>תאריך פגישה</Label>
              <Input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
            </div>
            <div>
              <Label>גרסה</Label>
              <Input type="number" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
            </div>
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

          {form.quote_type === 'generated' && (
            <div>
              <Label>תיאור / היקף *</Label>
              <Textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} rows={3} placeholder="תיאור השירות, מה כלול בחבילה..." />
              {form.file_url ? (
                <div className="flex items-center gap-2 mt-2">
                  <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">צפה ב-PDF שנוצר</a>
                  <Button type="button" variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generating}>
                    {generating ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                    יצירה מחדש
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={handleGeneratePDF} disabled={generating || !form.client_id || !form.title || !form.total_amount}>
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  צור PDF מעוצב
                </Button>
              )}
            </div>
          )}

          {/* Scope for non-generated types */}
          {form.quote_type !== 'generated' && (
            <div>
              <Label>תיאור / היקף</Label>
              <Textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} rows={2} />
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
                  <SelectItem value="viewed">נצפה</SelectItem>
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
                <Calendar className="w-4 h-4" />
                <span>פגישה נקבעה</span>
                <Button type="button" variant="ghost" size="sm" className="mr-auto text-xs" onClick={() => { setMeetingId(null); }}>הסר</Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowMeetingDialog(true)} disabled={!form.client_id}>
                <Calendar className="w-3.5 h-3.5" />
                קבע פגישה
              </Button>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>

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
        onOpenChange={setShowMeetingDialog}
        initialData={{
          client_id: form.client_id,
          type: 'quote_presentation',
        }}
        onCreated={(meeting) => {
          if (meeting?.id) setMeetingId(meeting.id);
        }}
      />
    </Dialog>
  );
}