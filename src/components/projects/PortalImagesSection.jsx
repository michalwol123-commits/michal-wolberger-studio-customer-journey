import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const FIELDS = [
  { key: 'portal_hero_url', label: 'תמונת כותרת', hint: 'התמונה הגדולה בראש הפורטל' },
  { key: 'portal_bg_url', label: 'תמונת רקע', hint: 'תמונה שקופה מאחורי סקשנים בפורטל' },
  { key: 'portal_divider_url', label: 'רצועת מפריד', hint: 'הרצועה הרחבה בין הסקשנים בפורטל' },
];

export default function PortalImagesSection({ project }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);

  const save = async (key, value) => {
    setBusy(key);
    await base44.entities.Project.update(project.id, { [key]: value });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
    setBusy(null);
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setBusy(key);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Project.update(project.id, { [key]: file_url });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
    setBusy(null);
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-sm">תמונות הפורטל</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            התמונות שהלקוחה רואה בפורטל שלה. אם לא הועלתה תמונה — תוצג תמונת ברירת המחדל של הסטודיו.
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={!!project.portal_plain_bg}
            disabled={busy === 'portal_plain_bg'}
            onCheckedChange={v => save('portal_plain_bg', !!v)}
          />
          <span>
            <span className="text-sm font-medium">רקע חלק בצבע בז' (בלי תמונות)</span>
            <span className="block text-xs text-muted-foreground">
              גובר על התמונות שהועלו — הן נשמרות ויחזרו כשמכבים את הסימון.
            </span>
          </span>
        </label>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${project.portal_plain_bg ? 'opacity-40 pointer-events-none' : ''}`}>
          {FIELDS.map(f => {
            const url = project[f.key];
            const loading = busy === f.key;
            return (
              <div key={f.key} className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>

                <div className="h-28 w-full rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : url ? (
                    <img src={url} alt={f.label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">ברירת מחדל של הסטודיו</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label>
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs pointer-events-none">
                      <Upload className="w-3.5 h-3.5" />
                      {url ? 'החלפה' : 'העלאה'}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading}
                      onChange={e => handleUpload(f.key, e.target.files?.[0])}
                    />
                  </label>
                  {url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 h-8 text-xs text-destructive"
                      disabled={loading}
                      onClick={() => save(f.key, '')}
                    >
                      <X className="w-3.5 h-3.5" />
                      הסרה
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}