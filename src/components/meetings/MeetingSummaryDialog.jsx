import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PenLine, Camera, Type, X, Send, Copy } from 'lucide-react';
import { toast } from 'sonner';
import HandwritingPad from '@/components/meetings/HandwritingPad';
import { meetingTypeLabel } from '@/lib/meetingTypes';
import { formatIsraelDateTime } from '@/lib/israelTime';

// Writing a meeting summary on the iPad: type, dictate, Scribble, write on the pen pad, or photograph a page.
// Saving and sharing go through the meetingSummary function — the same path the WhatsApp agent uses.
const call = async (body) => {
  const res = await base44.functions.invoke('meetingSummary', body);
  const data = res?.data ?? res;
  if (!data?.ok) throw new Error(data?.error || 'הפעולה נכשלה');
  return data;
};

export default function MeetingSummaryDialog({ meeting, clientName, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [showPad, setShowPad] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientText, setClientText] = useState('');
  const [sendMessage, setSendMessage] = useState(true);
  const [sharePreview, setSharePreview] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open || !meeting) return;
    setNotes(meeting.internal_notes || '');
    setFiles(meeting.notes_files || []);
    setClientText(meeting.client_summary || '');
    setShowPad(false);
    setSharePreview(null);
  }, [open, meeting?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!meeting) return null;

  const appendText = (text) => {
    if (!text) return;
    setNotes(prev => (prev.trim() ? `${prev.trim()}\n${text}` : text));
  };

  const handlePhotos = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of picked) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setFiles(prev => [...prev, ...urls]);
      toast.success(urls.length > 1 ? `${urls.length} תמונות נוספו` : 'התמונה נוספה');
    } catch (err) {
      toast.error(`ההעלאה נכשלה: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const transcribePhotos = async () => {
    setTranscribing(true);
    try {
      const data = await call({ action: 'transcribe', file_urls: files });
      appendText(data.text);
      toast.success('הטקסט מהתמונות נוסף לסיכום');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTranscribing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await call({ action: 'save', meeting_id: meeting.id, internal_notes: notes, notes_files: files, replace_files: true });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('הסיכום נשמר. אפשר להמשיך עם הסוכן בוואטסאפ');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const previewShare = async () => {
    if (!clientText.trim()) { toast.error('כתבי קודם את הנוסח שהלקוח יראה'); return; }
    setSharing(true);
    try {
      setSharePreview(await call({ action: 'share', meeting_id: meeting.id, client_summary: clientText, send_message: sendMessage, dry_run: true }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSharing(false);
    }
  };

  const confirmShare = async () => {
    setSharing(true);
    try {
      if (notes !== (meeting.internal_notes || '') && !(await save())) return;
      const data = await call({ action: 'share', meeting_id: meeting.id, client_summary: clientText, send_message: sendMessage, dry_run: false });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSharePreview(null);
      toast.success(data.sent?.mode === 'preview' ? 'שותף בפורטל. ההודעה נשלחה אלייך לבדיקה (מצב דוגמה)' : 'הסיכום שותף עם הלקוח');
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[96vw] max-h-[94vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">סיכום: {meetingTypeLabel(meeting)}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {[clientName, meeting.scheduled_at && formatIsraelDateTime(meeting.scheduled_at)].filter(Boolean).join(' · ')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>סיכום פנימי (רק את והסוכן רואים)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={10}
              className="text-base leading-relaxed mt-1"
              placeholder="מה עלה בפגישה, מה הוחלט, מה צריך לעשות הלאה. אפשר להקליד, להכתיב, או לכתוב בעט ישירות כאן."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={showPad ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setShowPad(v => !v)}>
              <PenLine className="w-4 h-4" /> {showPad ? 'סגירת לוח הכתיבה' : 'לוח כתיבה בעט'}
            </Button>
            <label className="inline-flex">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} disabled={uploading} />
              <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} צילום דף או תמונה
              </span>
            </label>
            {files.length > 0 && (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={transcribePhotos} disabled={transcribing}>
                {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />} טקסט מהתמונות
              </Button>
            )}
          </div>

          {showPad && <HandwritingPad onText={appendText} onImage={url => setFiles(prev => [...prev, url])} />}

          {files.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {files.map(url => (
                <div key={url} className="relative group">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full aspect-square object-cover rounded border bg-white" />
                  </a>
                  <button type="button" onClick={() => setFiles(prev => prev.filter(u => u !== url))}
                    className="absolute top-1 left-1 bg-white/90 rounded-full p-0.5 border" title="הסרה">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>סגירה</Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} שמירת הסיכום
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>סיכום ללקוח (יופיע בפורטל)</Label>
              {meeting.client_summary_shared_at && (
                <span className="text-xs text-green-700">שותף ב-{formatIsraelDateTime(meeting.client_summary_shared_at)}</span>
              )}
            </div>
            <Textarea value={clientText} onChange={e => { setClientText(e.target.value); setSharePreview(null); }} rows={5} className="text-base"
              placeholder="הנוסח שהלקוח יראה. אפשר לבקש מהסוכן לנסח אותו מהסיכום הפנימי." />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => { setClientText(notes); setSharePreview(null); }} disabled={!notes.trim()}>
                <Copy className="w-4 h-4" /> העתקה מהסיכום הפנימי
              </Button>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={sendMessage} onCheckedChange={v => { setSendMessage(!!v); setSharePreview(null); }} />
                לשלוח ללקוח גם הודעה (וואטסאפ ומייל)
              </label>
              <Button type="button" variant="outline" size="sm" onClick={previewShare} disabled={sharing || !clientText.trim()}>
                {sharing && !sharePreview ? <Loader2 className="w-4 h-4 animate-spin" /> : null} מה יקרה?
              </Button>
            </div>

            {sharePreview && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
                <ul className="list-disc pr-5 space-y-1">
                  {sharePreview.consequences.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                {sharePreview.message_preview && (
                  <pre className="whitespace-pre-wrap font-sans text-xs bg-white border rounded p-2">{sharePreview.message_preview}</pre>
                )}
                <Button type="button" size="sm" className="gap-1" onClick={confirmShare} disabled={sharing}>
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} אישור ושיתוף
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
