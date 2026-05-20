import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function ProjectOverview({ project }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    project_goals: project.project_goals || '',
    spaces: project.spaces || '',
    constraints: project.constraints || '',
    notes: project.notes || '',
  });
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditing(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleCancel = () => {
    setForm({
      project_goals: project.project_goals || '',
      spaces: project.spaces || '',
      constraints: project.constraints || '',
      notes: project.notes || '',
    });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">תקציב</p><p className="text-lg font-bold">₪{(project.total_budget || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">התקדמות</p><p className="text-lg font-bold">{project.progress || 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">תאריך התחלה</p><p className="text-lg font-bold">{project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">סיום משוער</p><p className="text-lg font-bold">{project.end_date_est ? format(new Date(project.end_date_est), 'dd/MM/yyyy') : '—'}</p></CardContent></Card>
      </div>

      {/* Editable details */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">פרטי הפרויקט</h3>
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-muted-foreground">
                <Pencil className="w-3.5 h-3.5" />
                עריכה
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="gap-1" disabled={saveMutation.isPending}>
                  <Check className="w-3.5 h-3.5" />
                  שמור
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1">
                  <X className="w-3.5 h-3.5" />
                  ביטול
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">מטרות / מה ישדר הבית</Label>
                <Textarea value={form.project_goals} onChange={e => setForm(p => ({ ...p, project_goals: e.target.value }))} placeholder="לדוגמה: חמימות, מודרניות, שלווה..." className="min-h-16" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">חללים בפרויקט</Label>
                <Input value={form.spaces} onChange={e => setForm(p => ({ ...p, spaces: e.target.value }))} placeholder="לדוגמה: סלון, מטבח, חדר שינה..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">אילוצים</Label>
                <Textarea value={form.constraints} onChange={e => setForm(p => ({ ...p, constraints: e.target.value }))} placeholder="אילוצים מבניים/תקציביים..." className="min-h-16" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">הערות</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות נוספות..." className="min-h-16" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {project.project_goals && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">מטרות / מה ישדר הבית</span>
                  <p className="whitespace-pre-line">{project.project_goals}</p>
                </div>
              )}
              {project.spaces && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">חללים</span>
                  <p>{project.spaces}</p>
                </div>
              )}
              {project.constraints && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">אילוצים</span>
                  <p className="whitespace-pre-line">{project.constraints}</p>
                </div>
              )}
              {project.notes && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">הערות</span>
                  <p className="whitespace-pre-line">{project.notes}</p>
                </div>
              )}
              {!project.project_goals && !project.spaces && !project.constraints && !project.notes && (
                <p className="text-muted-foreground text-center py-4">אין פרטים עדיין — לחצי על "עריכה" להוסיף</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}