import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PenLine, CheckCircle2, Clock, Copy, Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Document entity signature fields:
// signature_token   — UUID for public link /sign?token=XXX
// signature_status  — 'draft' | 'pending_signature' | 'signed'
// signed_at         — timestamp
// signer_name       — name as entered on signature page
// signature_image_url — canvas data URL / image of signature

export default function DocumentSignatureBadge({ doc }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const getSignUrl = (token) => `${window.location.origin}/sign?token=${token}`;

  // Generate token and set status to pending_signature
  const handleSendForSignature = async () => {
    setSending(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      await base44.entities.Document.update(doc.id, {
        signature_token: token,
        signature_status: 'pending_signature',
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
    if (!doc.signature_token) return;
    await navigator.clipboard.writeText(getSignUrl(doc.signature_token));
    setCopied(true);
    toast.success('קישור הועתק');
    setTimeout(() => setCopied(false), 2000);
  };

  // Send signature link via email to client (sendEmail scheduler picks it up every 5 min via Gmail)
  const handleSendEmail = async () => {
    if (!doc.signature_token || !doc.client_id) return;
    setSending(true);
    try {
      const clients = await base44.entities.Client.filter({ id: doc.client_id });
      const client = clients[0];
      if (!client?.email) {
        toast.error('ללקוח/ה אין כתובת מייל במערכת');
        return;
      }
      const url = getSignUrl(doc.signature_token);
      await base44.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'email',
        direction: 'outbound',
        subject: `מסמך לחתימה: ${doc.name}`,
        content: `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:520px;">
            <div style="background:#8B7355;padding:16px 24px;border-radius:8px 8px 0 0;">
              <h2 style="color:white;margin:0;font-size:18px;">מסמך לחתימה דיגיטלית</h2>
            </div>
            <div style="background:white;padding:20px 24px;border:1px solid #e8e0d5;border-top:none;border-radius:0 0 8px 8px;">
              <p style="color:#333;">שלום ${client.name},</p>
              <p style="color:#333;">המסמך <strong>${doc.name}</strong> נשלח לחתימתך.</p>
              <p style="margin-top:20px;">
                <a href="${url}" style="background:#8B7355;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;font-size:15px;">
                  ✍️ לחתימה על המסמך
                </a>
              </p>
              <p style="color:#999;font-size:12px;margin-top:16px;">
                הקישור: ${url}
              </p>
            </div>
          </div>
        `,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });
      toast.success(`מייל יישלח בדקות הקרובות ל-${client.email}`);
    } catch (e) {
      toast.error('שגיאה: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  // --- SIGNED ---
  if (doc.signature_status === 'signed') {
    return (
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" /> נחתם
        </Badge>
        <span className="text-xs text-muted-foreground">
          {doc.signer_name}
          {doc.signed_at && ` • ${format(new Date(doc.signed_at), 'dd/MM/yyyy HH:mm')}`}
        </span>
        {doc.file_url && (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline">
            PDF חתום ↗
          </a>
        )}
      </div>
    );
  }

  // --- PENDING SIGNATURE (token exists, waiting for client) ---
  if (doc.signature_status === 'pending_signature') {
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

  // --- NO SIGNATURE YET (draft or no status) ---
  if (!doc.file_url) return null;
  return (
    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs mt-1"
      onClick={handleSendForSignature} disabled={sending}>
      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
      שלח לחתימה
    </Button>
  );
}