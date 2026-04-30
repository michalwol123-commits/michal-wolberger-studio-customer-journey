import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Briefcase, CheckSquare, CalendarDays, AlertTriangle } from 'lucide-react';

function GaugeItem({ label, value, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm flex-1">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default function WorkloadGauge({ projects, tasks, meetings }) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const onHoldProjects = projects.filter(p => p.status === 'on_hold').length;
  const urgentTasks = tasks.filter(t => (t.status === 'open' || t.status === 'in_progress') && t.priority === 'urgent').length;
  const overdueTasks = tasks.filter(t => (t.status === 'open' || t.status === 'in_progress') && t.due_date && new Date(t.due_date) < now).length;
  const weekMeetings = meetings.filter(m => m.status === 'scheduled' && m.scheduled_at && new Date(m.scheduled_at) >= now && new Date(m.scheduled_at) <= weekFromNow).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          עומס עבודה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <GaugeItem label="פרויקטים פעילים" value={activeProjects} icon={Briefcase} color="text-emerald-600 bg-emerald-50" />
        <GaugeItem label="פרויקטים מוקפאים" value={onHoldProjects} icon={Briefcase} color="text-amber-600 bg-amber-50" />
        <GaugeItem label="משימות דחופות" value={urgentTasks} icon={AlertTriangle} color="text-red-600 bg-red-50" />
        <GaugeItem label="משימות באיחור" value={overdueTasks} icon={CheckSquare} color="text-orange-600 bg-orange-50" />
        <GaugeItem label="פגישות השבוע" value={weekMeetings} icon={CalendarDays} color="text-blue-600 bg-blue-50" />
      </CardContent>
    </Card>
  );
}