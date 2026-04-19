import React from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Check, X } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { motion } from 'framer-motion';

export default function PortalWelcome() {
  const { client } = usePortal();
  const queryClient = useQueryClient();

  const { data: quotes = [] } = useQuery({
    queryKey: ['portal-quotes', client.id],
    queryFn: () => base44.entities.Quote.filter({ client_id: client.id }),
  });

  // Get latest sent/viewed quote only
  const latestQuote = quotes
    .filter(q => ['sent', 'viewed'].includes(q.status))
    .sort((a, b) => (b.version || 0) - (a.version || 0))[0];

  const updateQuote = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-quotes'] }),
  });

  const handleApprove = () => {
    updateQuote.mutate({ id: latestQuote.id, data: { status: 'approved', approved_at: new Date().toISOString() } });
  };

  const handleReject = () => {
    updateQuote.mutate({ id: latestQuote.id, data: { status: 'rejected' } });
  };

  const handleMarkViewed = () => {
    if (latestQuote && latestQuote.status === 'sent') {
      updateQuote.mutate({ id: latestQuote.id, data: { status: 'viewed', viewed_at: new Date().toISOString() } });
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2">ברוך הבא, {client.name}</h1>
          <p className="text-muted-foreground">הפורטל האישי שלך בסטודיו מיכל וולברגר</p>
        </div>
      </motion.div>

      {latestQuote ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-heading">
                <FileText className="w-5 h-5 text-primary" />
                הצעת מחיר
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="font-medium">{latestQuote.title}</p>
                  <p className="text-2xl font-bold font-heading mt-1">₪{latestQuote.total_amount?.toLocaleString()}</p>
                  {latestQuote.scope && <p className="text-sm text-muted-foreground mt-2">{latestQuote.scope}</p>}
                </div>
                <StatusBadge status={latestQuote.status} />
              </div>

              {latestQuote.url && (
                <a
                  href={latestQuote.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleMarkViewed}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  צפה בהצעה המלאה
                </a>
              )}

              {['sent', 'viewed'].includes(latestQuote.status) && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleApprove} disabled={updateQuote.isPending} className="gap-2 flex-1">
                    <Check className="w-4 h-4" />
                    אישור הצעה
                  </Button>
                  <Button onClick={handleReject} disabled={updateQuote.isPending} variant="outline" className="gap-2 flex-1">
                    <X className="w-4 h-4" />
                    דחיית הצעה
                  </Button>
                </div>
              )}

              {latestQuote.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-center text-sm">
                  ההצעה אושרה בהצלחה! מיכל תיצור איתך קשר בקרוב.
                </div>
              )}

              {latestQuote.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center text-sm">
                  ההצעה נדחתה. אם ברצונך לדון בשינויים, אנא פני למיכל.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">טרם הוכנה הצעת מחיר עבורך.</p>
              <p className="text-sm text-muted-foreground mt-1">מיכל תעדכן אותך ברגע שההצעה תהיה מוכנה.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}