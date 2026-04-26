import React, { useState } from 'react';
import { usePortal } from '@/lib/PortalContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Calendar, Clock, MapPin, CreditCard, Download } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PortalTimeline from './PortalTimeline';
import PortalStageView from './PortalStageView';
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

  const visiblePayments = payments;
  const upcomingMeetings = meetings
    .filter(m => m.project_id === project.id && m.status === 'scheduled' && new Date(m.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const typeLabels = {
    intro: 'היכרות', qualifying: 'אפיון', stage_review: 'סקירת שלב',
    site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
  };

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
          <PortalStageView project={project} stageNum={selectedStage} />

          {/* Upcoming meetings */}
          {upcomingMeetings.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    פגישות קרובות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingMeetings.map(m => (
                      <div key={m.id} className="p-3 rounded-lg border border-border">
                        <p className="text-sm font-medium">{typeLabels[m.type] || m.type}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm')} • {m.duration} דק׳
                          </span>
                          {m.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{m.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Payments */}
          {visiblePayments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    תשלומים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-right px-3 py-2 font-medium">אבן דרך</th>
                          <th className="text-right px-3 py-2 font-medium">סכום</th>
                          <th className="text-right px-3 py-2 font-medium">תאריך יעד</th>
                          <th className="text-right px-3 py-2 font-medium">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePayments.map(pay => (
                          <tr key={pay.id} className="border-b last:border-0">
                            <td className="px-3 py-2.5">{pay.milestone}</td>
                            <td className="px-3 py-2.5 font-medium">₪{pay.amount?.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="px-3 py-2.5"><StatusBadge status={pay.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}