import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

function DayRing({ label, icon, planned, actual }) {
  if (!planned) return null;
  const pct = Math.min((actual / planned) * 100, 100);
  const remaining = Math.max(0, planned - actual);

  // green → orange → red
  let color = '#22c55e';
  if (pct > 75) color = '#f97316';
  if (pct >= 100) color = '#ef4444';

  const dashLen = pct * 2.827;

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-muted/30 border border-border">
      <span className="text-2xl mb-1">{icon}</span>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <svg viewBox="0 0 100 100" className="w-20 h-20 transform -rotate-90 mb-2">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dashLen} 282.7`}
          strokeLinecap="round"
        />
      </svg>
      <p className="text-lg font-bold" style={{ color }}>{actual}/{planned}</p>
      <p className="text-[11px] text-muted-foreground">
        {remaining > 0 ? `נותרו ${remaining} ימים` : '✓ הושלם'}
      </p>
    </div>
  );
}

export default function PortalDaysMetrics({ project }) {
  const hasAny = project.shopping_days_planned || project.supervision_days_planned || project.installation_days_planned;
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          מעקב ימים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <DayRing
            label="ימי קניות"
            icon="🛒"
            planned={project.shopping_days_planned}
            actual={project.shopping_days_actual || 0}
          />
          <DayRing
            label="ימי פיקוח"
            icon="👁️"
            planned={project.supervision_days_planned}
            actual={project.supervision_days_actual || 0}
          />
          <DayRing
            label="ימי התקנות"
            icon="🔨"
            planned={project.installation_days_planned}
            actual={project.installation_days_actual || 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}