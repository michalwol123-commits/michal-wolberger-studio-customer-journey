import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Send, Loader2, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import DetailedQuestionnaireResults from '@/components/portal/DetailedQuestionnaireResults';
import SendQuestionnaireDialog from '@/components/questionnaire/SendQuestionnaireDialog';

export default function DetailedQuestionnairePreview({ questionnaires, projectId, clientId }) {
  const detailedQ = questionnaires.find(q => q.type === 'detailed');
  const queryClient = useQueryClient();
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: clientArr = [] } = useQuery({
    queryKey: ['client-for-q', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    enabled: !!clientId,
  });
  const client = clientArr[0];

  const getPortalUrl = () => {
    if (!client?.portal_token || client.portal_token_revoked) return null;
    return `${window.location.origin}/portal?token=${client.portal_token}`;
  };

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Questionnaire.create({
      type: 'detailed',
      status: 'pending',
      stage: 5,
      client_id: clientId,
      project_id: projectId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('שאלון מפורט נוצר — הלקוח יראה אותו בפורטל בשלב 5');
    },
  });

  // Already submitted — show results
  if (detailedQ?.status === 'submitted') {
    return <DetailedQuestionnaireResults questionnaire={detailedQ} />;
  }

  // Created but pending — show waiting state + send option
  if (detailedQ) {
    const portalUrl = getPortalUrl();
    return (
      <>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary/40 mx-auto animate-spin" />
            <p className="font-medium">שאלון מפורט ממתין למילוי הלקוח</p>
            <p className="text-sm text-muted-foreground">
              השאלון יופיע ללקוח בפורטל כשהפרויקט יגיע לשלב 5
            </p>
            {client && portalUrl && (
              <Button size="sm" variant="outline" onClick={() => setShowSendDialog(true)} className="gap-1">
                <MessageSquare className="w-4 h-4" />
                שלח לינק ללקוח
              </Button>
            )}
            {client && !portalUrl && (
              <p className="text-xs text-muted-foreground">⚠️ יש ליצור קישור פורטל ללקוח כדי לשלוח</p>
            )}
          </CardContent>
        </Card>
        {showSendDialog && client && portalUrl && (
          <SendQuestionnaireDialog
            open={showSendDialog}
            onOpenChange={setShowSendDialog}
            client={client}
            questionnaireType="detailed"
            questionnaireLink={portalUrl}
          />
        )}
      </>
    );
  }

  // No detailed questionnaire yet — offer to create
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-3">
        <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="font-medium">שאלון מפורט (שלב 5)</p>
        <p className="text-sm text-muted-foreground">
          השאלון יוצג ללקוח בפורטל כשהפרויקט יגיע לשלב 5. ניתן ליצור אותו מראש.
        </p>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          צרי שאלון מפורט
        </Button>
      </CardContent>
    </Card>
  );
}