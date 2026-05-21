import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare, Mail, Copy, Check, Loader2, Send } from 'lucide-react';

/**
 * Dialog to send a questionnaire link to a client via WhatsApp, Email, or copy link.
 * Props:
 *   open, onOpenChange
 *   client — client object (needs id, name, phone, email, portal_token)
 *   questionnaireType — 'short' | 'detailed'
 *   questionnaireLink — full URL to the questionnaire
 */
export default function SendQuestionnaireDialog({ open, onOpenChange, client, questionnaireType, questionnaireLink }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const typeLabel = questionnaireType === 'short' ? 'שאלון קצר' : 'שאלון מפורט';

  const messageContent = questionnaireType === 'short'
    ? `שלום ${client?.name || ''} 👋\nנעים מאוד! לקראת שיחת ההיכרות שלנו, אשמח שתקדישו מספר דקות למילוי שאלון קצר:\n${questionnaireLink}\nתודה רבה 💛\nמיכל וולברגר — עיצוב פנים`
    : `שלום ${client?.name || ''} 👋\nהפרויקט שלכם מתקדם! 🎉\nאשמח שתמלאו את השאלון המפורט — זה יעזור לי לדייק את העיצוב:\n${questionnaireLink}\nתודה רבה 💛\nמיכל וולברגר — עיצוב פנים`;

  const emailSubject = questionnaireType === 'short'
    ? 'שאלון טרום שיחת היכרות — סטודיו מיכל וולברגר'
    : 'שאלון מפורט — סטודיו מיכל וולברגר';

  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Communication.create({
        client_id: client.id,
        type: 'whatsapp',
        direction: 'outbound',
        content: messageContent,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
        subject: typeLabel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success(`${typeLabel} נשלח בוואטסאפ ל-${client.name}`);
      onOpenChange(false);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Communication.create({
        client_id: client.id,
        type: 'email',
        direction: 'outbound',
        content: messageContent,
        subject: emailSubject,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success(`${typeLabel} נשלח במייל ל-${client.name}`);
      onOpenChange(false);
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(questionnaireLink);
    setCopied(true);
    toast.success('הלינק הועתק!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSending = sendWhatsAppMutation.isPending || sendEmailMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Send className="w-5 h-5" />
            שליחת {typeLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          ל-{client?.name} • {typeLabel}
        </p>
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded break-all" dir="ltr">
          {questionnaireLink}
        </p>
        <div className="space-y-2 pt-2">
          <Button
            className="w-full gap-2 justify-start"
            variant="outline"
            onClick={() => sendWhatsAppMutation.mutate()}
            disabled={!client?.phone || isSending}
          >
            {sendWhatsAppMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            שלח בוואטסאפ
            {!client?.phone && <span className="text-xs text-destructive mr-auto">(אין טלפון)</span>}
          </Button>
          <Button
            className="w-full gap-2 justify-start"
            variant="outline"
            onClick={() => sendEmailMutation.mutate()}
            disabled={!client?.email || isSending}
          >
            {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            שלח במייל
            {!client?.email && <span className="text-xs text-destructive mr-auto">(אין מייל)</span>}
          </Button>
          <Button
            className="w-full gap-2 justify-start"
            variant="outline"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'הועתק!' : 'העתק לינק'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-1">
          💡 הלקוח יכול גם למלא ישירות מהפורטל
        </p>
      </DialogContent>
    </Dialog>
  );
}