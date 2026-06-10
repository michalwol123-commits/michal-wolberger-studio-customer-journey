import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PenLine, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-2 border-green-300 bg-green-50/50">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-heading font-bold text-xl text-green-700">תכנית העמדה אושרה!</h3>
            <p className="text-sm text-green-600">תודה! מיכל תמשיך לשלב הבא.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-600 hover:bg-red-50 gap-1"
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
            >
              <XCircle className="w-3.5 h-3.5" />
              ביטול אישור תכנית
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5efe6, #ede0d0)' }}>
            <PenLine className="w-7 h-7" style={{ color: '#8B7355' }} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg">אישור תכנית העמדה</h3>
            <p className="text-sm text-muted-foreground mt-1">
              לאחר עיון בתכניות, לחצו כאן לאישור סופי. לאחר האישור לא ניתן לשנות את תכנית העמדה.
            </p>
          </div>
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="gap-2 px-8"
            style={{ background: '#8B7355' }}
          >
            {approveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
            מאשר/ת את תכנית העמדה ✍️
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}