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

import STAGES_CONFIG from '@/lib/stageConfig';
const stageConfig = STAGES_CONFIG.map(s => ({ num: s.num, name: s.shortLabel }));

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

  // Group by stage_current
  const stageGroups = {};
  stageConfig.forEach(s => { stageGroups[s.num] = []; });
  filtered.forEach(p => {
    const stage = p.stage_current || 1;
    if (stageGroups[stage]) {
      stageGroups[stage].push(p);
    }
  });

  const totalCount = filtered.length;

  return (
    <div>
      <PageHeader title="פרויקטים" subtitle={`${totalCount} פרויקטים`}>
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

      {totalCount === 0 ? (
        <EmptyState icon={Briefcase} title="אין פרויקטים" />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" dir="rtl">
          {stageConfig.map(stage => (
            <div key={stage.num} className="min-w-[220px] max-w-[260px] flex-shrink-0">
              {/* Column header */}
              <div className="flex items-center justify-between bg-muted/60 rounded-t-xl px-3 py-2.5 border border-border border-b-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                    {stage.num}
                  </span>
                  <span className="text-sm font-heading font-semibold">{stage.name}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                  {stageGroups[stage.num].length}
                </span>
              </div>

              {/* Column body */}
              <div className="bg-muted/30 border border-border border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px]">
                {stageGroups[stage.num].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">—</p>
                ) : (
                  stageGroups[stage.num].map(project => {
                    const client = clientMap[project.client_id];
                    return (
                      <Link key={project.id} to={`/projects/${project.id}`} className="block">
                        <div className="bg-card rounded-lg border border-border p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="text-sm font-medium font-heading leading-tight">{project.name}</p>
                            <StatusBadge status={project.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{client?.name || 'לקוח לא ידוע'}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>התקדמות</span>
                            <span>{project.progress || 0}%</span>
                          </div>
                          <Progress value={project.progress || 0} className="h-1.5" />
                          {project.total_budget && (
                            <p className="text-xs text-muted-foreground mt-2">₪{project.total_budget.toLocaleString()}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}