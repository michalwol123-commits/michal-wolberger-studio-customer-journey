import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary border border-primary/30',
  completed: 'bg-green-100 text-green-700 border border-green-300',
  delayed: 'bg-red-100 text-red-700 border border-red-300',
};

const statusLabels = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  delayed: 'מעוכב',
};

export default function PortalGanttView({ project }) {
  const { data: milestones = [] } = useQuery({
    queryKey: ['portal-gantt', project.id],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: project.id }),
  });

  const sorted = [...milestones].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  if (sorted.length === 0) return null;

  const chartStart = new Date(sorted[0].start_date);
  const chartEnd = new Date(Math.max(...sorted.map(m => new Date(m.end_date).getTime())));
  const totalDays = Math.max(differenceInDays(chartEnd, chartStart), 1);

  // Generate month markers
  const months = [];
  const cursor = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1);
  while (cursor <= chartEnd) {
    const dayOffset = differenceInDays(cursor, chartStart);
    months.push({ label: format(cursor, 'MMM yyyy'), offset: Math.max(dayOffset, 0) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          ציר זמן — אבני דרך
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Month header */}
        <div className="relative h-6 mb-2 border-b border-border">
          {months.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-muted-foreground"
              style={{ right: `${(m.offset / totalDays) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="space-y-2">
          {sorted.map(m => {
            const start = differenceInDays(new Date(m.start_date), chartStart);
            const duration = Math.max(differenceInDays(new Date(m.end_date), new Date(m.start_date)), 1);
            const rightPct = (start / totalDays) * 100;
            const widthPct = Math.max((duration / totalDays) * 100, 3);

            return (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-xs w-24 shrink-0 truncate text-right font-medium">{m.title}</span>
                <div className="relative flex-1 h-7 bg-muted/30 rounded">
                  <div
                    className={`absolute h-full rounded flex items-center justify-center text-[10px] font-medium ${statusColors[m.status] || statusColors.pending}`}
                    style={{ right: `${rightPct}%`, width: `${widthPct}%`, minWidth: '2rem' }}
                  >
                    {widthPct > 8 && (statusLabels[m.status] || '')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-[10px]">
          {Object.entries(statusLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${statusColors[key]}`} />
              {label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}