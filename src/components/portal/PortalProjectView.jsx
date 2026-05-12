import React, { useState } from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import PortalTimeline from './PortalTimeline';
import PortalStageView from './PortalStageView';
import PortalGanttView from './PortalGanttView';
import PortalBudgetView from './PortalBudgetView';
import PortalDocApproval from './PortalDocApproval';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function PortalProjectView({ project, onBack }) {
  const { client } = usePortal();
  const [selectedStage, setSelectedStage] = useState(project.stage_current || 1);

  const { data: payments = [] } = useQuery({
    queryKey: ['portal-payments', project.id],
    queryFn: () => base44.entities.Payment.filter({ project_id: project.id }),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['portal-meetings', client.id],
    queryFn: () => base44.entities.Meeting.filter({ client_id: client.id }),
  });

  const { data: allDocs = [] } = useQuery({
    queryKey: ['portal-approval-docs', project.id],
    queryFn: () => base44.entities.Document.filter({ project_id: project.id }),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['portal-questionnaires', client.id],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: client.id }),
  });

  // Filter meetings to this project
  const projectMeetings = meetings.filter(m => !m.project_id || m.project_id === project.id);

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowRight className="w-4 h-4" />
          חזרה לרשימת הפרויקטים
        </Button>
      )}

      {/* Project Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-2xl mb-1">{project.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {project.start_date && `התחלה: ${format(new Date(project.start_date), 'dd/MM/yyyy')}`}
              {project.end_date_est && ` • סיום משוער: ${format(new Date(project.end_date_est), 'dd/MM/yyyy')}`}
            </p>
            <Progress value={project.progress || 0} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">{project.progress || 0}% הושלם</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main layout: Timeline sidebar + Stage content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline sidebar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="lg:col-span-4"
        >
          <Card className="sticky top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">מהלך הפרויקט</CardTitle>
              <p className="text-xs text-muted-foreground">לחצי על שלב לצפייה</p>
            </CardHeader>
            <CardContent>
              <PortalTimeline 
                project={project} 
                selectedStage={selectedStage} 
                onSelectStage={setSelectedStage} 
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Document approvals */}
          <PortalDocApproval documents={allDocs} projectId={project.id} />

          <PortalStageView 
            project={project} 
            stageNum={selectedStage} 
            meetings={projectMeetings}
            payments={payments}
            questionnaires={questionnaires}
          />

          {/* Gantt timeline (visible from stage 6+) */}
          {selectedStage >= 6 && <PortalGanttView project={project} />}

          {/* Budget utilization (visible from stage 6+) */}
          {selectedStage >= 6 && <PortalBudgetView project={project} />}
        </div>
      </div>
    </div>
  );
}