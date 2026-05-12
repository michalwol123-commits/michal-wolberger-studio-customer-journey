import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DetailedQuestionnaireResults from '@/components/portal/DetailedQuestionnaireResults';

export default function DetailedQuestionnairePreview({ questionnaires, projectId, clientId }) {
  const detailedQ = questionnaires.find(q => q.type === 'detailed');
  const queryClient = useQueryClient();

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

  // Created but pending — show waiting state
  if (detailedQ) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary/40 mx-auto animate-spin" />
          <p className="font-medium">שאלון מפורט ממתין למילוי הלקוח</p>
          <p className="text-sm text-muted-foreground">
            השאלון יופיע ללקוח בפורטל כשהפרויקט יגיע לשלב 5
          </p>
        </CardContent>
      </Card>
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