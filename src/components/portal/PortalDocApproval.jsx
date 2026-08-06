import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import ArtIcon from './ArtIcon';

export default function PortalDocApproval({ documents, projectId }) {
  const pendingDocs = documents.filter(d =>
    d.visible_to_client && d.approval_status === 'pending' && d.is_current !== false
  );

  if (pendingDocs.length === 0) return null;

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="doc" size={48} />
        <div>
          <p className="p-label mb-0.5">ממתין לך</p>
          <h3 className="p-display text-lg">מסמכים לאישור ({pendingDocs.length})</h3>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {pendingDocs.map(doc => (
          <ApprovalRow key={doc.id} doc={doc} projectId={projectId} />
        ))}
      </div>
    </div>
  );
}

function ApprovalRow({ doc, projectId }) {
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ status }) => base44.entities.Document.update(doc.id, {
      approval_status: status,
      ...(status === 'rejected' && rejectReason ? { notes: rejectReason } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-stage-docs'] });
      queryClient.invalidateQueries({ queryKey: ['portal-approval-docs'] });
    },
  });

  return (
    <div className="p-4 space-y-3" style={{ border: '1px solid #e8e0d8' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#2a1f18' }}>{doc.name}</p>
          {doc.version_number > 1 && (
            <p className="p-label mt-0.5">גרסה {doc.version_number}</p>
          )}
        </div>
        {doc.file_url && (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
            className="text-xs shrink-0 underline" style={{ color: '#8a7060' }}>
            לצפייה ←
          </a>
        )}
      </div>

      {!showReject ? (
        <div className="flex gap-2">
          <button
            className="p-btn flex-1 text-sm !py-2.5"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status: 'approved' })}
          >
            {mutation.isPending ? 'רק רגע...' : 'אישור'}
          </button>
          <button
            className="p-btn-outline flex-1 text-sm !py-2.5"
            onClick={() => setShowReject(true)}
          >
            דחייה
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="סיבת הדחייה (אופציונלי)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="h-16 text-sm"
          />
          <div className="flex gap-2">
            <button
              className="p-btn flex-1 text-sm !py-2.5"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ status: 'rejected' })}
            >
              {mutation.isPending ? 'רק רגע...' : 'אישור דחייה'}
            </button>
            <button
              className="p-btn-outline flex-1 text-sm !py-2.5"
              onClick={() => setShowReject(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}