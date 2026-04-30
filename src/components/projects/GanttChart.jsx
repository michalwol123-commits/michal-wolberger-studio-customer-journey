import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format, differenceInDays, parseISO, min as minDate, max as maxDate } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import AddMilestoneDialog from './AddMilestoneDialog';

const STATUS_COLORS = {
  pending: 'bg-gray-300',
  in_progress: 'bg-blue-500',
  completed: 'bg-emerald-500',
  delayed: 'bg-red-500',
};

const STATUS_LABELS = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  delayed: 'מעוכב',
};

export default function GanttChart({ projectId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: projectId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectMilestone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  });

  // Calculate chart boundaries
  const { chartStart, chartEnd, totalDays } = useMemo(() => {
    if (milestones.length === 0) return { chartStart: null, chartEnd: null, totalDays: 0 };
    const starts = milestones.map(m => parseISO(m.start_date));
    const ends = milestones.map(m => parseISO(m.end_date));
    const cs = minDate(starts);
    const ce = maxDate(ends);
    return { chartStart: cs, chartEnd: ce, totalDays: differenceInDays(ce, cs) + 1 };
  }, [milestones]);

  // Generate month headers
  const monthHeaders = useMemo(() => {
    if (!chartStart || totalDays === 0) return [];
    const headers = [];
    let current = new Date(chartStart);
    while (current <= chartEnd) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const visibleStart = current > chartStart ? current : chartStart;
      const visibleEnd = monthEnd < chartEnd ? monthEnd : chartEnd;
      const left = (differenceInDays(visibleStart, chartStart) / totalDays) * 100;
      const width = ((differenceInDays(visibleEnd, visibleStart) + 1) / totalDays) * 100;
      headers.push({
        label: format(monthStart, 'MMM yyyy'),
        left,
        width,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return headers;
  }, [chartStart, chartEnd, totalDays]);

  const sorted = [...milestones].sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3 text-xs">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[key]}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditMilestone(null); setShowAdd(true); }} className="gap-1">
          <Plus className="w-4 h-4" />אבן דרך
        </Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState title="אין אבני דרך" description="הוסיפי אבני דרך לפרויקט" />
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          {/* Month headers */}
          <div className="relative h-8 bg-muted/50 border-b">
            {monthHeaders.map((h, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center px-2 text-xs font-medium text-muted-foreground border-r first:border-r-0"
                style={{ left: `${h.left}%`, width: `${h.width}%` }}
              >
                {h.label}
              </div>
            ))}
          </div>

          {/* Gantt rows */}
          <div className="divide-y">
            {sorted.map(m => {
              const start = parseISO(m.start_date);
              const end = parseISO(m.end_date);
              const left = (differenceInDays(start, chartStart) / totalDays) * 100;
              const width = ((differenceInDays(end, start) + 1) / totalDays) * 100;

              return (
                <div key={m.id} className="flex items-center h-12 group">
                  {/* Label */}
                  <div className="w-48 shrink-0 px-4 text-sm font-medium truncate border-l">
                    {m.stage && <span className="text-xs text-muted-foreground ml-1">({m.stage})</span>}
                    {m.title}
                  </div>
                  {/* Bar area */}
                  <div className="flex-1 relative h-full">
                    <div
                      className={`absolute top-2.5 h-7 rounded-md ${STATUS_COLORS[m.status]} opacity-85 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                      title={`${format(start, 'dd/MM')} — ${format(end, 'dd/MM')}`}
                    >
                      <span className="text-white text-xs truncate font-medium">
                        {format(start, 'dd/MM')} - {format(end, 'dd/MM')}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="absolute left-2 top-2.5 hidden group-hover:flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditMilestone(m); setShowAdd(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(m.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddMilestoneDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditMilestone(null); }}
        projectId={projectId}
        initialData={editMilestone}
      />
    </div>
  );
}