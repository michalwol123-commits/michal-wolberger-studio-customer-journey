import React, { useState } from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import ArtIcon from './ArtIcon';

export default function PortalCompleted({ project, onBack }) {
  const { client } = usePortal();
  const queryClient = useQueryClient();
  const [nps, setNps] = useState(project.nps_score || null);
  const [submitted, setSubmitted] = useState(!!project.nps_score);

  const { data: documents = [] } = useQuery({
    queryKey: ['portal-docs', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
  });

  const visibleDocs = documents.filter(d => d.visible_to_client && d.is_current !== false);

  const updateProject = useMutation({
    mutationFn: (data) => base44.entities.Project.update(project.id, data),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['portal-projects'] });
    },
  });

  const handleNps = (score) => {
    setNps(score);
    updateProject.mutate({ nps_score: score });
  };

  return (
    <div className="space-y-10">
      {onBack && (
        <button onClick={onBack} className="p-btn-outline text-sm !py-2 !px-5">
          <span>→</span> חזרה לרשימת הפרויקטים
        </button>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-card text-center py-14 px-8">
          <div className="flex justify-center mb-6">
            <ArtIcon name="heart" size={96} />
          </div>
          <p className="p-label mb-3">מסע שהושלם</p>
          <h1 className="p-display text-3xl md:text-4xl mb-3" style={{ fontWeight: 300 }}>הפרויקט הושלם!</h1>
          <p className="text-base mb-1" style={{ color: '#4a3728' }}>{project.name}</p>
          <p className="text-sm" style={{ color: '#8a7060' }}>תודה שבחרת בסטודיו מיכל וולברגר</p>
        </div>
      </motion.div>

      {/* NPS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="p-card">
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
            <ArtIcon name="chat" size={48} />
            <div>
              <p className="p-label mb-0.5">המשוב שלך</p>
              <h3 className="p-display text-lg">איך הייתה החוויה?</h3>
            </div>
          </div>
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-4">
                <p className="p-display text-3xl">{nps}/10</p>
                <p className="text-sm mt-2" style={{ color: '#8a7060' }}>תודה על המשוב!</p>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-5 text-center" style={{ color: '#8a7060' }}>דרג/י את החוויה מ-1 עד 10</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                    <button
                      key={score}
                      onClick={() => handleNps(score)}
                      disabled={updateProject.isPending}
                      className="w-10 h-10 rounded-full text-sm transition-all"
                      style={nps === score
                        ? { background: '#2a1f18', color: '#f5f0eb', border: '1.5px solid #2a1f18', transform: 'scale(1.1)' }
                        : { background: 'transparent', color: '#4a3728', border: '1.5px solid #4a3728' }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Historical Documents */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="p-card">
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
            <ArtIcon name="doc" size={48} floatDelay={1} />
            <div>
              <p className="p-label mb-0.5">ארכיון</p>
              <h3 className="p-display text-lg">מסמכי הפרויקט</h3>
            </div>
          </div>
          <div className="p-5">
            {visibleDocs.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#8a7060' }}>אין מסמכים</p>
            ) : (
              <div className="space-y-2">
                {visibleDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 transition-colors group"
                    style={{ border: '1px solid #e8e0d8' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#2a1f18' }}>{doc.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>
                        {doc.type && <span>{doc.type}</span>}
                        {doc.stage && ` · שלב ${doc.stage}`}
                      </p>
                    </div>
                    <span className="text-sm transition-transform group-hover:-translate-x-1" style={{ color: '#8a7060' }}>←</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}