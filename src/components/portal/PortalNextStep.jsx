import React from 'react';
import { motion } from 'framer-motion';
import ArtIcon from '@/components/portal/ArtIcon';

// כרטיס "הצעד הבא שלך" — UI בלבד על נתונים שכבר נטענו בהורה.
// action: { icon, label, title, description, buttonLabel, onClick }
export default function PortalNextStep({ action }) {
  if (!action) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div
        className="flex flex-col sm:flex-row items-center gap-6 p-6 md:p-8"
        style={{ background: '#c8bdb2', border: '1px solid #2a1f18' }}
      >
        <ArtIcon name={action.icon || 'doc'} size={64} />
        <div className="flex-1 text-center sm:text-right">
          <p className="p-label mb-1" style={{ color: '#4a3728' }}>{action.label || 'הצעד הבא שלך'}</p>
          <h3 className="p-display text-xl md:text-2xl mb-1">{action.title}</h3>
          {action.description && (
            <p className="text-sm" style={{ color: '#4a3728' }}>{action.description}</p>
          )}
        </div>
        {action.onClick && (
          <button onClick={action.onClick} className="p-btn shrink-0">
            {action.buttonLabel || 'קדימה'} <span className="p-arrow">←</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}