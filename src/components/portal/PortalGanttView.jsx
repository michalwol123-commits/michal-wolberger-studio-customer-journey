import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import ArtIcon from './ArtIcon';

const statusStyles = {
  pending: { background: '#f0ebe4', color: '#8a7060', border: '1px solid #e0d8ce' },
  in_progress: { background: '#2a1f18', color: '#f5f0eb', border: '1px solid #2a1f18' },
  completed: { background: '#eef0e4', color: '#6b7a4f', border: '1px solid #6b7a4f' },
  delayed: { background: '#f0ebe4', color: '#8a5a4a', border: '1px solid #8a5a4a' },
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
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="gantt" size={48} floatDelay={2} />
        <div>
          <p className="p-label mb-0.5">לוח זמנים</p>
          <h3 className="p-display text-lg">ציר זמן — אבני דרך</h3>
        </div>
      </div>
      <div className="p-5">
        {/* Month header */}
        <div className="relative h-6 mb-3" style={{ borderBottom: '1px solid #e8e0d8' }}>
          {months.map((m, i) => (
            <span
              key={i}
              className="absolute p-label !text-[10px]"
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
                <span className="text-xs w-24 shrink-0 truncate text-right" style={{ color: '#4a3728' }}>{m.title}</span>
                <div className="relative flex-1 h-7" style={{ background: '#f5f0eb' }}>
                  <div
                    className="absolute h-full flex items-center justify-center text-[10px]"
                    style={{ right: `${rightPct}%`, width: `${widthPct}%`, minWidth: '2rem', ...(statusStyles[m.status] || statusStyles.pending) }}
                  >
                    {widthPct > 8 && (statusLabels[m.status] || '')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-5">
          {Object.entries(statusLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 p-label !text-[10px]">
              <span className="w-3 h-3 inline-block" style={statusStyles[key]} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}