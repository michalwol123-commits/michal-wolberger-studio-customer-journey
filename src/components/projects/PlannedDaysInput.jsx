import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PlannedDaysInput({ project, onSuccess }) {
  const [edit, setEdit] = useState(false);
  const [values, setValues] = useState({
    shopping_days_planned: project.shopping_days_planned || 0,
    supervision_days_planned: project.supervision_days_planned || 0,
    installation_days_planned: project.installation_days_planned || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Project.update(project.id, values);
      toast.success('הימים המתוכננים נשמרו');
      setEdit(false);
      onSuccess?.();
    } catch (e) {
      toast.error('שגיאה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!edit) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> תכנון ימים
              </h3>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                <p>🛒 קניות: {values.shopping_days_planned} ימים</p>
                <p>👁️ פיקוח: {values.supervision_days_planned} ימים</p>
                <p>🔨 התקנות: {values.installation_days_planned} ימים</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              עריכה
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">ימי קניות מתוכננים</label>
          <Input
            type="number"
            min="0"
            value={values.shopping_days_planned}
            onChange={(e) => setValues({ ...values, shopping_days_planned: parseInt(e.target.value) || 0 })}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">ימי פיקוח מתוכננים</label>
          <Input
            type="number"
            min="0"
            value={values.supervision_days_planned}
            onChange={(e) => setValues({ ...values, supervision_days_planned: parseInt(e.target.value) || 0 })}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">ימי התקנות מתוכננים</label>
          <Input
            type="number"
            min="0"
            value={values.installation_days_planned}
            onChange={(e) => setValues({ ...values, installation_days_planned: parseInt(e.target.value) || 0 })}
            className="mt-1 text-sm"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setEdit(false)}>
            <X className="w-4 h-4 ml-1" /> ביטול
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 ml-1" /> {saving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}