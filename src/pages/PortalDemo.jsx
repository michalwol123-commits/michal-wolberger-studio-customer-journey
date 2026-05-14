import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Eye, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import AddDesignItemDialog from '@/components/design/AddDesignItemDialog';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalTimeline from '@/components/portal/PortalTimeline';
import PortalStageView from '@/components/portal/PortalStageView';
import PortalGanttView from '@/components/portal/PortalGanttView';
import PortalBudgetView from '@/components/portal/PortalBudgetView';
import PortalDocApproval from '@/components/portal/PortalDocApproval';

export default function PortalDemo() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);
  const [showDesignForm, setShowDesignForm] = useState(false);

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'on_hold');
  const project = activeProjects.find(p => p.id === selectedProjectId) || activeProjects[0];
  const client = project ? clients.find(c => c.id === project.client_id) : null;

  const { data: payments = [] } = useQuery({
    queryKey: ['portal-demo-payments', project?.id],
    queryFn: () => base44.entities.Payment.filter({ project_id: project.id }),
    enabled: !!project,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['portal-demo-meetings', client?.id],
    queryFn: () => base44.entities.Meeting.filter({ client_id: client.id }),
    enabled: !!client,
  });

  const { data: allDocs = [] } = useQuery({
    queryKey: ['portal-demo-docs', project?.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
    enabled: !!project,
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['portal-demo-q', client?.id],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: client.id }),
    enabled: !!client,
  });

  if (loadingProjects) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">טוען...</div>;
  }

  if (activeProjects.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <h2 className="font-heading text-xl font-bold mb-2">אין פרויקטים פעילים</h2>
        <p className="text-muted-foreground text-sm mb-4">כדי לראות דוגמת פורטל, צריך לפחות פרויקט אחד פעיל</p>
        <Link to="/projects"><Button>לפרויקטים</Button></Link>
      </div>
    );
  }

  const projectMeetings = meetings.filter(m => !m.project_id || m.project_id === project?.id);
  const currentStage = selectedStage || project?.stage_current || 1;

  return (
    <div>
      {/* Admin bar */}
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">תצוגת דוגמת פורטל</span>
            <span className="text-xs text-muted-foreground">(כך הלקוח רואה את הפורטל)</span>
          </div>
          <div className="flex items-center gap-3">
            {project && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowDesignForm(true)}>
                <Plus className="w-3.5 h-3.5 ml-1" />מפת פרויקט
              </Button>
            )}
            <span className="text-xs text-muted-foreground">פרויקט:</span>
            <Select value={project?.id || ''} onValueChange={v => { setSelectedProjectId(v); setSelectedStage(null); }}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map(p => {
                  const c = clients.find(cl => cl.id === p.client_id);
                  return <SelectItem key={p.id} value={p.id}>{p.name} {c ? `(${c.name})` : ''}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Portal content */}
      {project && (
        <div className="bg-background rounded-2xl border-2 border-dashed border-primary/20 p-4 lg:p-6">
          <div className="space-y-6">
            {/* Project Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-heading font-bold text-2xl mb-1">{project.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {client && `שלום ${client.name} 👋`}
                    {project.start_date && ` • התחלה: ${format(new Date(project.start_date), 'dd/MM/yyyy')}`}
                  </p>
                  <Progress value={project.progress || 0} className="h-3 mb-2" />
                  <p className="text-sm text-muted-foreground">{project.progress || 0}% הושלם</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline + Stage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4">
                <Card className="sticky top-24">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-heading">מהלך הפרויקט</CardTitle>
                    <p className="text-xs text-muted-foreground">לחצי על שלב לצפייה בתכנון</p>
                  </CardHeader>
                  <CardContent>
                    <PortalTimeline project={project} selectedStage={currentStage} onSelectStage={setSelectedStage} />
                  </CardContent>
                </Card>
              </motion.div>

              <div className="lg:col-span-8 space-y-6">
                <PortalDocApproval documents={allDocs} projectId={project.id} />

                <PortalStageView
                  project={project}
                  stageNum={currentStage}
                  meetings={projectMeetings}
                  payments={payments}
                  questionnaires={questionnaires}
                />

                {currentStage >= 6 && <PortalGanttView project={project} />}
                {currentStage >= 6 && <PortalBudgetView project={project} />}
              </div>
            </div>
          </div>
        </div>
      )}
      {project && (
        <AddDesignItemDialog
          open={showDesignForm}
          onOpenChange={setShowDesignForm}
          projectId={project.id}
          defaultStage={currentStage}
          onSave={() => {}}
        />
      )}
    </div>
  );
}