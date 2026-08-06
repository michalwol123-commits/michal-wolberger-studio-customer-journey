import React from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import ArtIcon from '@/components/portal/ArtIcon';
import MichalContactCard from '@/components/portal/MichalContactCard';

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
    <div className="space-y-12 md:space-y-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <ArtIcon name="wave" size={104} />
          </div>
          <p className="p-label mb-3">מיכל וולברגר · סטודיו לעיצוב פנים</p>
          <h1 className="p-display text-3xl md:text-4xl mb-4" style={{ fontWeight: 300 }}>
            הבית שחלמת עליו מתחיל כאן
          </h1>
          <p className="max-w-md mx-auto leading-relaxed" style={{ color: '#4a3728' }}>
            כאן מתחיל המסע לבית שתמיד חלמת עליו — הכל במקום אחד, בקצב שלך.
          </p>
        </div>
      </motion.div>

      {latestQuote ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="p-card overflow-hidden">
            {/* פס עליון */}
            <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid #e8e0d8' }}>
              <div className="flex justify-center mb-4">
                <ArtIcon name="doc" size={56} />
              </div>
              <p className="p-label mb-2">הצעת מחיר עבורך</p>
              <h2 className="p-display text-2xl md:text-3xl">{latestQuote.title}</h2>
            </div>

            <div className="px-8 py-8 space-y-6 text-center">
              <div>
                <p className="p-label mb-2">סה״כ השקעה</p>
                <p className="p-display text-4xl md:text-5xl" style={{ fontWeight: 400 }}>
                  ₪{latestQuote.total_amount?.toLocaleString()}
                </p>
              </div>

              {latestQuote.scope && (
                <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#4a3728' }}>
                  {latestQuote.scope}
                </p>
              )}

              {latestQuote.url && (
                <a
                  href={latestQuote.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleMarkViewed}
                  className="p-btn-outline text-sm"
                >
                  לצפייה בהצעה המלאה <span className="p-arrow">←</span>
                </a>
              )}

              {['sent', 'viewed'].includes(latestQuote.status) && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
                  <button onClick={handleApprove} disabled={updateQuote.isPending} className="p-btn flex-1">
                    אישור ההצעה <span className="p-arrow">←</span>
                  </button>
                  <button onClick={handleReject} disabled={updateQuote.isPending} className="p-btn-outline flex-1">
                    דחיית ההצעה
                  </button>
                </div>
              )}

              {latestQuote.status === 'approved' && (
                <div className="p-5 text-sm" style={{ background: '#eef0e4', border: '1px solid #6b7a4f', color: '#6b7a4f' }}>
                  ההצעה אושרה בהצלחה! מיכל תיצור איתך קשר בקרוב.
                </div>
              )}

              {latestQuote.status === 'rejected' && (
                <div className="p-5 text-sm" style={{ background: '#f0ebe4', border: '1px solid #8a7060', color: '#8a7060' }}>
                  ההצעה נדחתה. אם ברצונך לדון בשינויים, אנא פני למיכל.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="p-card py-16 text-center">
            <div className="flex justify-center mb-6">
              <ArtIcon name="compass" size={88} />
            </div>
            <p className="p-display text-xl mb-2">טרם הוכנה הצעת מחיר עבורך</p>
            <p className="text-sm" style={{ color: '#8a7060' }}>מיכל תעדכן אותך ברגע שההצעה תהיה מוכנה.</p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
        <MichalContactCard />
      </motion.div>
    </div>
  );
}