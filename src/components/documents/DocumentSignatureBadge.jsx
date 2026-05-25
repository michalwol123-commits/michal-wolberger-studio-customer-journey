import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PenLine, CheckCircle2, Clock, Copy, Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DocumentSignatureBadge({ doc }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const getSignUrl = (token) => `${window.location.origin}/sign?token=${token}`;

  const handleSendForSignature = async () => {
    setSending(true);
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    await base44.entities.Document.update(doc.id, {
      signature_token: token,
      signature_status: 'pending_signature',
    });
    const url = getSignUrl(token);
    await navigator.clipboard.writeText(url);
    toast.success('קישור חתימה הועתק! שלחי ללקוח/ה');
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    setSending(false);
  };

  const handleCopyLink = async () => {
    if (!doc.signature_token) return;
    await navigator.clipboard.writeText(getSignUrl(doc.signature_token));
    setCopied(true);
    toast.success('קישור הועתק');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!doc.signature_token || !doc.client_id) return;
    setSending(true);
    // Get client email
    const clients = await base44.entities.Client.filter({ id: doc.client_id });
    const client = clients[0];
    if (!client?.email) {
      toast.error('ללקוח/ה אין כתובת מייל');
      setSending(false);
      return;
    }
    const url = getSignUrl(doc.signature_token);
    await base44.integrations.Core.SendEmail({
      to: client.email,
      subject: `מסמך לחתימה: ${doc.name}`,
      body: `שלום ${client.name},\n\nמסמך "${doc.name}" ממתין לחתימתך.\n\nלחתימה: ${url}\n\nבברכה,\nסטודיו מיכל וולברגר`,
    });
    toast.success(`נשלח למייל ${client.email}`);
    setSending(false);
  };

  if (doc.signature_status === 'signed') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
          <CheckCircle2 className="w-3 h-3" /> נחתם
        </Badge>
        <span className="text-xs text-muted-foreground">
          {doc.signer_name} • {doc.signed_at ? format(new Date(doc.signed_at), 'dd/MM/yyyy HH:mm') : ''}
        </span>
      </div>
    );
  }

  if (doc.signature_status === 'pending_signature') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
          <Clock className="w-3 h-3" /> ממתין לחתימה
        </Badge>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={handleCopyLink}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'הועתק' : 'העתק קישור'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={handleSendEmail} disabled={sending}>
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          שלח במייל
        </Button>
      </div>
    );
  }

  // draft or no status
  return (
    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={handleSendForSignature} disabled={sending}>
      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
      שלח לחתימה
    </Button>
  );
}