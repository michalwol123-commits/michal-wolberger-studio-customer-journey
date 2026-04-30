import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BudgetHealthCard({ projects }) {
  const activeProjectIds = projects.filter(p => p.status === 'active').map(p => p.id);

  const { data: budgetItems = [] } = useQuery({
    queryKey: ['budgetItems-dashboard'],
    queryFn: () => base44.entities.BudgetItem.list('-created_date', 500),
    enabled: activeProjectIds.length > 0,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones-dashboard'],
    queryFn: () => base44.entities.ProjectMilestone.list('-created_date', 500),
    enabled: activeProjectIds.length > 0,
  });

  // Budget overruns per project
  const projectBudgets = {};
  budgetItems
    .filter(b => activeProjectIds.includes(b.project_id))
    .forEach(b => {
      if (!projectBudgets[b.project_id]) projectBudgets[b.project_id] = { planned: 0, actual: 0 };
      projectBudgets[b.project_id].planned += b.planned_amount || 0;
      projectBudgets[b.project_id].actual += b.actual_amount || 0;
    });

  const overrunProjects = Object.entries(projectBudgets)
    .filter(([, v]) => v.planned > 0 && v.actual > v.planned * 1.1)
    .map(([id, v]) => {
      const project = projects.find(p => p.id === id);
      const overrunPct = Math.round(((v.actual - v.planned) / v.planned) * 100);
      return { id, name: project?.name || 'פרויקט', overrunPct, diff: v.actual - v.planned };
    });

  // Delayed milestones
  const now = new Date();
  const delayedMilestones = milestones
    .filter(m => activeProjectIds.includes(m.project_id) && m.status !== 'completed' && m.end_date && new Date(m.end_date) < now)
    .map(m => {
      const project = projects.find(p => p.id === m.project_id);
      return { id: m.id, title: m.title, projectName: project?.name || 'פרויקט', projectId: m.project_id };
    });

  const alerts = [
    ...overrunProjects.map(p => ({
      id: `budget-${p.id}`,
      icon: Wallet,
      color: 'text-red-600 bg-red-50',
      text: `חריגת תקציב ${p.overrunPct}% בפרויקט ${p.name} (₪${p.diff.toLocaleString()})`,
      link: `/projects/${p.id}`,
    })),
    ...delayedMilestones.map(m => ({
      id: `delay-${m.id}`,
      icon: Clock,
      color: 'text-orange-600 bg-orange-50',
      text: `עיכוב: "${m.title}" בפרויקט ${m.projectName}`,
      link: `/projects/${m.projectId}`,
    })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          בריאות תקציב ולו״ז
          {alerts.length > 0 && (
            <span className="mr-auto text-xs font-normal bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{alerts.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">✅ אין חריגות תקציב או עיכובים</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {alerts.slice(0, 8).map(alert => (
              <Link key={alert.id} to={alert.link} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-1.5 rounded-lg ${alert.color}`}>
                  <alert.icon className="w-4 h-4" />
                </div>
                <p className="text-sm flex-1">{alert.text}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}