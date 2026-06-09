import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ExportCSVButton from '@/components/shared/ExportCSVButton';
import AddProjectDialog from '@/components/projects/AddProjectDialog';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import ViewToggle from '@/components/shared/ViewToggle';
import ProjectsTable from '@/components/projects/ProjectsTable';
import { toast } from 'sonner';

import STAGES_CONFIG from '@/lib/stageConfig';
const stageConfig = STAGES_CONFIG.map(s => ({ num: s.num, name: s.shortLabel }));

export default function Projects() {
  const { user, isAdmin } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

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
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => {
      if (!search) return true;
      const client = clientMap[p.client_id];
      return p.name?.includes(search) || client?.name?.includes(search);
    });

  const stageGroups = {};
  stageConfig.forEach(s => { stageGroups[s.num] = []; });
  filtered.forEach(p => {
    const stage = p.stage_current || 1;
    if (stageGroups[stage]) stageGroups[stage].push(p);
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Project.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedIds([]);
      toast.success('הפרויקטים נמחקו');
    },
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(p => p.id));

  const totalCount = filtered.length;

  return (
    <div>
      <PageHeader title="פרויקטים" subtitle={`${totalCount} פרויקטים`}>
        <Button data-tutorial="add-project-btn" onClick={() => setShowAddDialog(true)} className="gap-1">
          <Plus className="w-4 h-4" />פרויקט חדש
        </Button>
        <ExportCSVButton
          data={filtered}
          columns={[
            { key: 'name', label: 'שם פרויקט' },
            { label: 'לקוח', format: r => clientMap[r.client_id]?.name || '' },
            { key: 'status', label: 'סטטוס' },
            { key: 'stage_current', label: 'שלב' },
            { key: 'progress', label: 'התקדמות %' },
            { label: 'תקציב', format: r => r.total_budget || '' },
          ]}
          filename="פרויקטים"
        />
        <ViewToggle view={view} onViewChange={setView} />
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

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם פרויקט או לקוח..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
      </div>

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={() => bulkDeleteMutation.mutate(selectedIds)} entityLabel="פרויקטים" />}

      {totalCount === 0 ? (
        <EmptyState icon={Briefcase} title="אין פרויקטים" />
      ) : view === 'table' ? (
        <ProjectsTable
          projects={filtered}
          clientMap={clientMap}
          onDelete={(id) => deleteMutation.mutate(id)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" dir="rtl">
          {stageConfig.map(stage => (
            <div key={stage.num} className="min-w-[220px] max-w-[260px] flex-shrink-0">
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
              <div className="bg-muted/30 border border-border border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px]">
                {stageGroups[stage.num].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">—</p>
                ) : (
                  stageGroups[stage.num].map(project => {
                    const client = clientMap[project.client_id];
                    return (
                      <div key={project.id} className="bg-card rounded-lg border border-border p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <Link to={`/projects/${project.id}`} className="text-sm font-medium font-heading leading-tight text-primary hover:underline flex-1">
                            {project.name}
                          </Link>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={project.status} />
                            {isAdmin && <DeleteButton onDelete={() => deleteMutation.mutate(project.id)} entityLabel="פרויקט" />}
                          </div>
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
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddProjectDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}