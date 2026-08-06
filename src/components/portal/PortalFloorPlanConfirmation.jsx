import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import ArtIcon from './ArtIcon';

export default function PortalFloorPlanConfirmation({ project }) {
  const queryClient = useQueryClient();
  const isLocked = !!project.floor_plan_locked;
  const [justApproved, setJustApproved] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => base44.entities.Project.update(project.id, { floor_plan_locked: true }),
    onSuccess: () => {
      setJustApproved(true);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portal-project'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => base44.entities.Project.update(project.id, { floor_plan_locked: false }),
    onSuccess: () => {
      setJustApproved(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portal-project'] });
    },
  });

  if (isLocked || justApproved) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="p-8 text-center space-y-4" style={{ background: '#eef0e4', border: '1px solid #6b7a4f' }}>
          <div className="flex justify-center">
            <ArtIcon name="check" size={64} />
          </div>
          <h3 className="p-display text-xl" style={{ color: '#6b7a4f' }}>תכנית העמדה אושרה!</h3>
          <p className="text-sm" style={{ color: '#6b7a4f' }}>תודה! מיכל תמשיך לשלב הבא.</p>
          <button
            className="text-xs underline"
            style={{ color: '#8a7060' }}
            onClick={() => revokeMutation.mutate()}
            disabled={revokeMutation.isPending}
          >
            ביטול אישור תכנית
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="p-card p-8 text-center space-y-5">
        <div className="flex justify-center">
          <ArtIcon name="pen" size={72} />
        </div>
        <div>
          <p className="p-label mb-2">רגע חשוב</p>
          <h3 className="p-display text-xl">אישור תכנית העמדה</h3>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: '#8a7060' }}>
            לאחר עיון בתכניות, לחצו כאן לאישור סופי. לאחר האישור לא ניתן לשנות את תכנית העמדה.
          </p>
        </div>
        <button
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
          className="p-btn"
        >
          {approveMutation.isPending ? 'רק רגע...' : 'מאשר/ת את תכנית העמדה'} <span className="p-arrow">←</span>
        </button>
      </div>
    </motion.div>
  );
}