import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/lib/useCurrentUser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

const stageNames = {
  1: 'שאלון', 2: 'תכנית', 3: 'תכניות עבודה', 4: 'קונספט',
  5: 'קניות', 6: 'תמחור קבלנים', 7: 'ביצוע', 8: 'התקנה', 9: 'מסירה'
};

export default function Projects() {
  const { user, isAdmin } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  const filtered = projects
    .filter(p => isAdmin || p.owner === user?.email)
    .filter(p => statusFilter === 'all' || p.status === statusFilter);

  return (
    <div>
      <PageHeader title="פרויקטים" subtitle={`${filtered.length} פרויקטים`}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="active">פעילים</SelectItem>
            <SelectItem value="on_hold">מוקפאים</SelectItem>
            <SelectItem value="completed">הושלמו</SelectItem>
            <SelectItem value="cancelled">בוטלו</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(project => {
          const client = clientMap[project.client_id];
          return (
            <Link key={project.id} to={`/projects/${project.id}`} className="block">
              <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium font-heading">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{client?.name || 'לקוח לא ידוע'}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>שלב {project.stage_current}/9 — {stageNames[project.stage_current] || ''}</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>
                {project.total_budget && (
                  <p className="text-sm text-muted-foreground">תקציב: ₪{project.total_budget.toLocaleString()}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon={Briefcase} title="אין פרויקטים" />}
    </div>
  );
}