import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Check, X, Download, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function PortalDocApproval({ documents, projectId }) {
  const pendingDocs = documents.filter(d =>
    d.visible_to_client && d.approval_status === 'pending' && d.is_current !== false
  );

  if (pendingDocs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          מסמכים לאישור ({pendingDocs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingDocs.map(doc => (
          <ApprovalRow key={doc.id} doc={doc} projectId={projectId} />
        ))}
      </CardContent>
    </Card>
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
    <div className="p-3 rounded-xl border border-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{doc.name}</span>
          {doc.version_number > 1 && (
            <span className="text-[10px] text-muted-foreground">גרסה {doc.version_number}</span>
          )}
        </div>
        {doc.file_url && (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </a>
        )}
      </div>

      {!showReject ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ status: 'approved' })}
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            אישור
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => setShowReject(true)}
          >
            <X className="w-3.5 h-3.5" />
            דחייה
          </Button>
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
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 gap-1"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ status: 'rejected' })}
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              אישור דחייה
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => setShowReject(false)}
            >
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}