import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AgentModeCard() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['agentSettings'],
    queryFn: async () => (await base44.entities.AgentSettings.list())[0] || null,
  });
  const preview = settings?.preview_mode !== false;

  const toggle = useMutation({
    mutationFn: (val) => settings
      ? base44.entities.AgentSettings.update(settings.id, { preview_mode: val })
      : base44.entities.AgentSettings.create({ preview_mode: val }),
    onSuccess: (_, val) => {
      qc.invalidateQueries({ queryKey: ['agentSettings'] });
      toast.success(val ? 'מצב דוגמה הופעל' : 'הסוכן ישלח ישירות ללקוחות');
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">שליחת הודעות ע״י הסוכן</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium">{preview ? 'מצב דוגמה' : 'שליחה ללקוחות'}</p>
          <p className="text-muted-foreground">
            {preview
              ? `ההודעות נשלחות אלייך לבדיקה (${settings?.preview_email || ''} · ${settings?.preview_phone || ''})`
              : 'ההודעות נשלחות ישירות ללקוח בוואטסאפ, ובמייל אם קיים'}
          </p>
        </div>
        <Switch checked={!preview} onCheckedChange={(v) => toggle.mutate(!v)} disabled={toggle.isPending} />
      </CardContent>
    </Card>
  );
}