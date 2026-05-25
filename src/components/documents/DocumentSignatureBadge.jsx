import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PenLine, CheckCircle2, Clock, Copy, Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Field names in Document entity:
// sign_token        — UUID for public signature link
// signed_at         — timestamp when signed (null = not signed)
// signed_by_name    — signer's name as entered on signature page
// signed_pdf_url    — URL of signed PDF (set by submitSignature backend function)
// requires_signature — boolean flag

export default function DocumentSignatureBadge({ doc }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const APP_BASE_URL = window.location.origin;
  const getSignUrl = (token) => `${APP_BASE_URL}/sign?token=${token}`;

  // Generate a sign_token and update document
  const handleSendForSignature = async () => {
    setSending(true);
    try {
      const token = crypto.randomUUID();
      await base44.entities.Document.update(doc.id, {
        sign_token: token,
        requires_signature: true,
      });
      const url = getSignUrl(token);
      await navigator.clipboard.writeText(url);
      toast.success('קישור חתימה הועתק! שלחי ללקוח/ה');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (e) {
      toast.error('שגיאה: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!doc.sign_token) return;
    await navigator.clipboard.writeText(getSignUrl(doc.sign_token));
    setCopied(true);
    toast.success('קישור הועתק');
    setTimeout(() => setCopied(false), 2000);
  };

  // Send signature link via email to client (picked up by sendEmail scheduler every 5 min)
  const handleSendEmail = async () => {
    if (!doc.sign_token || !doc.client_id) return;
    setSending(true);
    try {
      const clients = await base44.entities.Client.filter({ id: doc.client_id });
      const client = clients[0];
      if (!client?.email) {
        toast.error('ללקוח/ה אין כתובת מייל במערכת');
        return;
      }
      const url = getSignUrl(doc.sign_token);
      await base44.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'email',
        direction: 'outbound',
        subject: `מסמך לחתימה: ${doc.name}`,
        content: `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:500px;">
            <h2 style="color:#8B7355;">מסמך לחתימה דיגיטלית</h2>
            <p>שלום ${client.name},</p>
            <p>נשלח לך מסמך לחתימה: <strong>${doc.name}</strong></p>
            <p style="margin-top:20px;">
              <a href="${url}" style="background:#8B7355;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-size:15px;">
                ✍️ לחתימה על המסמך
              </a>
            </p>
            <p style="color:#888;font-size:12px;margin-top:20px;">
              או העתק קישור: ${url}
            </p>
          </div>
        `,
        sent_by: 'system',
        status: 'pending',
        channel: 'gmail',
      });
      toast.success(`מייל יישלח בדקות הקרובות ל-${client.email}`);
    } catch (e) {
      toast.error('שגיאה: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  // --- SIGNED ---
  if (doc.signed_at) {
    return (
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" /> נחתם
        </Badge>
        <span className="text-xs text-muted-foreground">
          {doc.signed_by_name} • {format(new Date(doc.signed_at), 'dd/MM/yyyy HH:mm')}
        </span>
        {doc.signed_pdf_url && (
          <a href={doc.signed_pdf_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline">
            PDF חתום ↗
          </a>
        )}
      </div>
    );
  }

  // --- PENDING SIGNATURE (token exists, not yet signed) ---
  if (doc.sign_token) {
    return (
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-xs">
          <Clock className="w-3 h-3" /> ממתין לחתימה
        </Badge>
        <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs" onClick={handleCopyLink}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'הועתק' : 'העתק קישור'}
        </Button>
        {doc.client_id && (
          <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs" onClick={handleSendEmail} disabled={sending}>
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            שלח במייל
          </Button>
        )}
      </div>
    );
  }

  // --- NO SIGNATURE TOKEN YET ---
  if (!doc.file_url) return null;
  return (
    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs mt-1" onClick={handleSendForSignature} disabled={sending}>
      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
      שלח לחתימה
    </Button>
  );
}
